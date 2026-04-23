
from fastapi import APIRouter, Response, Query
from app.utils.qr import render_qr_png, generate_qr_id

router = APIRouter(prefix="/qr", tags=["QR Utility"])

@router.get("/generate", summary="Generate a ZenMove formatted QR code PNG")
async def get_generated_qr(
    city: str = Query(..., description="3-letter city code e.g. BLR"),
    serial: int = Query(..., description="Serial number e.g. 1"),
    temp: bool = Query(False, description="Whether this is a Tier 2 temporary paper tag")
):
    """
    Renders a valid ZenMove QR code PNG image.
    You can use this to generate test stickers.
    """
    qr_id = generate_qr_id(city, serial, temp)
    img_bytes = render_qr_png(qr_id)
    
    return Response(content=img_bytes, media_type="image/png")
