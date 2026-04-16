"""
app/schemas/dispute.py
"""

from datetime import datetime
from uuid import UUID

from app.models.dispute import DisputeStatus, DisputeType
from app.schemas.common import ZenBaseModel


class DisputeCreateRequest(ZenBaseModel):
    dispute_type: DisputeType
    description: str
    item_id: UUID | None = None


class DisputeVendorResponse(ZenBaseModel):
    vendor_response: str


class DisputeResolveRequest(ZenBaseModel):
    status: DisputeStatus
    resolution_note: str
    refund_amount: float | None = None


class DisputeResponse(ZenBaseModel):
    id: UUID
    move_id: UUID
    item_id: UUID | None
    raised_by: UUID
    dispute_type: DisputeType
    status: DisputeStatus
    description: str
    vendor_response: str | None
    resolution_note: str | None
    refund_amount: float | None
    escrow_hold_amount: float | None
    opened_at: datetime
    resolved_at: datetime | None
