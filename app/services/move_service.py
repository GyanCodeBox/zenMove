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
        move = Move(
            customer_id=customer_id,
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
        await self.db.flush()
        await self.db.refresh(move)
        return _to_response(move, len(move.items))

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
