"""
app/models/dispute.py
──────────────────────
Disputes raised post-delivery. Ties into escrow hold logic.
"""

import enum
import uuid
from datetime import datetime

from sqlalchemy import DateTime, Enum, ForeignKey, String, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.types import JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class DisputeType(str, enum.Enum):
    damage    = "damage"
    missing   = "missing"
    delay     = "delay"
    overcharge = "overcharge"


class DisputeStatus(str, enum.Enum):
    open           = "open"
    vendor_review  = "vendor_review"   # waiting for vendor response
    ai_review      = "ai_review"       # ZenBot photo diff (Phase 4)
    human_review   = "human_review"    # ops team arbitration
    resolved_customer = "resolved_customer"
    resolved_vendor   = "resolved_vendor"
    partial_settlement = "partial_settlement"
    withdrawn      = "withdrawn"


class Dispute(Base):
    __tablename__ = "disputes"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    move_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("moves.id"), nullable=False, index=True)
    item_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("items.id"), nullable=True)
    raised_by: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)

    dispute_type: Mapped[DisputeType] = mapped_column(Enum(DisputeType), nullable=False)
    status: Mapped[DisputeStatus] = mapped_column(
        Enum(DisputeStatus), default=DisputeStatus.open, nullable=False, index=True
    )

    description: Mapped[str] = mapped_column(Text, nullable=False)
    damage_photo_key: Mapped[str | None] = mapped_column(Text, nullable=True)  # S3 key

    # AI verdict populated in Phase 4
    ai_verdict: Mapped[dict | None] = mapped_column(JSON, nullable=True)

    # Vendor response
    vendor_response: Mapped[str | None] = mapped_column(Text, nullable=True)
    vendor_responded_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    # Ops resolution
    resolution_note: Mapped[str | None] = mapped_column(Text, nullable=True)
    resolved_by: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    resolved_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    # Escrow impact
    escrow_hold_amount: Mapped[float | None] = mapped_column(String(20), nullable=True)
    refund_amount: Mapped[float | None] = mapped_column(String(20), nullable=True)

    opened_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    def __repr__(self) -> str:
        return f"<Dispute id={self.id} type={self.dispute_type} status={self.status}>"
