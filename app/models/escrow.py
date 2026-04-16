"""
app/models/escrow.py
─────────────────────
Escrow milestone and wallet draw request tables.

Design: ZenMove is the Instruction Layer only.
  - The 'vault_balance' in EscrowOrder is the mock equivalent of the
    Razorpay Nodal Account balance. In production this is never in
    ZenMove's own DB — it lives at Razorpay/Axis Bank.
  - ZenMove only records the instruction log and release confirmations.
"""

import enum
import uuid
from datetime import datetime

from sqlalchemy import DateTime, Enum, ForeignKey, Numeric, String, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class MilestoneStatus(str, enum.Enum):
    pending   = "pending"
    released  = "released"
    held      = "held"       # held during active dispute
    refunded  = "refunded"


class MilestoneKey(str, enum.Enum):
    M1_booking  = "M1_booking"    # 10% on booking confirmation
    M2_loading  = "M2_loading"    # 30% on manifest + e-way bill
    M3_delivery = "M3_delivery"   # 60% on OTP-verified delivery
    M4_closeout = "M4_closeout"   # remaining on dispute window expiry


MILESTONE_PCT: dict[MilestoneKey, float] = {
    MilestoneKey.M1_booking:  10.0,
    MilestoneKey.M2_loading:  30.0,
    MilestoneKey.M3_delivery: 50.0,
    MilestoneKey.M4_closeout:  0.0,   # calculated as remainder
}


class EscrowOrder(Base):
    """
    One row per move — the mock escrow vault.
    In production: this maps to a Razorpay escrow order.
    """
    __tablename__ = "escrow_orders"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    move_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("moves.id"), unique=True, nullable=False)

    # Total amount locked in escrow = move.quote_amount
    total_amount: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)
    # Amount still in vault (decremented on each release)
    vault_balance: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)

    # Mock/real payment reference
    payment_ref: Mapped[str | None] = mapped_column(String(255), nullable=True)
    razorpay_order_id: Mapped[str | None] = mapped_column(String(255), nullable=True)

    platform_fee_pct: Mapped[float] = mapped_column(Numeric(5, 2), default=10.0, nullable=False)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    milestones: Mapped[list["EscrowMilestone"]] = relationship(
        "EscrowMilestone", back_populates="order", cascade="all, delete-orphan"
    )

    @property
    def released_amount(self) -> float:
        return float(self.total_amount) - float(self.vault_balance)

    @property
    def platform_fee(self) -> float:
        return round(float(self.total_amount) * float(self.platform_fee_pct) / 100, 2)

    @property
    def vendor_total(self) -> float:
        return float(self.total_amount) - self.platform_fee


class EscrowMilestone(Base):
    """One row per milestone per move."""
    __tablename__ = "escrow_milestones"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    order_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("escrow_orders.id"), nullable=False)
    move_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("moves.id"), nullable=False, index=True)

    milestone: Mapped[MilestoneKey] = mapped_column(Enum(MilestoneKey), nullable=False)
    pct_of_total: Mapped[float] = mapped_column(Numeric(5, 2), nullable=False)
    amount: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)
    status: Mapped[MilestoneStatus] = mapped_column(Enum(MilestoneStatus), default=MilestoneStatus.pending, nullable=False)

    trigger_event: Mapped[str | None] = mapped_column(String(255), nullable=True)
    payment_ref: Mapped[str | None] = mapped_column(String(255), nullable=True)
    released_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    order: Mapped["EscrowOrder"] = relationship("EscrowOrder", back_populates="milestones")


class WalletDrawRequest(Base):
    """
    Vendor requests a mid-move cash draw (tolls, fuel top-up).
    Requires customer approval before release. No cash allowed.
    """
    __tablename__ = "wallet_draw_requests"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    move_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("moves.id"), nullable=False, index=True)
    vendor_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)

    amount: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)
    reason: Mapped[str] = mapped_column(String(50), nullable=False)   # toll | diesel | other
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    receipt_s3_key: Mapped[str | None] = mapped_column(Text, nullable=True)

    status: Mapped[str] = mapped_column(
        String(20), default="pending", nullable=False
    )  # pending | approved | rejected

    approved_by: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    approved_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
