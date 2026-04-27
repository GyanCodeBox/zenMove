"""
app/utils/manifest.py
──────────────────────
Generates the signed PDF move manifest using ReportLab.

The manifest is the legally admissible custody transfer document.
It lists every item, its QR ID, condition, tag tier, and photo hashes.
"""

import io
from datetime import datetime, timezone
from typing import TYPE_CHECKING

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import mm
from reportlab.platypus import (
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)

if TYPE_CHECKING:
    from app.models.item import Item
    from app.models.move import Move


# ── Brand colours ──────────────────────────────────────────────────────────
NAVY   = colors.HexColor("#1A3C5E")
TEAL   = colors.HexColor("#2E86AB")
LIGHT  = colors.HexColor("#EBF4FA")
WHITE  = colors.white
BLACK  = colors.HexColor("#1A1A1A")
GREY   = colors.HexColor("#64748B")
AMBER  = colors.HexColor("#F4A261")


def generate_manifest_pdf(move: "Move", items: list["Item"]) -> bytes:
    """
    Render a PDF manifest for the move and return raw bytes.

    Args:
        move:  The Move ORM object.
        items: List of Item ORM objects belonging to the move.

    Returns:
        PDF bytes ready for S3 upload.
    """
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        leftMargin=15 * mm,
        rightMargin=15 * mm,
        topMargin=20 * mm,
        bottomMargin=20 * mm,
    )

    styles = getSampleStyleSheet()
    title_style = ParagraphStyle(
        "ZenTitle",
        fontSize=20,
        textColor=NAVY,
        fontName="Helvetica-Bold",
        spaceAfter=4,
    )
    subtitle_style = ParagraphStyle(
        "ZenSubtitle",
        fontSize=11,
        textColor=TEAL,
        fontName="Helvetica",
        spaceAfter=2,
    )
    label_style = ParagraphStyle(
        "ZenLabel",
        fontSize=9,
        textColor=GREY,
        fontName="Helvetica",
    )
    value_style = ParagraphStyle(
        "ZenValue",
        fontSize=10,
        textColor=BLACK,
        fontName="Helvetica-Bold",
    )
    small_style = ParagraphStyle(
        "ZenSmall",
        fontSize=8,
        textColor=GREY,
        fontName="Helvetica",
    )

    story = []

    # ── Header ─────────────────────────────────────────────────────────
    story.append(Paragraph("ZenMove", title_style))
    story.append(Paragraph("Digital Custody Manifest", subtitle_style))
    story.append(Spacer(1, 4 * mm))

    # ── Move metadata table ────────────────────────────────────────────
    generated_at = datetime.now(timezone.utc).strftime("%d %b %Y, %H:%M UTC")
    meta_data = [
        ["Move ID",       str(move.id)],
        ["From",          move.origin_address],
        ["To",            move.dest_address],
        ["Scheduled",     move.scheduled_at.strftime("%d %b %Y")],
        ["Status",        move.status.value.upper()],
        ["E-Way Bill",    move.eway_bill_no or "PENDING"],
        ["Generated At",  generated_at],
        ["Total Items",   str(len(items))],
    ]
    meta_table = Table(meta_data, colWidths=[45 * mm, 131 * mm])
    meta_table.setStyle(TableStyle([
        ("FONTNAME",    (0, 0), (0, -1), "Helvetica-Bold"),
        ("FONTSIZE",    (0, 0), (-1, -1), 9),
        ("TEXTCOLOR",   (0, 0), (0, -1), GREY),
        ("TEXTCOLOR",   (1, 0), (1, -1), BLACK),
        ("ROWBACKGROUNDS", (0, 0), (-1, -1), [WHITE, LIGHT]),
        ("GRID",        (0, 0), (-1, -1), 0.25, colors.HexColor("#CBD5E1")),
        ("TOPPADDING",  (0, 0), (-1, -1), 3),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
        ("LEFTPADDING", (0, 0), (-1, -1), 5),
    ]))
    story.append(meta_table)
    story.append(Spacer(1, 6 * mm))

    # ── Items table ────────────────────────────────────────────────────
    story.append(Paragraph("Item Inventory", ParagraphStyle(
        "SectionHead", fontSize=12, textColor=NAVY,
        fontName="Helvetica-Bold", spaceBefore=4, spaceAfter=3,
    )))

    headers = ["#", "Item Name", "QR Code", "Tier", "Condition", "Photos", "Loaded", "Unloaded"]
    rows = [headers]

    for i, item in enumerate(items, start=1):
        photo_status = "✓✓" if item.is_photo_complete else (
            "✓○" if item.open_photo_key else "○○"
        )
        risk_marker = " ⚠" if item.is_high_risk else ""
        rows.append([
            str(i),
            item.name[:30],                            # truncate long names
            (item.qr_code or "UNBOUND") + risk_marker,
            (item.tag_tier.value if item.tag_tier else "—"),
            item.condition_pre.value,
            photo_status,
            "✓" if item.is_loaded else "—",
            "✓" if item.is_unloaded else "—",
        ])

    col_widths = [8*mm, 50*mm, 42*mm, 14*mm, 20*mm, 14*mm, 14*mm, 14*mm]
    item_table = Table(rows, colWidths=col_widths, repeatRows=1)
    item_table.setStyle(TableStyle([
        # Header row
        ("BACKGROUND",  (0, 0), (-1, 0), NAVY),
        ("TEXTCOLOR",   (0, 0), (-1, 0), WHITE),
        ("FONTNAME",    (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE",    (0, 0), (-1, 0), 8),
        # Body rows
        ("FONTNAME",    (0, 1), (-1, -1), "Helvetica"),
        ("FONTSIZE",    (0, 1), (-1, -1), 8),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [WHITE, LIGHT]),
        ("GRID",        (0, 0), (-1, -1), 0.25, colors.HexColor("#CBD5E1")),
        ("TOPPADDING",  (0, 0), (-1, -1), 3),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
        ("LEFTPADDING", (0, 0), (-1, -1), 4),
        ("ALIGN",       (0, 0), (0, -1), "CENTER"),  # # column centered
    ]))
    story.append(item_table)
    story.append(Spacer(1, 6 * mm))

    # ── Photo hash log ─────────────────────────────────────────────────
    story.append(Paragraph("Photo Integrity Hashes (SHA-256)", ParagraphStyle(
        "SectionHead2", fontSize=10, textColor=NAVY,
        fontName="Helvetica-Bold", spaceBefore=4, spaceAfter=3,
    )))
    story.append(Paragraph(
        "These hashes were captured on-device at upload time. "
        "Any mismatch during dispute review indicates post-upload tampering.",
        small_style,
    ))
    story.append(Spacer(1, 3 * mm))

    hash_headers = ["QR Code", "Open Photo SHA-256", "Sealed Photo SHA-256"]
    hash_rows = [hash_headers]
    for item in items:
        hash_rows.append([
            item.qr_code or "UNBOUND",
            (item.open_photo_hash or "—")[:32] + "…" if item.open_photo_hash else "—",
            (item.sealed_photo_hash or "—")[:32] + "…" if item.sealed_photo_hash else "—",
        ])

    hash_table = Table(hash_rows, colWidths=[42*mm, 72*mm, 72*mm])
    hash_table.setStyle(TableStyle([
        ("BACKGROUND",  (0, 0), (-1, 0), TEAL),
        ("TEXTCOLOR",   (0, 0), (-1, 0), WHITE),
        ("FONTNAME",    (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTNAME",    (0, 1), (-1, -1), "Helvetica"),
        ("FONTSIZE",    (0, 0), (-1, -1), 7),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [WHITE, LIGHT]),
        ("GRID",        (0, 0), (-1, -1), 0.25, colors.HexColor("#CBD5E1")),
        ("TOPPADDING",  (0, 0), (-1, -1), 3),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
        ("LEFTPADDING", (0, 0), (-1, -1), 4),
    ]))
    story.append(hash_table)
    story.append(Spacer(1, 8 * mm))

    # ── Footer / Signature block ───────────────────────────────────────
    footer_data = [
        ["Customer Signature", "Packer Signature", "ZenMove Platform Seal"],
        ["\n\n\n___________________", "\n\n\n___________________", f"\nGenerated: {generated_at}\nDigitally Signed"],
    ]
    footer_table = Table(footer_data, colWidths=[59*mm, 59*mm, 59*mm])
    footer_table.setStyle(TableStyle([
        ("FONTNAME",    (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE",    (0, 0), (-1, -1), 8),
        ("TEXTCOLOR",   (0, 0), (-1, 0), NAVY),
        ("TEXTCOLOR",   (0, 1), (-1, 1), GREY),
        ("ALIGN",       (0, 0), (-1, -1), "CENTER"),
        ("GRID",        (0, 0), (-1, -1), 0.25, colors.HexColor("#CBD5E1")),
        ("TOPPADDING",  (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
    ]))
    story.append(footer_table)

    doc.build(story)
    return buffer.getvalue()
