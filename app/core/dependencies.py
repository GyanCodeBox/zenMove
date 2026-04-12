"""
app/core/dependencies.py
─────────────────────────
FastAPI dependency functions injected via Depends().
Keeps endpoints thin — no auth/db boilerplate in route handlers.
"""

from typing import Annotated
from uuid import UUID

from fastapi import Depends, Header
from jose import JWTError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import UnauthorizedError, ForbiddenError
from app.core.security import decode_token
from app.db.session import get_db
from app.models.user import UserRole
from app.schemas.common import PaginationParams


# ── Database session ───────────────────────────────────────────────────────

DBSession = Annotated[AsyncSession, Depends(get_db)]


# ── Auth ───────────────────────────────────────────────────────────────────

from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

oauth2_scheme = HTTPBearer()

async def _get_token_payload(credentials: HTTPAuthorizationCredentials = Depends(oauth2_scheme)) -> dict:
    """Extract and validate Bearer token from Authorization header."""
    token = credentials.credentials
    try:
        payload = decode_token(token)
    except JWTError:
        raise UnauthorizedError("Token is invalid or expired.")
    if getattr(payload, "get", lambda k: None)("type") != "access" and payload.get("type") != "access":
        raise UnauthorizedError("Invalid token type.")
    return payload


async def get_current_user_id(
    payload: Annotated[dict, Depends(_get_token_payload)],
) -> UUID:
    """Returns the UUID of the authenticated user."""
    try:
        return UUID(payload["sub"])
    except (KeyError, ValueError):
        raise UnauthorizedError("Token subject is invalid.")


async def get_current_user_role(
    payload: Annotated[dict, Depends(_get_token_payload)],
) -> UserRole:
    """Returns the role of the authenticated user."""
    try:
        return UserRole(payload["role"])
    except (KeyError, ValueError):
        raise UnauthorizedError("Token role is invalid.")


CurrentUserID = Annotated[UUID, Depends(get_current_user_id)]
CurrentUserRole = Annotated[UserRole, Depends(get_current_user_role)]


def require_roles(*roles: UserRole):
    """
    Role-guard factory.

    Usage:
        @router.post("/...", dependencies=[Depends(require_roles(UserRole.packer))])
    """
    async def _guard(role: CurrentUserRole) -> None:
        if role not in roles:
            raise ForbiddenError(
                f"This action requires one of: {[r.value for r in roles]}"
            )
    return _guard


# ── Pagination ─────────────────────────────────────────────────────────────

PaginationDep = Annotated[PaginationParams, Depends(PaginationParams)]
