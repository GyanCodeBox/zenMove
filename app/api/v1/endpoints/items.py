"""
app/api/v1/endpoints/items.py
──────────────────────────────
Item (Digital Twin) endpoints for Phase 1.

Workflow a packer follows:
  POST   /moves/{move_id}/items              → create item record
  POST   /items/{item_id}/bind-qr            → scan sticker onto item
  POST   /items/{item_id}/photos/{type}      → upload open/sealed photo
  GET    /moves/{move_id}/items              → list all items
  GET    /items/{item_id}                    → get single item
  POST   /moves/{move_id}/scan               → scan at load / unload
  GET    /moves/{move_id}/manifest           → generate PDF manifest
"""

from uuid import UUID

from fastapi import APIRouter, File, Form, Header, UploadFile

from app.core.dependencies import CurrentUserID, DBSession
from app.schemas.common import SuccessResponse
from app.schemas.item import (
    ItemCreateRequest,
    ItemResponse,
    ManifestSummary,
    PhotoUploadResponse,
    QRBindRequest,
    ScanEventRequest,
)
from app.services.item_service import ItemService

router = APIRouter(tags=["Items"])


# ── Create item ─────────────────────────────────────────────────────────────

@router.post(
    "/moves/{move_id}/items",
    response_model=SuccessResponse[ItemResponse],
    status_code=201,
    summary="Create a Digital Twin item record for a move",
)
async def create_item(
    move_id: UUID,
    payload: ItemCreateRequest,
    db: DBSession,
    user_id: CurrentUserID,
):
    item = await ItemService(db).create_item(move_id, payload)
    return SuccessResponse(data=item)


# ── List items ──────────────────────────────────────────────────────────────

@router.get(
    "/moves/{move_id}/items",
    response_model=SuccessResponse[list[ItemResponse]],
    summary="List all items for a move",
)
async def list_items(
    move_id: UUID,
    db: DBSession,
    user_id: CurrentUserID,
):
    items = await ItemService(db).list_items(move_id)
    return SuccessResponse(data=items)


# ── Get single item ─────────────────────────────────────────────────────────

@router.get(
    "/items/{item_id}",
    response_model=SuccessResponse[ItemResponse],
    summary="Get a single item by ID",
)
async def get_item(item_id: UUID, db: DBSession, user_id: CurrentUserID):
    item = await ItemService(db).get_item(item_id)
    return SuccessResponse(data=item)


# ── Bind QR sticker ─────────────────────────────────────────────────────────

@router.post(
    "/items/{item_id}/bind-qr",
    response_model=SuccessResponse[ItemResponse],
    summary="Bind a physical QR sticker to an item (packer scans sticker)",
)
async def bind_qr(
    item_id: UUID,
    payload: QRBindRequest,
    db: DBSession,
    user_id: CurrentUserID,
):
    """
    Called when the packer scans a sticker onto a box.
    - Tier 1 (PVC): normal flow.
    - Tier 2 (PAPER): item is automatically flagged is_high_risk = True.
    """
    item = await ItemService(db).bind_qr(item_id, payload)
    return SuccessResponse(data=item)


# ── Upload photo ────────────────────────────────────────────────────────────

@router.post(
    "/items/{item_id}/photos/{photo_type}",
    response_model=SuccessResponse[PhotoUploadResponse],
    summary="Upload open-box or sealed-box photo for an item",
)
async def upload_photo(
    item_id: UUID,
    photo_type: str,              # path param: "open" | "sealed"
    db: DBSession,
    file: UploadFile = File(..., description="JPEG photo of the item"),
    x_photo_hash: str = Header(
        ...,
        alias="X-Photo-Hash",
        description="SHA-256 hash of the file bytes, computed on-device before upload",
    ),
):
    """
    Multipart photo upload with integrity verification.

    The client (packer app) must:
      1. Compute SHA-256 of the file bytes on-device.
      2. Send the hex hash in the `X-Photo-Hash` header.
      3. Upload the file as multipart/form-data.

    The server recomputes the hash and rejects the upload on mismatch.
    This prevents tampered photos from entering the system.
    """
    file_bytes = await file.read()
    result = await ItemService(db).upload_photo(
        item_id=item_id,
        photo_type=photo_type,
        file_bytes=file_bytes,
        client_hash=x_photo_hash,
    )
    return SuccessResponse(data=result)


# ── Scan event (load / unload) ──────────────────────────────────────────────

@router.post(
    "/moves/{move_id}/scan",
    response_model=SuccessResponse[ItemResponse],
    summary="Record a QR scan event at loading or unloading",
)
async def record_scan(
    move_id: UUID,
    payload: ScanEventRequest,
    db: DBSession,
    user_id: CurrentUserID,
):
    """
    The event type (load vs unload) is derived from the move's current status:
      - Move status 'loading'   → marks item as loaded
      - Move status 'delivered' → marks item as unloaded

    This drives the 0% variance metric: every loaded item must be
    scanned again at destination.
    """
    item = await ItemService(db).record_scan_event(move_id, payload.qr_code, payload.condition_post)
    return SuccessResponse(data=item)


# ── Generate manifest ───────────────────────────────────────────────────────

@router.get(
    "/moves/{move_id}/manifest",
    response_model=SuccessResponse[ManifestSummary],
    summary="Generate (or regenerate) the PDF custody manifest",
)
async def generate_manifest(
    move_id: UUID,
    db: DBSession,
    user_id: CurrentUserID,
):
    """
    Generates a signed PDF manifest listing all items, QR codes, conditions,
    and photo integrity hashes. Uploads to S3 and returns a 1-hour signed URL.
    """
    summary = await ItemService(db).generate_manifest(move_id)
    return SuccessResponse(data=summary)
