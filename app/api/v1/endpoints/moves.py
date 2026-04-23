"""
app/api/v1/endpoints/moves.py
──────────────────────────────
Move CRUD and status transition endpoints.
"""

from uuid import UUID

from fastapi import APIRouter, Query

from app.core.dependencies import CurrentUserID, DBSession, PaginationDep
from app.models.move import MoveStatus
from app.schemas.common import PaginatedResponse, SuccessResponse
from app.schemas.move import MoveCreateRequest, MoveResponse, MoveStatusUpdateRequest, OTPVerifyRequest
from app.services.move_service import MoveService

router = APIRouter(prefix="/moves", tags=["Moves"])


@router.post(
    "",
    response_model=SuccessResponse[MoveResponse],
    status_code=201,
    summary="Create a new move / quote",
)
async def create_move(
    payload: MoveCreateRequest,
    db: DBSession,
    user_id: CurrentUserID,
):
    move = await MoveService(db).create_move(user_id, payload)
    return SuccessResponse(data=move)


@router.get(
    "",
    response_model=PaginatedResponse[MoveResponse],
    summary="List all moves for the authenticated user",
)
async def list_moves(
    db: DBSession,
    user_id: CurrentUserID,
    pagination: PaginationDep,
    status: MoveStatus | None = Query(default=None, description="Filter by status"),
):
    moves, total = await MoveService(db).list_moves(user_id, pagination, status)
    return PaginatedResponse(
        data=moves,
        total=total,
        page=pagination.page,
        page_size=pagination.page_size,
        has_next=(pagination.offset + pagination.page_size) < total,
    )


@router.get(
    "/{move_id}",
    response_model=SuccessResponse[MoveResponse],
    summary="Get a single move by ID",
)
async def get_move(move_id: UUID, db: DBSession, user_id: CurrentUserID):
    move = await MoveService(db).get_move(move_id, user_id)
    return SuccessResponse(data=move)


@router.patch(
    "/{move_id}/status",
    response_model=SuccessResponse[MoveResponse],
    summary="Advance move to the next status (strict state machine)",
)
async def update_move_status(
    move_id: UUID,
    payload: MoveStatusUpdateRequest,
    db: DBSession,
    user_id: CurrentUserID,
):
    move = await MoveService(db).update_status(move_id, payload.status, user_id)
    return SuccessResponse(data=move)


# ── Proof of Delivery (OTP) ───────────────────────────────────────────────

@router.post(
    "/{move_id}/otp/generate",
    response_model=SuccessResponse[str],
    summary="Generate delivery OTP (Customer/System only)",
)
async def generate_otp(move_id: UUID, db: DBSession, user_id: CurrentUserID):
    otp = await MoveService(db).generate_delivery_otp(move_id, user_id)
    return SuccessResponse(data=otp)


@router.post(
    "/{move_id}/otp/verify",
    response_model=SuccessResponse[bool],
    summary="Verify delivery OTP and unlock manifest",
)
async def verify_otp(
    move_id: UUID,
    payload: OTPVerifyRequest,
    db: DBSession,
    user_id: CurrentUserID,
):
    valid = await MoveService(db).verify_delivery_otp(move_id, payload.otp)
    return SuccessResponse(data=valid)
