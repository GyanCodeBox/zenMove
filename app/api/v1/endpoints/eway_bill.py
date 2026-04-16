"""
app/api/v1/endpoints/eway_bill.py
──────────────────────────────────
E-Way Bill generation and status endpoints.
"""

from uuid import UUID

from fastapi import APIRouter

from app.core.dependencies import CurrentUserID, DBSession
from app.schemas.common import SuccessResponse
from app.schemas.eway_bill import EWayBillGenerateRequest, EWayBillResponse
from app.services.eway_bill_service import EWayBillService

router = APIRouter(tags=["E-Way Bill"])


@router.post(
    "/moves/{move_id}/eway-bill/generate",
    response_model=SuccessResponse[EWayBillResponse],
    status_code=201,
    summary="Generate E-Way Bill for an inter-state move (mandatory before M2 release)",
)
async def generate_eway_bill(
    move_id: UUID,
    payload: EWayBillGenerateRequest,
    db: DBSession,
    user_id: CurrentUserID,
):
    """
    Generates an E-Way Bill via NIC API.

    **Sandbox mode** (NIC_SANDBOX=true): Returns a realistic mock EWB number.
    **Production** (NIC_SANDBOX=false): Calls real NIC API with GSTIN credentials.

    The EWB number is also stored on the move record (move.eway_bill_no).
    M2 escrow release is blocked until this endpoint succeeds.
    """
    result = await EWayBillService(db).generate(move_id, payload)
    return SuccessResponse(data=result)


@router.get(
    "/moves/{move_id}/eway-bill",
    response_model=SuccessResponse[EWayBillResponse],
    summary="Get E-Way Bill status for a move",
)
async def get_eway_bill(
    move_id: UUID,
    db: DBSession,
    user_id: CurrentUserID,
):
    result = await EWayBillService(db).get(move_id)
    return SuccessResponse(data=result)
