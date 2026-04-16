"""
app/schemas/escrow.py
──────────────────────
Pydantic schemas for escrow, OTP, and wallet draw endpoints.
"""

from datetime import datetime
from uuid import UUID

from pydantic import field_validator

from app.models.escrow import MilestoneKey, MilestoneStatus
from app.schemas.common import ZenBaseModel


# ── Escrow ─────────────────────────────────────────────────────────────────

class EscrowInitRequest(ZenBaseModel):
    """Customer initiates escrow for a booked move."""
    payment_ref: str | None = None    # mock: any string; real: Razorpay payment_id


class MilestoneResponse(ZenBaseModel):
    id: UUID
    milestone: MilestoneKey
    pct_of_total: float
    amount: float
    status: MilestoneStatus
    trigger_event: str | None
    released_at: datetime | None
    payment_ref: str | None


class EscrowStatusResponse(ZenBaseModel):
    move_id: UUID
    total_amount: float
    vault_balance: float
    released_amount: float
    platform_fee: float
    vendor_total: float
    milestones: list[MilestoneResponse]


# ── OTP ────────────────────────────────────────────────────────────────────

class OTPGenerateResponse(ZenBaseModel):
    move_id: UUID
    message: str
    # Only present in mock mode — stripped in production
    otp_preview: str | None = None


class OTPVerifyRequest(ZenBaseModel):
    otp: str

    @field_validator("otp")
    @classmethod
    def validate_otp(cls, v: str) -> str:
        v = v.strip()
        if not v.isdigit() or len(v) != 6:
            raise ValueError("OTP must be exactly 6 digits.")
        return v


class OTPVerifyResponse(ZenBaseModel):
    move_id: UUID
    verified: bool
    milestone_released: str   # "M3_delivery"
    amount_released: float
    message: str


# ── Wallet Draw ────────────────────────────────────────────────────────────

class WalletDrawRequest(ZenBaseModel):
    amount: float
    reason: str     # toll | diesel | other
    notes: str | None = None

    @field_validator("amount")
    @classmethod
    def positive(cls, v: float) -> float:
        if v <= 0:
            raise ValueError("Amount must be positive.")
        return round(v, 2)

    @field_validator("reason")
    @classmethod
    def valid_reason(cls, v: str) -> str:
        allowed = {"toll", "diesel", "other"}
        if v.lower() not in allowed:
            raise ValueError(f"Reason must be one of: {allowed}")
        return v.lower()


class WalletDrawResponse(ZenBaseModel):
    id: UUID
    move_id: UUID
    amount: float
    reason: str
    status: str
    created_at: datetime
