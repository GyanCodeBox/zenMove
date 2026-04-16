"""
app/api/v1/endpoints/escrow.py
───────────────────────────────
Escrow, OTP, and wallet draw endpoints.
"""

from uuid import UUID

from fastapi import APIRouter

from app.core.dependencies import CurrentUserID, DBSession
from app.schemas.common import SuccessResponse
from app.schemas.escrow import (
    EscrowInitRequest, EscrowStatusResponse,
    OTPGenerateResponse, OTPVerifyRequest, OTPVerifyResponse,
    WalletDrawRequest, WalletDrawResponse,
)
from app.services.escrow_service import EscrowService
from app.services.otp_service import OTPService

router = APIRouter(tags=["Escrow & Payments"])


# ── Escrow ─────────────────────────────────────────────────────────────────

@router.post(
    "/moves/{move_id}/escrow/init",
    response_model=SuccessResponse[EscrowStatusResponse],
    status_code=201,
    summary="Initialise escrow for a move (customer pays — funds enter vault)",
)
async def init_escrow(
    move_id: UUID,
    payload: EscrowInitRequest,
    db: DBSession,
    user_id: CurrentUserID,
):
    """
    Customer confirms payment. Funds enter the mock escrow vault.
    M1 (10%) is immediately released to the vendor as booking confirmation.

    In production: Razorpay.js handles the payment on the frontend.
    The Razorpay payment_id is passed here as payment_ref.
    """
    result = await EscrowService(db).init_escrow(move_id, payload)
    return SuccessResponse(data=result)


@router.get(
    "/moves/{move_id}/escrow/status",
    response_model=SuccessResponse[EscrowStatusResponse],
    summary="Get escrow vault status and all milestone states",
)
async def get_escrow_status(
    move_id: UUID,
    db: DBSession,
    user_id: CurrentUserID,
):
    result = await EscrowService(db).get_status(move_id)
    return SuccessResponse(data=result)


@router.post(
    "/moves/{move_id}/escrow/release-m2",
    response_model=SuccessResponse[EscrowStatusResponse],
    summary="Release M2 (30%) — triggered after manifest + E-Way Bill confirmed",
)
async def release_m2(
    move_id: UUID,
    db: DBSession,
    user_id: CurrentUserID,
):
    """
    Releases M2 escrow milestone.
    Requires: E-Way Bill generated for the move.
    Called by the system when loading is complete and truck departs.
    """
    result = await EscrowService(db).release_m2(move_id)
    return SuccessResponse(data=result)


@router.post(
    "/moves/{move_id}/escrow/release-m4",
    response_model=SuccessResponse[EscrowStatusResponse],
    summary="Release M4 (remaining) — dispute window expired or all disputes resolved",
)
async def release_m4(
    move_id: UUID,
    db: DBSession,
    user_id: CurrentUserID,
):
    result = await EscrowService(db).release_m4(move_id)
    return SuccessResponse(data=result)


# ── OTP ────────────────────────────────────────────────────────────────────

@router.post(
    "/moves/{move_id}/otp/generate",
    response_model=SuccessResponse[OTPGenerateResponse],
    summary="Generate delivery OTP (sent to customer — mock returns it in response)",
)
async def generate_otp(
    move_id: UUID,
    db: DBSession,
    user_id: CurrentUserID,
):
    """
    Generates a 6-digit OTP for delivery confirmation.

    Mock mode: OTP is returned in otp_preview field (development only).
    Production: OTP is sent via WhatsApp/SMS. otp_preview is null.

    Move must be in 'in_transit' status.
    """
    escrow_svc = EscrowService(db)
    otp_svc = OTPService(db, escrow_svc)
    result = await otp_svc.generate_otp(move_id)
    return SuccessResponse(data=result)


@router.post(
    "/moves/{move_id}/otp/verify",
    response_model=SuccessResponse[OTPVerifyResponse],
    summary="Verify delivery OTP → advances move to delivered + releases M3 (60%)",
)
async def verify_otp(
    move_id: UUID,
    payload: OTPVerifyRequest,
    db: DBSession,
    user_id: CurrentUserID,
):
    """
    Customer enters the OTP at destination.
    On success:
      - Move status → delivered
      - M3 escrow (60%) released to vendor
      - 24-hour dispute window opens
    """
    escrow_svc = EscrowService(db)
    otp_svc = OTPService(db, escrow_svc)
    result = await otp_svc.verify_otp(move_id, payload)
    return SuccessResponse(data=result)


# ── Wallet Draw ────────────────────────────────────────────────────────────

@router.post(
    "/moves/{move_id}/wallet/draw",
    response_model=SuccessResponse[WalletDrawResponse],
    status_code=201,
    summary="Vendor requests a mid-move cash draw (tolls/diesel)",
)
async def request_wallet_draw(
    move_id: UUID,
    payload: WalletDrawRequest,
    db: DBSession,
    user_id: CurrentUserID,
):
    """
    Vendor requests an in-transit cash draw.
    Blocked if > 15% of quote amount — anomaly protection.
    No cash — all disbursements tracked on-platform.
    """
    result = await EscrowService(db).create_wallet_draw(move_id, user_id, payload)
    return SuccessResponse(data=result)


# ── Razorpay Webhook (stubbed for Phase 2) ─────────────────────────────────

@router.post(
    "/webhooks/razorpay",
    include_in_schema=False,   # internal — not shown in docs
    summary="Razorpay payment webhook handler (Phase 2 stub)",
)
async def razorpay_webhook(db: DBSession):
    """
    In production: Razorpay sends payment events here.
    Verify HMAC signature, then trigger appropriate escrow action.
    Stubbed for Phase 2 — will be implemented when real Razorpay is wired.
    """
    return {"received": True, "note": "Webhook stub — implement in Phase 2 Razorpay integration"}
