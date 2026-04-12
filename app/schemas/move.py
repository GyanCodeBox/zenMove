"""
app/schemas/move.py
────────────────────
Pydantic models for Move request/response shapes.
"""

from datetime import datetime
from uuid import UUID

from pydantic import field_validator

from app.models.move import MoveStatus
from app.schemas.common import ZenBaseModel


# ── Request schemas ────────────────────────────────────────────────────────

class MoveCreateRequest(ZenBaseModel):
    origin_address: str
    dest_address: str
    origin_city_code: str          # e.g. "BBS"
    dest_city_code: str            # e.g. "BLR"
    scheduled_at: datetime
    quote_amount: float

    @field_validator("quote_amount")
    @classmethod
    def positive_amount(cls, v: float) -> float:
        if v <= 0:
            raise ValueError("Quote amount must be positive.")
        return round(v, 2)

    @field_validator("origin_city_code", "dest_city_code")
    @classmethod
    def uppercase_city(cls, v: str) -> str:
        return v.strip().upper()


class MoveStatusUpdateRequest(ZenBaseModel):
    status: MoveStatus


# ── Response schemas ───────────────────────────────────────────────────────

class MoveResponse(ZenBaseModel):
    id: UUID
    customer_id: UUID
    vendor_id: UUID | None
    status: MoveStatus
    origin_address: str
    dest_address: str
    origin_city_code: str
    dest_city_code: str
    scheduled_at: datetime
    quote_amount: float
    escrow_id: str | None
    eway_bill_no: str | None
    total_items: int = 0
    loaded_count: int = 0
    unloaded_count: int = 0
    created_at: datetime
    updated_at: datetime
