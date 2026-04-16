"""
app/models/eway_bill.py
────────────────────────
E-Way Bill records. One per inter-state move.
NIC API integration is stubbed — plug in real GSTIN credentials via .env.
"""

import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, String, ForeignKey, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class EWayBill(Base):
    __tablename__ = "eway_bills"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    move_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("moves.id"), unique=True, nullable=False, index=True
    )

    # NIC response fields
    ewb_no: Mapped[str | None] = mapped_column(String(20), nullable=True)   # 12-digit EWB number
    ewb_date: Mapped[str | None] = mapped_column(String(30), nullable=True)
    valid_upto: Mapped[str | None] = mapped_column(String(30), nullable=True)

    # Consignment details sent to NIC
    gstin_supplier: Mapped[str | None] = mapped_column(String(20), nullable=True)
    gstin_recipient: Mapped[str | None] = mapped_column(String(20), nullable=True)
    vehicle_no: Mapped[str | None] = mapped_column(String(20), nullable=True)
    distance_km: Mapped[int | None] = mapped_column(nullable=True)
    total_value: Mapped[float | None] = mapped_column(nullable=True)

    # NIC raw response (for audit)
    nic_response: Mapped[str | None] = mapped_column(Text, nullable=True)

    is_sandbox: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    generated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    cancelled_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    @property
    def is_active(self) -> bool:
        return self.ewb_no is not None and self.cancelled_at is None
