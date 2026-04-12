"""
app/services/item_service.py
─────────────────────────────
Business logic for the Digital Twin / Item lifecycle.

This is the heart of Phase 1. Every method here corresponds to a step
in the packer's workflow:
  1. create_item()       — packer enters name + condition
  2. bind_qr()           — packer scans sticker onto the item
  3. upload_photo()      — packer takes open/sealed photo
  4. record_scan_event() — packer scans item at loading/unloading
  5. generate_manifest() — system produces the signed PDF custody record
"""

from datetime import datetime, timezone
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import (
    MoveNotEditableError,
    NotFoundError,
    QRAlreadyBoundError,
    QRNotFoundError,
    PhotoIntegrityError,
    ValidationError,
)
from app.models.item import Item, TagTier
from app.models.move import Move, MoveStatus
from app.schemas.item import (
    ItemCreateRequest,
    ItemResponse,
    ManifestSummary,
    PhotoUploadResponse,
    QRBindRequest,
)
from app.utils.manifest import generate_manifest_pdf
from app.utils.qr import hash_file_bytes, is_valid_qr_format
from app.utils.s3 import (
    build_manifest_key,
    build_photo_key,
    generate_signed_url,
    upload_file_bytes,
)
from app.core.config import get_settings

settings = get_settings()


def _to_response(item: Item) -> ItemResponse:
    """Convert ORM Item to response schema, generating signed URLs on demand."""
    open_url = generate_signed_url(item.open_photo_key) if item.open_photo_key else None
    sealed_url = generate_signed_url(item.sealed_photo_key) if item.sealed_photo_key else None

    return ItemResponse(
        id=item.id,
        move_id=item.move_id,
        name=item.name,
        notes=item.notes,
        condition_pre=item.condition_pre,
        condition_post=item.condition_post,
        qr_code=item.qr_code,
        tag_tier=item.tag_tier,
        is_high_risk=item.is_high_risk,
        is_qr_bound=item.is_qr_bound,
        is_photo_complete=item.is_photo_complete,
        is_loaded=item.is_loaded,
        is_unloaded=item.is_unloaded,
        loaded_at=item.loaded_at,
        unloaded_at=item.unloaded_at,
        open_photo_url=open_url,
        sealed_photo_url=sealed_url,
        created_at=item.created_at,
        updated_at=item.updated_at,
    )


class ItemService:

    def __init__(self, db: AsyncSession):
        self.db = db

    # ── 1. Create item ─────────────────────────────────────────────────

    async def create_item(
        self, move_id: UUID, payload: ItemCreateRequest
    ) -> ItemResponse:
        """
        Packer creates a Digital Twin record.
        QR binding is intentionally a separate step — packer can
        create all items first, then go around sticking QRs.
        """
        move = await self._fetch_move(move_id)
        if not move.is_editable:
            raise MoveNotEditableError(
                f"Move is in '{move.status}' status. Items can only be added during "
                "quoted, booked, or loading."
            )

        item = Item(
            move_id=move_id,
            name=payload.name,
            notes=payload.notes,
            condition_pre=payload.condition_pre,
        )
        self.db.add(item)
        await self.db.flush()
        await self.db.refresh(item)
        return _to_response(item)

    # ── 2. Bind QR sticker to item ─────────────────────────────────────

    async def bind_qr(
        self, item_id: UUID, payload: QRBindRequest
    ) -> ItemResponse:
        """
        Called when a packer scans a physical sticker onto an item.

        Rules:
          - QR code must not already be bound to any item (globally unique).
          - Item must not already have a QR bound.
          - Move must still be editable.
          - Tier 2 (PAPER) tags automatically set is_high_risk = True.
        """
        item = await self._fetch_item(item_id)
        move = await self._fetch_move(item.move_id)

        if not move.is_editable:
            raise MoveNotEditableError("Cannot bind QR — move is no longer editable.")

        if item.qr_code:
            raise QRAlreadyBoundError(
                f"Item '{item.name}' already has QR code '{item.qr_code}' bound."
            )

        if not is_valid_qr_format(payload.qr_code):
            raise ValidationError(f"QR code format is invalid: {payload.qr_code}")

        # Check global uniqueness — one sticker, one item, forever
        existing = await self.db.scalar(
            select(Item).where(Item.qr_code == payload.qr_code)
        )
        if existing:
            raise QRAlreadyBoundError(
                f"QR code '{payload.qr_code}' is already bound to another item."
            )

        item.qr_code = payload.qr_code
        item.tag_tier = payload.tag_tier
        item.is_high_risk = payload.tag_tier == TagTier.PAPER

        await self.db.flush()
        await self.db.refresh(item)
        return _to_response(item)

    # ── 3. Upload photo ────────────────────────────────────────────────

    async def upload_photo(
        self,
        item_id: UUID,
        photo_type: str,      # "open" | "sealed"
        file_bytes: bytes,
        client_hash: str,     # SHA-256 sent by the device
    ) -> PhotoUploadResponse:
        """
        Upload a photo to S3 and record its hash for tamper detection.

        The client computes SHA-256 on-device before upload.
        We recompute server-side and compare — mismatch = tampered in transit.

        photo_type must be 'open' (contents visible, pre-pack) or
        'sealed' (closed box, post-pack).
        """
        if photo_type not in ("open", "sealed"):
            raise ValidationError("photo_type must be 'open' or 'sealed'.")

        item = await self._fetch_item(item_id)
        move = await self._fetch_move(item.move_id)

        if not move.is_editable:
            raise MoveNotEditableError("Cannot upload photos — move is no longer editable.")

        # Server-side hash verification
        server_hash = hash_file_bytes(file_bytes)
        if server_hash != client_hash.lower():
            raise PhotoIntegrityError(
                "Photo hash mismatch. The file may have been corrupted or tampered with in transit."
            )

        # Build the deterministic S3 key
        s3_key = build_photo_key(
            str(item.move_id), str(item.id), photo_type
        )

        # Upload to S3
        upload_file_bytes(
            data=file_bytes,
            key=s3_key,
            content_type="image/jpeg",
        )

        # Persist key + hash
        if photo_type == "open":
            item.open_photo_key = s3_key
            item.open_photo_hash = server_hash
        else:
            item.sealed_photo_key = s3_key
            item.sealed_photo_hash = server_hash

        await self.db.flush()

        # Return a short-lived signed URL for immediate preview in the app
        signed_url = generate_signed_url(s3_key)

        return PhotoUploadResponse(
            item_id=item.id,
            photo_type=photo_type,
            s3_key=s3_key,
            hash_sha256=server_hash,
            signed_url=signed_url,
        )

    # ── 4. Record scan event (loading / unloading) ─────────────────────

    async def record_scan_event(
        self, move_id: UUID, qr_code: str
    ) -> ItemResponse:
        """
        Called when a packer scans an item at loading or unloading.

        The event type is derived from the move's current status:
          - 'loading'    → marks item as loaded
          - 'delivered'  → marks item as unloaded

        This is how we achieve the 0% variance metric: every item
        that was loaded must be scanned again at unloading.
        """
        move = await self._fetch_move(move_id)
        qr_upper = qr_code.strip().upper()

        item = await self.db.scalar(
            select(Item).where(
                Item.move_id == move_id,
                Item.qr_code == qr_upper,
            )
        )
        if not item:
            raise QRNotFoundError(
                f"QR code '{qr_upper}' is not registered to move {move_id}."
            )

        now = datetime.now(timezone.utc)

        if move.status == MoveStatus.loading:
            if item.is_loaded:
                raise ValidationError(f"Item '{item.name}' is already marked as loaded.")
            item.is_loaded = True
            item.loaded_at = now

        elif move.status == MoveStatus.delivered:
            if not item.is_loaded:
                raise ValidationError(
                    f"Item '{item.name}' was never scanned at loading — cannot unload."
                )
            if item.is_unloaded:
                raise ValidationError(f"Item '{item.name}' is already marked as unloaded.")
            item.is_unloaded = True
            item.unloaded_at = now

        else:
            raise ValidationError(
                f"Scan events are only valid when move status is 'loading' or 'delivered'. "
                f"Current status: '{move.status}'."
            )

        await self.db.flush()
        await self.db.refresh(item)
        return _to_response(item)

    # ── 5. Generate manifest ───────────────────────────────────────────

    async def generate_manifest(self, move_id: UUID) -> ManifestSummary:
        """
        Generate (or regenerate) the PDF custody manifest for a move.

        The manifest is uploaded to S3 and a signed URL is returned.
        It can be called at any stage — but the 'final' manifest
        should be generated immediately before the truck departs.
        """
        move = await self._fetch_move(move_id)
        items_result = await self.db.execute(
            select(Item).where(Item.move_id == move_id).order_by(Item.created_at)
        )
        items = list(items_result.scalars().all())

        # Generate PDF bytes
        pdf_bytes = generate_manifest_pdf(move, items)

        # Upload to S3 (manifests bucket)
        from app.core.config import get_settings
        cfg = get_settings()
        manifest_key = build_manifest_key(str(move_id))
        upload_file_bytes(
            data=pdf_bytes,
            key=manifest_key,
            content_type="application/pdf",
            bucket=cfg.s3_bucket_manifests,
        )

        # Signed URL (longer TTL for manifests — 1 hour)
        manifest_url = generate_signed_url(
            manifest_key,
            bucket=cfg.s3_bucket_manifests,
            expiry=3600,
        )

        return ManifestSummary(
            move_id=move_id,
            total_items=len(items),
            loaded_items=sum(1 for i in items if i.is_loaded),
            unloaded_items=sum(1 for i in items if i.is_unloaded),
            high_risk_items=sum(1 for i in items if i.is_high_risk),
            unbound_items=sum(1 for i in items if not i.is_qr_bound),
            incomplete_photo_items=sum(1 for i in items if not i.is_photo_complete),
            manifest_url=manifest_url,
            generated_at=datetime.now(timezone.utc),
        )

    # ── Read helpers ───────────────────────────────────────────────────

    async def get_item(self, item_id: UUID) -> ItemResponse:
        item = await self._fetch_item(item_id)
        return _to_response(item)

    async def list_items(self, move_id: UUID) -> list[ItemResponse]:
        result = await self.db.execute(
            select(Item)
            .where(Item.move_id == move_id)
            .order_by(Item.created_at)
        )
        return [_to_response(i) for i in result.scalars().all()]

    # ── Private fetchers ───────────────────────────────────────────────

    async def _fetch_item(self, item_id: UUID) -> Item:
        item = await self.db.get(Item, item_id)
        if not item:
            raise NotFoundError(f"Item {item_id} not found.")
        return item

    async def _fetch_move(self, move_id: UUID) -> Move:
        move = await self.db.get(Move, move_id)
        if not move:
            raise NotFoundError(f"Move {move_id} not found.")
        return move
