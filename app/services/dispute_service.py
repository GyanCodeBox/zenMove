"""
app/services/dispute_service.py
────────────────────────────────
Dispute lifecycle: open → vendor response → ops resolution → escrow instruction.
"""

from datetime import datetime, timezone
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import ConflictError, ForbiddenError, NotFoundError, ValidationError
from app.models.dispute import Dispute, DisputeStatus, DisputeType
from app.models.escrow import EscrowMilestone, EscrowOrder, MilestoneKey, MilestoneStatus
from app.models.move import Move, MoveStatus
from app.schemas.dispute import (
    DisputeCreateRequest, DisputeResolveRequest,
    DisputeResponse, DisputeVendorResponse,
)


class DisputeService:

    def __init__(self, db: AsyncSession):
        self.db = db

    # ── Open dispute ───────────────────────────────────────────────────

    async def open_dispute(
        self, move_id: UUID, raised_by: UUID, payload: DisputeCreateRequest
    ) -> DisputeResponse:
        """
        Customer raises a dispute within 24h of delivery.
        Automatically places a hold on M4 escrow milestone.
        """
        move = await self.db.get(Move, move_id)
        if not move:
            raise NotFoundError(f"Move {move_id} not found.")

        if move.status not in (MoveStatus.delivered, MoveStatus.in_transit):
            raise ValidationError(
                "Disputes can only be raised after delivery. "
                f"Current move status: {move.status}."
            )

        # Check for duplicate dispute on same item
        if payload.item_id:
            existing = await self.db.scalar(
                select(Dispute).where(
                    Dispute.move_id == move_id,
                    Dispute.item_id == payload.item_id,
                    Dispute.status.not_in([DisputeStatus.withdrawn, DisputeStatus.resolved_vendor]),
                )
            )
            if existing:
                raise ConflictError("An active dispute already exists for this item.")

        dispute = Dispute(
            move_id=move_id,
            item_id=payload.item_id,
            raised_by=raised_by,
            dispute_type=payload.dispute_type,
            description=payload.description,
            status=DisputeStatus.vendor_review,
        )
        self.db.add(dispute)

        # Place M4 on hold
        await self._hold_m4(move_id, f"Dispute raised: {payload.dispute_type.value}")

        # Mark move as disputed
        move.status = MoveStatus.disputed
        await self.db.flush()
        await self.db.refresh(dispute)
        return self._to_response(dispute)

    # ── Vendor responds ────────────────────────────────────────────────

    async def vendor_respond(
        self, dispute_id: UUID, payload: DisputeVendorResponse
    ) -> DisputeResponse:
        dispute = await self._fetch_dispute(dispute_id)

        if dispute.status != DisputeStatus.vendor_review:
            raise ValidationError(
                f"Vendor response is only valid when dispute is in 'vendor_review' status. "
                f"Current: {dispute.status}."
            )

        dispute.vendor_response = payload.vendor_response
        dispute.vendor_responded_at = datetime.now(timezone.utc)
        dispute.status = DisputeStatus.human_review   # escalate to ops

        await self.db.flush()
        await self.db.refresh(dispute)
        return self._to_response(dispute)

    # ── Ops resolves ───────────────────────────────────────────────────

    async def resolve_dispute(
        self, dispute_id: UUID, resolved_by: UUID, payload: DisputeResolveRequest
    ) -> DisputeResponse:
        """
        Ops team delivers verdict.
        Releases or refunds the held M4 escrow accordingly.
        """
        dispute = await self._fetch_dispute(dispute_id)

        if dispute.status not in (
            DisputeStatus.human_review,
            DisputeStatus.ai_review,
            DisputeStatus.vendor_review,
        ):
            raise ValidationError(f"Cannot resolve dispute in status: {dispute.status}.")

        dispute.status = payload.status
        dispute.resolution_note = payload.resolution_note
        dispute.resolved_by = resolved_by
        dispute.resolved_at = datetime.now(timezone.utc)

        if payload.refund_amount:
            dispute.refund_amount = payload.refund_amount

        # Release or refund M4 based on verdict
        if payload.status == DisputeStatus.resolved_vendor:
            # Vendor wins — release M4 to vendor
            from app.services.escrow_service import EscrowService
            escrow_svc = EscrowService(self.db)
            await escrow_svc.release_m4(dispute.move_id)

        elif payload.status == DisputeStatus.resolved_customer:
            # Customer wins — refund full M4 to customer
            await self._refund_m4(dispute.move_id, "Dispute resolved in customer favour")

        elif payload.status == DisputeStatus.partial_settlement:
            # Partial: release (M4 - refund) to vendor, refund rest to customer
            if payload.refund_amount:
                await self._partial_m4(dispute.move_id, payload.refund_amount)

        await self.db.flush()
        await self.db.refresh(dispute)
        return self._to_response(dispute)

    # ── List disputes ──────────────────────────────────────────────────

    async def list_disputes(self, move_id: UUID) -> list[DisputeResponse]:
        result = await self.db.execute(
            select(Dispute)
            .where(Dispute.move_id == move_id)
            .order_by(Dispute.opened_at.desc())
        )
        return [self._to_response(d) for d in result.scalars().all()]

    # ── Private helpers ────────────────────────────────────────────────

    async def _hold_m4(self, move_id: UUID, reason: str) -> None:
        m4 = await self.db.scalar(
            select(EscrowMilestone).where(
                EscrowMilestone.move_id == move_id,
                EscrowMilestone.milestone == MilestoneKey.M4_closeout,
            )
        )
        if m4 and m4.status == MilestoneStatus.pending:
            m4.status = MilestoneStatus.held
            m4.trigger_event = reason

    async def _refund_m4(self, move_id: UUID, reason: str) -> None:
        m4 = await self.db.scalar(
            select(EscrowMilestone).where(
                EscrowMilestone.move_id == move_id,
                EscrowMilestone.milestone == MilestoneKey.M4_closeout,
            )
        )
        if m4:
            m4.status = MilestoneStatus.refunded
            m4.trigger_event = reason
            m4.released_at = datetime.now(timezone.utc)
            # Decrement vault
            order = await self.db.get(EscrowOrder, m4.order_id)
            if order:
                order.vault_balance = round(float(order.vault_balance) - float(m4.amount), 2)

    async def _partial_m4(self, move_id: UUID, refund_amt: float) -> None:
        m4 = await self.db.scalar(
            select(EscrowMilestone).where(
                EscrowMilestone.move_id == move_id,
                EscrowMilestone.milestone == MilestoneKey.M4_closeout,
            )
        )
        if m4:
            m4.status = MilestoneStatus.released  # vendor gets remainder
            m4.trigger_event = f"Partial settlement: ₹{refund_amt} refunded to customer"
            m4.released_at = datetime.now(timezone.utc)
            order = await self.db.get(EscrowOrder, m4.order_id)
            if order:
                order.vault_balance = round(float(order.vault_balance) - float(m4.amount), 2)

    async def _fetch_dispute(self, dispute_id: UUID) -> Dispute:
        dispute = await self.db.get(Dispute, dispute_id)
        if not dispute:
            raise NotFoundError(f"Dispute {dispute_id} not found.")
        return dispute

    def _to_response(self, d: Dispute) -> DisputeResponse:
        return DisputeResponse(
            id=d.id,
            move_id=d.move_id,
            item_id=d.item_id,
            raised_by=d.raised_by,
            dispute_type=d.dispute_type,
            status=d.status,
            description=d.description,
            vendor_response=d.vendor_response,
            resolution_note=d.resolution_note,
            refund_amount=float(d.refund_amount) if d.refund_amount else None,
            escrow_hold_amount=float(d.escrow_hold_amount) if d.escrow_hold_amount else None,
            opened_at=d.opened_at,
            resolved_at=d.resolved_at,
        )
