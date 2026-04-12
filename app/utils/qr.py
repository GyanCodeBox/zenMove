"""
app/utils/qr.py
────────────────
QR code ID generation and image rendering.

Design decision (from PRD §4.1 + architectural discussion):
  - The BACKEND assigns the QR ID (server is source of truth).
  - The FRONTEND renders the QR image from that ID (client-side, works offline for Tier 1).
  - For Tier 2 (paper/Xerox), the backend also renders and returns a PNG for PDF export.
  - Pre-printed PVC stickers already have IDs — binding just registers them here.

QR ID Format:
  Tier 1 (PVC):   ZM-2026-BBS-00001     (prefix-year-city-serial)
  Tier 2 (Paper): ZM-2026-BBS-T-00001   (T = temporary)
"""

import hashlib
import io
from datetime import datetime

import qrcode
from qrcode.image.pure import PyPNGImage

from app.core.config import get_settings

settings = get_settings()


def generate_qr_id(city_code: str, serial: int, temporary: bool = False) -> str:
    """
    Produces a formatted QR ID string.

    Args:
        city_code: 3-letter city code (e.g. 'BBS', 'BLR').
        serial: integer serial number within this city+year.
        temporary: True for Tier 2 (paper) tags.

    Returns:
        e.g. 'ZM-2026-BBS-00001' or 'ZM-2026-BBS-T-00001'
    """
    year = datetime.now().year
    city = city_code.strip().upper()
    prefix = settings.qr_id_prefix
    tier_marker = "-T" if temporary else ""
    serial_str = str(serial).zfill(5)
    return f"{prefix}-{year}-{city}{tier_marker}-{serial_str}"


def render_qr_png(qr_id: str, box_size: int = 10, border: int = 4) -> bytes:
    """
    Renders a QR code PNG for the given ID string.
    Used for Tier 2 paper tags (PDF export / WhatsApp to Xerox).

    Args:
        qr_id: The QR ID string (e.g. 'ZM-2026-BBS-T-00001').
        box_size: Pixel size of each QR module.
        border: Number of modules for the quiet zone border.

    Returns:
        PNG image as bytes.
    """
    qr = qrcode.QRCode(
        version=None,                          # auto-size
        error_correction=qrcode.constants.ERROR_CORRECT_H,  # 30% damage tolerance
        box_size=box_size,
        border=border,
    )
    qr.add_data(qr_id)
    qr.make(fit=True)

    img = qr.make_image(image_factory=PyPNGImage)
    buffer = io.BytesIO()
    img.save(buffer)
    return buffer.getvalue()


def hash_file_bytes(data: bytes) -> str:
    """SHA-256 hash of raw file bytes. Stored alongside each photo for tamper detection."""
    return hashlib.sha256(data).hexdigest()


def is_valid_qr_format(qr_code: str) -> bool:
    """
    Lightweight format check before hitting the DB.
    Does not validate existence — just structure.
    """
    parts = qr_code.strip().upper().split("-")
    if len(parts) < 4:
        return False
    if parts[0] != settings.qr_id_prefix:
        return False
    if not parts[1].isdigit() or len(parts[1]) != 4:
        return False
    return True
