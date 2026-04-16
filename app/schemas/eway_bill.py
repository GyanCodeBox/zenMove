"""
app/schemas/eway_bill.py
"""

from datetime import datetime
from uuid import UUID

from pydantic import field_validator

from app.schemas.common import ZenBaseModel


class EWayBillGenerateRequest(ZenBaseModel):
    gstin_supplier: str
    gstin_recipient: str
    vehicle_no: str
    distance_km: int
    total_value: float

    @field_validator("gstin_supplier", "gstin_recipient")
    @classmethod
    def validate_gstin(cls, v: str) -> str:
        v = v.strip().upper()
        if len(v) != 15:
            raise ValueError("GSTIN must be 15 characters.")
        return v

    @field_validator("vehicle_no")
    @classmethod
    def clean_vehicle(cls, v: str) -> str:
        return v.strip().upper()


class EWayBillResponse(ZenBaseModel):
    id: UUID
    move_id: UUID
    ewb_no: str | None
    ewb_date: str | None
    valid_upto: str | None
    vehicle_no: str | None
    distance_km: int | None
    total_value: float | None
    is_sandbox: bool
    is_active: bool
    generated_at: datetime
