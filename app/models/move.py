"""
app/models/move.py
───────────────────
Moves table — one record per relocation job.
"""

import enum
import uuid
from datetime import datetime

from sqlalchemy import DateTime, Enum, ForeignKey, Numeric, String, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class MoveStatus(str, enum.Enum):
    quoted = "quoted"
    booked = "booked"
    loading = "loading"
    in_transit = "in_transit"
    delivered = "delivered"
    disputed = "disputed"
    completed = "completed"


# Defines which statuses allow item/manifest edits
EDITABLE_STATUSES = {MoveStatus.quoted, MoveStatus.booked, MoveStatus.loading}


class Move(Base):
    __tablename__ = "moves"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    customer_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True
    )
    vendor_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=True
    )

    status: Mapped[MoveStatus] = mapped_column(
        Enum(MoveStatus), default=MoveStatus.quoted, nullable=False, index=True
    )

    origin_address: Mapped[str] = mapped_column(Text, nullable=False)
    dest_address: Mapped[str] = mapped_column(Text, nullable=False)
    origin_city_code: Mapped[str] = mapped_column(String(10), nullable=False)  # e.g. BBS
    dest_city_code: Mapped[str] = mapped_column(String(10), nullable=False)    # e.g. BLR

    scheduled_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    quote_amount: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)

    # Escrow — populated in Phase 2
    escrow_id: Mapped[str | None] = mapped_column(String(255), nullable=True)
    eway_bill_no: Mapped[str | None] = mapped_column(String(50), nullable=True)

    # Delivery OTP — populated at in_transit
    delivery_otp_hash: Mapped[str | None] = mapped_column(String(255), nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    # ── Relationships ──────────────────────────────────────────────────
    customer: Mapped["User"] = relationship(  # noqa: F821
        "User", foreign_keys=[customer_id], back_populates="customer_moves"
    )
    vendor: Mapped["User | None"] = relationship(  # noqa: F821
        "User", foreign_keys=[vendor_id], back_populates="vendor_moves"
    )
    items: Mapped[list["Item"]] = relationship(  # noqa: F821
        "Item", back_populates="move", cascade="all, delete-orphan"
    )

    @property
    def is_editable(self) -> bool:
        return self.status in EDITABLE_STATUSES

    @property
    def loaded_count(self) -> int:
        return sum(1 for item in self.items if item.is_loaded)

    @property
    def unloaded_count(self) -> int:
        return sum(1 for item in self.items if item.is_unloaded)

    def __repr__(self) -> str:
        return f"<Move id={self.id} status={self.status}>"
