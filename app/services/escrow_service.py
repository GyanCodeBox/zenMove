"""
app/services/escrow_service.py
───────────────────────────────
Mock escrow vault with full milestone release logic.

In production, replace _release_to_vendor() and _create_razorpay_order()
with real Razorpay Route API calls. Everything else stays identical.

Milestone schedule:
  M1 (10%) → on escrow init (booking confirmed)
  M2 (30%) → on manifest finalised + E-Way Bill generated
  M3 (60%) → on OTP-verified delivery
  M4 (rem) → 48h after delivery if no dispute, OR dispute resolved
"""

from datetime import datetime, timezone
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.exceptions import ConflictError, NotFoundError, ValidationError
from app.models.escrow import (
    EscrowMilestone, EscrowOrder,
    MilestoneKey, MilestoneStatus, MILESTONE_PCT,
    WalletDrawRequest as WalletDrawModel,
)
from app.models.move import Move, MoveStatus
from app.schemas.escrow import (
    EscrowInitRequest, EscrowStatusResponse,
    MilestoneResponse, WalletDrawRequest, WalletDrawResponse,
)


class EscrowService:

    def __init__(self, db: AsyncSession):
        self.db = db

    # ── Init escrow (M1 release) ───────────────────────────────────────

    async def init_escrow(self, move_id: UUID, payload: EscrowInitRequest) -> EscrowStatusResponse:
        """
        Customer confirms payment → funds enter escrow vault.
        M1 (10%) is released to vendor immediately as booking fee.
        """
        move = await self._fetch_move(move_id)

        if move.status not in (MoveStatus.quoted, MoveStatus.booked, MoveStatus.loading, MoveStatus.in_transit):
            raise ValidationError("Escrow can only be initialised for active moves (quoted, booked, loading, or in_transit).")

        # Check no existing escrow
        existing = await self.db.scalar(
            select(EscrowOrder).where(EscrowOrder.move_id == move_id)
        )
        if existing:
            raise ConflictError("Escrow has already been initialised for this move.")

        total = float(move.quote_amount)

        # Create mock escrow order
        order = EscrowOrder(
            move_id=move_id,
            total_amount=total,
            vault_balance=total,
            payment_ref=payload.payment_ref or f"MOCK-PAY-{str(move_id)[:8].upper()}",
            razorpay_order_id=None,   # set when real Razorpay is wired
        )
        self.db.add(order)
        await self.db.flush()

        # Create all 4 milestone rows
        milestones = await self._create_milestones(order, total)

        # Release M1 immediately
        m1 = next(m for m in milestones if m.milestone == MilestoneKey.M1_booking)
        await self._release_milestone(m1, order, "Booking confirmed — escrow initialised")

        # Advance move to booked
        if move.status == MoveStatus.quoted:
            move.status = MoveStatus.booked

        await self.db.flush()
        return await self._build_status(order, milestones)

    # ── Trigger M2 (manifest + e-way bill) ────────────────────────────

    async def release_m2(self, move_id: UUID) -> EscrowStatusResponse:
        """
        Called automatically when:
          - All items are QR-bound with photos
          - E-Way Bill has been generated for the move
        """
        order, milestones = await self._fetch_order_and_milestones(move_id)
        move = await self._fetch_move(move_id)

        if move.status not in (MoveStatus.loading, MoveStatus.in_transit):
            raise ValidationError("M2 release requires move to be in loading or in_transit status.")

        m2 = next(m for m in milestones if m.milestone == MilestoneKey.M2_loading)
        if m2.status == MilestoneStatus.released:
            raise ConflictError("M2 has already been released.")

        # Guard: E-Way Bill must exist
        from app.models.eway_bill import EWayBill
        ewb = await self.db.scalar(
            select(EWayBill).where(EWayBill.move_id == move_id)
        )
        if not ewb or not ewb.is_active:
            raise ValidationError(
                "M2 cannot be released — E-Way Bill has not been generated for this move. "
                "Generate an E-Way Bill first via POST /moves/{id}/eway-bill/generate."
            )

        await self._release_milestone(m2, order, "Manifest finalised + E-Way Bill confirmed")
        await self.db.flush()
        return await self._build_status(order, milestones)

    # ── Trigger M3 (OTP delivery) ─────────────────────────────────────

    async def release_m3(self, move_id: UUID) -> tuple[EscrowStatusResponse, float]:
        """
        Called after OTP verification.
        Returns (status_response, amount_released).
        """
        order, milestones = await self._fetch_order_and_milestones(move_id)

        m3 = next(m for m in milestones if m.milestone == MilestoneKey.M3_delivery)
        if m3.status == MilestoneStatus.released:
            raise ConflictError("M3 has already been released.")

        amount = float(m3.amount)
        await self._release_milestone(m3, order, "OTP-verified delivery confirmed")
        await self.db.flush()

        status = await self._build_status(order, milestones)
        return status, amount

    # ── Trigger M4 (dispute window closed) ────────────────────────────

    async def release_m4(self, move_id: UUID) -> EscrowStatusResponse:
        """
        Called when 48h dispute window expires with no active disputes,
        or when all disputes are resolved.
        """
        order, milestones = await self._fetch_order_and_milestones(move_id)

        m4 = next(m for m in milestones if m.milestone == MilestoneKey.M4_closeout)
        if m4.status == MilestoneStatus.released:
            raise ConflictError("M4 has already been released.")

        await self._release_milestone(m4, order, "Dispute window expired — final balance released")

        # Mark move as completed
        move = await self._fetch_move(move_id)
        move.status = MoveStatus.completed

        await self.db.flush()
        return await self._build_status(order, milestones)

    # ── Get status ─────────────────────────────────────────────────────

    async def get_status(self, move_id: UUID) -> EscrowStatusResponse:
        order, milestones = await self._fetch_order_and_milestones(move_id)
        return await self._build_status(order, milestones)

    # ── Wallet draw request ────────────────────────────────────────────

    async def create_wallet_draw(
        self, move_id: UUID, vendor_id: UUID, payload: WalletDrawRequest
    ) -> WalletDrawResponse:
        """
        Vendor requests an in-transit cash draw (tolls, fuel).
        Flagged if > 15% of quote — requires customer approval.
        """
        move = await self._fetch_move(move_id)
        order = await self.db.scalar(
            select(EscrowOrder).where(EscrowOrder.move_id == move_id)
        )
        if not order:
            raise ValidationError("No escrow order found for this move.")

        # Anomaly check: flag if > 15% of total
        threshold = float(order.total_amount) * 0.15
        if payload.amount > threshold:
            raise ValidationError(
                f"Draw request of ₹{payload.amount} exceeds the 15% anomaly threshold "
                f"(₹{threshold:.0f}). Please contact ZenMove ops for approval."
            )

        draw = WalletDrawModel(
            move_id=move_id,
            vendor_id=vendor_id,
            amount=payload.amount,
            reason=payload.reason,
            notes=payload.notes,
        )
        self.db.add(draw)
        await self.db.flush()
        await self.db.refresh(draw)

        return WalletDrawResponse(
            id=draw.id,
            move_id=draw.move_id,
            amount=float(draw.amount),
            reason=draw.reason,
            status=draw.status,
            created_at=draw.created_at,
        )

    # ── Private helpers ────────────────────────────────────────────────

    async def _create_milestones(
        self, order: EscrowOrder, total: float
    ) -> list[EscrowMilestone]:
        """Create all 4 milestone rows. M4 amount = remainder after M1+M2+M3."""
        pcts = {
            MilestoneKey.M1_booking:  10.0,
            MilestoneKey.M2_loading:  30.0,
            MilestoneKey.M3_delivery: 50.0,
        }
        milestones = []
        allocated = 0.0
        for key, pct in pcts.items():
            amt = round(total * pct / 100, 2)
            allocated += amt
            m = EscrowMilestone(
                order_id=order.id,
                move_id=order.move_id,
                milestone=key,
                pct_of_total=pct,
                amount=amt,
            )
            self.db.add(m)
            milestones.append(m)

        # M4 = remainder (avoids rounding gaps)
        m4_amt = round(total - allocated, 2)
        m4_pct = round(m4_amt / total * 100, 2)
        m4 = EscrowMilestone(
            order_id=order.id,
            move_id=order.move_id,
            milestone=MilestoneKey.M4_closeout,
            pct_of_total=m4_pct,
            amount=m4_amt,
        )
        self.db.add(m4)
        milestones.append(m4)
        await self.db.flush()
        return milestones

    async def _release_milestone(
        self,
        milestone: EscrowMilestone,
        order: EscrowOrder,
        trigger: str,
    ) -> None:
        """
        Mock release: update milestone status, decrement vault balance.
        In production: call Razorpay Route API here.
        """
        milestone.status = MilestoneStatus.released
        milestone.trigger_event = trigger
        milestone.released_at = datetime.now(timezone.utc)
        milestone.payment_ref = f"MOCK-TXN-{str(milestone.id)[:8].upper()}"
        order.vault_balance = round(float(order.vault_balance) - float(milestone.amount), 2)

    async def _fetch_move(self, move_id: UUID) -> Move:
        move = await self.db.get(Move, move_id)
        if not move:
            raise NotFoundError(f"Move {move_id} not found.")
        return move

    async def _fetch_order_and_milestones(
        self, move_id: UUID
    ) -> tuple[EscrowOrder, list[EscrowMilestone]]:
        order = await self.db.scalar(
            select(EscrowOrder)
            .options(selectinload(EscrowOrder.milestones))
            .where(EscrowOrder.move_id == move_id)
        )
        if not order:
            raise NotFoundError(
                "No escrow order found for this move. "
                "Initialise escrow first via POST /moves/{id}/escrow/init."
            )
        return order, order.milestones

    async def _build_status(
        self, order: EscrowOrder, milestones: list[EscrowMilestone]
    ) -> EscrowStatusResponse:
        return EscrowStatusResponse(
            move_id=order.move_id,
            total_amount=float(order.total_amount),
            vault_balance=float(order.vault_balance),
            released_amount=order.released_amount,
            platform_fee=order.platform_fee,
            vendor_total=order.vendor_total,
            milestones=[
                MilestoneResponse(
                    id=m.id,
                    milestone=m.milestone,
                    pct_of_total=float(m.pct_of_total),
                    amount=float(m.amount),
                    status=m.status,
                    trigger_event=m.trigger_event,
                    released_at=m.released_at,
                    payment_ref=m.payment_ref,
                )
                for m in sorted(milestones, key=lambda x: list(MilestoneKey).index(x.milestone))
            ],
        )
