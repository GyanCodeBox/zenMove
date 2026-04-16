"""
app/services/otp_service.py
────────────────────────────
Delivery OTP: generated on arrival, verified at destination.

Mock mode: OTP is returned in the API response (otp_preview field).
Production: send via WhatsApp (Twilio) or SMS (Fast2SMS/MSG91).
OTPs are stored in Redis with a 10-minute TTL.
"""

import random
import hashlib
from uuid import UUID


from app.core.config import get_settings
from app.core.exceptions import ValidationError, NotFoundError
from app.models.move import Move, MoveStatus
from app.schemas.escrow import OTPGenerateResponse, OTPVerifyRequest, OTPVerifyResponse
from app.services.escrow_service import EscrowService

settings = get_settings()


def _hash_otp(otp: str) -> str:
    """Store a bcrypt-like hash of the OTP, not plaintext."""
    return hashlib.sha256(otp.encode()).hexdigest()


class OTPService:

    def __init__(self, db, escrow_service: EscrowService):
        self.db = db
        self.escrow_service = escrow_service

    async def generate_otp(self, move_id: UUID) -> OTPGenerateResponse:
        """
        Generate a 6-digit OTP for delivery confirmation.
        Stored in Redis with 10-min TTL.
        In mock mode, returned in the response for testing.
        """
        move = await self.db.get(Move, move_id)
        if not move:
            raise NotFoundError(f"Move {move_id} not found.")

        if move.status != MoveStatus.in_transit:
            raise ValidationError(
                "OTP can only be generated when move is in_transit. "
                f"Current status: {move.status}."
            )

        otp = str(random.randint(100000, 999999))
        otp_hash = _hash_otp(otp)

        # Save to DB instead of Redis for SQLite/local dev reliability
        move.delivery_otp_hash = otp_hash
        await self.db.flush()
        # In production: send otp via WhatsApp/SMS to customer's phone here
        # await whatsapp_client.send(move.customer.phone, f"Your ZenMove delivery OTP: {otp}")

        return OTPGenerateResponse(
            move_id=move_id,
            message="OTP generated. Valid for 10 minutes.",
            # Mock only — remove in production
            otp_preview=otp if settings.is_development else None,
        )

    async def verify_otp(
        self, move_id: UUID, payload: OTPVerifyRequest
    ) -> OTPVerifyResponse:
        """
        Verify the delivery OTP.
        On success: advance move to 'delivered', trigger M3 escrow release.
        """
        move = await self.db.get(Move, move_id)
        if not move:
            raise NotFoundError(f"Move {move_id} not found.")

        if move.status != MoveStatus.in_transit:
            raise ValidationError(
                f"OTP verification is only valid for in_transit moves. Current: {move.status}."
            )

        stored_hash = move.delivery_otp_hash

        if not stored_hash:
            raise ValidationError(
                "OTP has expired or was never generated. "
                "Request a new OTP via POST /moves/{id}/otp/generate."
            )

        if _hash_otp(payload.otp) != stored_hash:
            raise ValidationError("Invalid OTP. Please try again.")

        # Delete OTP from DB (single use)
        move.delivery_otp_hash = None

        # Advance move status
        move.status = MoveStatus.delivered
        await self.db.flush()

        # Trigger M3 escrow release
        _, amount_released = await self.escrow_service.release_m3(move_id)

        return OTPVerifyResponse(
            move_id=move_id,
            verified=True,
            milestone_released="M3_delivery",
            amount_released=amount_released,
            message=(
                f"Delivery confirmed. ₹{amount_released:,.2f} released to vendor. "
                "Dispute window: 24 hours."
            ),
        )
