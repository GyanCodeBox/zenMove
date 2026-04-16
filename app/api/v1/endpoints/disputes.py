"""
app/api/v1/endpoints/disputes.py
──────────────────────────────────
Dispute lifecycle endpoints.
"""

from uuid import UUID

from fastapi import APIRouter

from app.core.dependencies import CurrentUserID, DBSession
from app.schemas.common import SuccessResponse
from app.schemas.dispute import (
    DisputeCreateRequest, DisputeResolveRequest,
    DisputeResponse, DisputeVendorResponse,
)
from app.services.dispute_service import DisputeService

router = APIRouter(tags=["Disputes"])


@router.post(
    "/moves/{move_id}/disputes",
    response_model=SuccessResponse[DisputeResponse],
    status_code=201,
    summary="Raise a dispute (customer — within 24h of delivery)",
)
async def open_dispute(
    move_id: UUID,
    payload: DisputeCreateRequest,
    db: DBSession,
    user_id: CurrentUserID,
):
    """
    Opens a dispute and automatically holds M4 escrow milestone.
    Move status is set to 'disputed'.
    Vendor has 12 hours to respond.
    """
    result = await DisputeService(db).open_dispute(move_id, user_id, payload)
    return SuccessResponse(data=result)


@router.get(
    "/moves/{move_id}/disputes",
    response_model=SuccessResponse[list[DisputeResponse]],
    summary="List all disputes for a move",
)
async def list_disputes(
    move_id: UUID,
    db: DBSession,
    user_id: CurrentUserID,
):
    result = await DisputeService(db).list_disputes(move_id)
    return SuccessResponse(data=result)


@router.post(
    "/disputes/{dispute_id}/respond",
    response_model=SuccessResponse[DisputeResponse],
    summary="Vendor responds to a dispute (accept or contest)",
)
async def vendor_respond(
    dispute_id: UUID,
    payload: DisputeVendorResponse,
    db: DBSession,
    user_id: CurrentUserID,
):
    """
    Vendor submits their response to the dispute.
    Escalates to human review (ZenMove Ops) automatically.
    """
    result = await DisputeService(db).vendor_respond(dispute_id, payload)
    return SuccessResponse(data=result)


@router.post(
    "/disputes/{dispute_id}/resolve",
    response_model=SuccessResponse[DisputeResponse],
    summary="Ops resolves a dispute and instructs escrow release/refund",
)
async def resolve_dispute(
    dispute_id: UUID,
    payload: DisputeResolveRequest,
    db: DBSession,
    user_id: CurrentUserID,
):
    """
    ZenMove Ops delivers binding arbitration verdict.
    Automatically triggers escrow release or refund based on outcome:
      - resolved_vendor     → M4 released to vendor
      - resolved_customer   → M4 refunded to customer
      - partial_settlement  → M4 split per refund_amount
    """
    result = await DisputeService(db).resolve_dispute(dispute_id, user_id, payload)
    return SuccessResponse(data=result)
