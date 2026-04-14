"""
app/schemas/item.py
────────────────────
Pydantic models for Item request/response shapes.
"""

from datetime import datetime
from uuid import UUID

from pydantic import field_validator

from app.models.item import ItemCondition, ItemConditionPost, TagTier
from app.schemas.common import ZenBaseModel


# ── Request schemas ────────────────────────────────────────────────────────

class ItemCreateRequest(ZenBaseModel):
    """
    Packer creates an item record.
    QR binding is a separate step (POST /items/{id}/bind-qr).
    """
    name: str
    condition_pre: ItemCondition
    notes: str | None = None

    @field_validator("name")
    @classmethod
    def clean_name(cls, v: str) -> str:
        v = v.strip()
        if len(v) < 2:
            raise ValueError("Item name is too short.")
        return v


class QRBindRequest(ZenBaseModel):
    """
    Sent when a packer physically scans a sticker onto an item.
    The app reads the QR, extracts the code, and POSTs it here.
    """
    qr_code: str
    tag_tier: TagTier

    @field_validator("qr_code")
    @classmethod
    def validate_qr_format(cls, v: str) -> str:
        """
        Tier 1 PVC format:  ZM-2026-BBS-00001
        Tier 2 Paper format: ZM-2026-BBS-T-00001  (T = temporary)
        Both must start with 'ZM-'.
        """
        v = v.strip().upper()
        if not v.startswith("ZM-"):
            raise ValueError("QR code must start with 'ZM-'.")
        if len(v) < 10:
            raise ValueError("QR code is too short to be valid.")
        return v


class PhotoUploadResponse(ZenBaseModel):
    """Returned after a successful photo upload."""
    item_id: UUID
    photo_type: str          # "open" | "sealed"
    s3_key: str
    hash_sha256: str
    signed_url: str          # 15-min signed URL for immediate preview


class ScanEventRequest(ZenBaseModel):
    """
    Sent when a packer scans an item at loading or unloading.
    The event type is inferred from the move status on the server.
    """
    qr_code: str
    condition_post: ItemConditionPost | None = None

    @field_validator("qr_code")
    @classmethod
    def uppercase(cls, v: str) -> str:
        return v.strip().upper()


# ── Response schemas ───────────────────────────────────────────────────────

class ItemResponse(ZenBaseModel):
    id: UUID
    move_id: UUID
    name: str
    notes: str | None
    condition_pre: ItemCondition
    condition_post: ItemConditionPost | None
    qr_code: str | None
    tag_tier: TagTier | None
    is_high_risk: bool
    is_qr_bound: bool
    is_photo_complete: bool
    is_loaded: bool
    is_unloaded: bool
    loaded_at: datetime | None
    unloaded_at: datetime | None

    # Signed S3 URLs — generated on demand, not stored
    open_photo_url: str | None = None
    sealed_photo_url: str | None = None

    created_at: datetime
    updated_at: datetime


class ManifestSummary(ZenBaseModel):
    """Returned after manifest generation."""
    move_id: UUID
    total_items: int
    loaded_items: int
    unloaded_items: int
    high_risk_items: int
    unbound_items: int          # items without a QR code
    incomplete_photo_items: int  # items missing open or sealed photo
    manifest_url: str           # signed S3 URL to the PDF
    generated_at: datetime
