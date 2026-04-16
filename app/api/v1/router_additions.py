"""
ADD THESE LINES to your existing app/api/v1/router.py
"""

# Add these imports at the top:
from app.api.v1.endpoints import escrow, eway_bill, disputes

# Add these lines after the existing include_router calls:
api_router.include_router(escrow.router)
api_router.include_router(eway_bill.router)
api_router.include_router(disputes.router)
