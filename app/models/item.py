"""
app/models/item.py
───────────────────
Items table — every physical item in a move gets one row.
This is the Digital Twin: the item's condition, photos, and QR binding
all live here. The QR sticker is the physical manifestation of this record.
"""

import enum
import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, Enum, ForeignKey, String, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class ItemCondition(str, enum.Enum):
    good = "good"
    fragile = "fragile"
    damaged = "damaged"   # pre-existing damage noted at packing


class ItemConditionPost(str, enum.Enum):
    good = "good"
    fragile = "fragile"
    damaged = "damaged"   # new or pre-existing confirmed at unloading
    missing = "missing"


class TagTier(str, enum.Enum):
    """
    PVC  — Tier 1: industrial, weather-resistant sticker from the Pro Kit.
    PAPER — Tier 2: cloud-printed paper tag. Flagged HIGH RISK in the system.
    """
    PVC = "PVC"
    PAPER = "PAPER"


class Item(Base):
    __tablename__ = "items"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    move_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("moves.id"), nullable=False, index=True
    )

    # ── Item metadata ──────────────────────────────────────────────────
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    condition_pre: Mapped[ItemCondition] = mapped_column(Enum(ItemCondition), nullable=False)
    condition_post: Mapped[ItemConditionPost | None] = mapped_column(
        Enum(ItemConditionPost), nullable=True
    )

    # ── QR Sticker ─────────────────────────────────────────────────────
    # qr_code is nullable at creation — items can be created before binding.
    # Binding happens when the packer physically scans a sticker via the app.
    qr_code: Mapped[str | None] = mapped_column(String(100), unique=True, nullable=True, index=True)
    tag_tier: Mapped[TagTier | None] = mapped_column(Enum(TagTier), nullable=True)
    is_high_risk: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    # ── Photo evidence ─────────────────────────────────────────────────
    # S3 object keys (not full URLs — signed URLs are generated on demand)
    open_photo_key: Mapped[str | None] = mapped_column(Text, nullable=True)   # pre-pack contents
    sealed_photo_key: Mapped[str | None] = mapped_column(Text, nullable=True) # sealed box

    # SHA-256 hash captured on device at upload time — tamper detection
    open_photo_hash: Mapped[str | None] = mapped_column(String(64), nullable=True)
    sealed_photo_hash: Mapped[str | None] = mapped_column(String(64), nullable=True)

    # ── Scan events ────────────────────────────────────────────────────
    is_loaded: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    is_unloaded: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    loaded_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    unloaded_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    # ── Relationships ──────────────────────────────────────────────────
    move: Mapped["Move"] = relationship("Move", back_populates="items")  # noqa: F821

    @property
    def is_photo_complete(self) -> bool:
        """True only when both photos have been uploaded."""
        return bool(self.open_photo_key and self.sealed_photo_key)

    @property
    def is_qr_bound(self) -> bool:
        return self.qr_code is not None

    def __repr__(self) -> str:
        return f"<Item id={self.id} name={self.name!r} qr={self.qr_code}>"
