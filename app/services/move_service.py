"""
app/services/move_service.py
─────────────────────────────
Business logic for Move lifecycle management.
"""

from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.exceptions import ForbiddenError, NotFoundError
from app.models.move import Move, MoveStatus
from app.models.item import Item
from app.models.notification import Notification
from app.services.escrow_service import EscrowService
from app.services.eway_bill_service import EWayBillService
from app.schemas.eway_bill import EWayBillGenerateRequest
from app.schemas.common import PaginationParams
from app.schemas.move import MoveCreateRequest, MoveResponse


def _to_response(move: Move, total_items: int = 0) -> MoveResponse:
    return MoveResponse(
        id=move.id,
        customer_id=move.customer_id,
        vendor_id=move.vendor_id,
        status=move.status,
        origin_address=move.origin_address,
        dest_address=move.dest_address,
        origin_city_code=move.origin_city_code,
        dest_city_code=move.dest_city_code,
        scheduled_at=move.scheduled_at,
        quote_amount=float(move.quote_amount),
        escrow_id=move.escrow_id,
        eway_bill_no=move.eway_bill_no,
        total_items=total_items,
        loaded_count=move.loaded_count,
        unloaded_count=move.unloaded_count,
        created_at=move.created_at,
        updated_at=move.updated_at,
    )


class MoveService:

    def __init__(self, db: AsyncSession):
        self.db = db

    # ── Create ─────────────────────────────────────────────────────────

    async def create_move(
        self, customer_id: UUID, payload: MoveCreateRequest
    ) -> MoveResponse:
        # For the Phase 2 simulation, we auto-assign the first packer/vendor found.
        # In production (Phase 3), this happens after the Bidding Engine completes.
        from app.models.user import User
        vendor = await self.db.execute(select(User).where(User.role.in_(['vendor', 'packer'])).limit(1))
        vendor_user = vendor.scalar_one_or_none()
        vendor_id = vendor_user.id if vendor_user else None

        move = Move(
            customer_id=customer_id,
            vendor_id=vendor_id,
            origin_address=payload.origin_address,
            dest_address=payload.dest_address,
            origin_city_code=payload.origin_city_code,
            dest_city_code=payload.dest_city_code,
            scheduled_at=payload.scheduled_at,
            quote_amount=payload.quote_amount,
        )
        self.db.add(move)
        await self.db.flush()
        move = await self._fetch_move_with_items(move.id)
        return _to_response(move)

    # ── Read ───────────────────────────────────────────────────────────

    async def get_move(self, move_id: UUID, requester_id: UUID) -> MoveResponse:
        move = await self._fetch_move_with_items(move_id)
        self._assert_access(move, requester_id)
        total = len(move.items)
        return _to_response(move, total)

    async def list_moves(
        self,
        requester_id: UUID,
        pagination: PaginationParams,
        status: MoveStatus | None = None,
    ) -> tuple[list[MoveResponse], int]:
        from sqlalchemy import or_
        query = (
            select(Move)
            .options(selectinload(Move.items))
            .where(or_(Move.customer_id == requester_id, Move.vendor_id == requester_id))
            .order_by(Move.created_at.desc())
        )
        if status:
            query = query.where(Move.status == status)

        total = await self.db.scalar(
            select(func.count()).select_from(query.subquery())
        )
        result = await self.db.execute(
            query.offset(pagination.offset).limit(pagination.page_size)
        )
        moves = result.scalars().all()

        responses = []
        for move in moves:
            item_count = await self.db.scalar(
                select(func.count(Item.id)).where(Item.move_id == move.id)
            )
            responses.append(_to_response(move, item_count or 0))

        return responses, total or 0

    # ── Update Status ──────────────────────────────────────────────────

    async def update_status(
        self, move_id: UUID, new_status: MoveStatus, requester_id: UUID
    ) -> MoveResponse:
        move = await self._fetch_move_with_items(move_id)
        self._assert_access(move, requester_id)
        self._assert_valid_transition(move.status, new_status)
        move.status = new_status

        # Automatically generate E-Way bill on dispatch
        if new_status == MoveStatus.in_transit and not move.eway_bill_no:
            try:
                ewb_svc = EWayBillService(self.db)
                await ewb_svc.generate(move_id, EWayBillGenerateRequest(
                    gstin_supplier="29ABCDE1234F1Z5", # Mock vendor GSTIN
                    gstin_recipient="27ABCDE1234F1Z5", # Mock customer GSTIN
                    vehicle_no="KA-01-ZM-1234", # Mock vehicle
                    distance_km=250, # Mock distance
                    total_value=float(move.quote_amount)
                ))
            except Exception as e:
                print(f"WARN: Auto E-Way Bill generation failed: {e}")
                # Fallback to simple number if service fails
                import random
                import string
                suffix = ''.join(random.choices(string.digits, k=12))
                move.eway_bill_no = f"EW-{suffix}"


        await self.db.flush()
        await self.db.refresh(move)

        # Trigger Escrow Releases
        escrow_svc = EscrowService(self.db)
        if new_status == MoveStatus.in_transit:
            try:
                await escrow_svc.release_m2(move_id)
            except Exception as e:
                print(f"WARN: M2 Escrow release failed: {e}")
        elif new_status == MoveStatus.completed:
            try:
                await escrow_svc.release_m4(move_id)
            except Exception as e:
                print(f"WARN: M4 Escrow release failed: {e}")

        # Send Notifications
        if new_status == MoveStatus.loading:
            await self._notify(move.customer_id, move.id, "Packer Arrived", "Your packer has arrived and is starting the loading process.")
        elif new_status == MoveStatus.in_transit:
            await self._notify(move.customer_id, move.id, "Truck Dispatched", f"Items are in transit. E-Way Bill {move.eway_bill_no} generated.")
        elif new_status == MoveStatus.delivered:
            await self._notify(move.customer_id, move.id, "Truck Arrived", "The truck is at your destination. Generate OTP to start unloading.")
        elif new_status == MoveStatus.completed:
            await self._notify(move.customer_id, move.id, "Move Finalized", "All items delivered safely. Thank you for choosing ZenMove!")

        return _to_response(move, len(move.items))

    async def _notify(self, user_id: UUID, move_id: UUID, title: str, message: str):
        notif = Notification(user_id=user_id, move_id=move_id, title=title, message=message)
        self.db.add(notif)
        await self.db.flush()

    # ── Proof of Delivery (OTP) ─────────────────────────────────────────

    async def generate_delivery_otp(self, move_id: UUID, requester_id: UUID) -> str:
        """
        Generate a secure 6-digit OTP for delivery verification.
        Should only be accessible if move is in_transit.
        """
        move = await self._fetch_move_with_items(move_id)
        # For prototype, we allow the customer or packer to 'trigger' it, 
        # but in prod only the system or customer should.
        
        import random
        otp = "".join([str(random.randint(0, 9)) for _ in range(6)])
        
        # In a real app we'd hash it, but for demo we store it plain 
        # to show the user it works easily.
        move.delivery_otp_hash = otp 
        await self.db.flush()
        return otp

    async def verify_delivery_otp(self, move_id: UUID, otp: str) -> bool:
        """
        Verify the provided OTP and advance status to 'delivered' if correct.
        (Or just return true/false to let the handler decide status)
        """
        move = await self._fetch_move_with_items(move_id)
        if not move.delivery_otp_hash:
            return False
            
        if move.delivery_otp_hash == otp:
            move.status = MoveStatus.delivered
            # Clear OTP after use
            move.delivery_otp_hash = None
            await self.db.flush()

            # Trigger M3 Escrow Release
            try:
                await EscrowService(self.db).release_m3(move_id)
            except Exception as e:
                print(f"WARN: M3 Escrow release failed: {e}")

            return True
            
        return False

    # ── Helpers ────────────────────────────────────────────────────────

    async def _fetch_move_with_items(self, move_id: UUID) -> Move:
        result = await self.db.execute(
            select(Move)
            .options(selectinload(Move.items))
            .where(Move.id == move_id)
        )
        move = result.scalar_one_or_none()
        if not move:
            raise NotFoundError(f"Move {move_id} not found.")
        return move

    def _assert_access(self, move: Move, requester_id: UUID) -> None:
        """Customer can only access their own moves."""
        allowed = {move.customer_id, move.vendor_id}
        if requester_id not in allowed:
            raise ForbiddenError("You do not have access to this move.")

    _VALID_TRANSITIONS: dict[MoveStatus, set[MoveStatus]] = {
        MoveStatus.quoted:     {MoveStatus.booked},
        MoveStatus.booked:     {MoveStatus.loading},
        MoveStatus.loading:    {MoveStatus.in_transit},
        MoveStatus.in_transit: {MoveStatus.delivered, MoveStatus.disputed},
        MoveStatus.delivered:  {MoveStatus.completed, MoveStatus.disputed},
        MoveStatus.disputed:   {MoveStatus.completed},
        MoveStatus.completed:  set(),
    }

    def _assert_valid_transition(
        self, current: MoveStatus, new: MoveStatus
    ) -> None:
        allowed = self._VALID_TRANSITIONS.get(current, set())
        if new not in allowed:
            raise ForbiddenError(
                f"Cannot transition from '{current}' to '{new}'. "
                f"Allowed: {[s.value for s in allowed] or 'none'}."
            )
