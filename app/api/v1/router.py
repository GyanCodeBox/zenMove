"""
app/api/v1/router.py
─────────────────────
Assembles all v1 endpoint routers under /api/v1.
Add new endpoint modules here as they are created.
"""

from fastapi import APIRouter

from app.api.v1.endpoints import auth, items, moves

api_router = APIRouter(prefix="/api/v1")

api_router.include_router(auth.router)
api_router.include_router(moves.router)
api_router.include_router(items.router)
