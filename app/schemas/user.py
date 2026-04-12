"""
app/schemas/user.py
────────────────────
Pydantic models for User request/response shapes.
"""

import re
from datetime import datetime
from uuid import UUID

from pydantic import EmailStr, field_validator

from app.models.user import KYCStatus, UserRole
from app.schemas.common import ZenBaseModel


# ── Validators ─────────────────────────────────────────────────────────────

def _validate_indian_phone(v: str) -> str:
    cleaned = re.sub(r"\D", "", v)
    if cleaned.startswith("91") and len(cleaned) == 12:
        cleaned = cleaned[2:]
    if not re.fullmatch(r"[6-9]\d{9}", cleaned):
        raise ValueError("Must be a valid 10-digit Indian mobile number.")
    return cleaned


# ── Request schemas ────────────────────────────────────────────────────────

class UserRegisterRequest(ZenBaseModel):
    phone: str
    full_name: str
    password: str
    role: UserRole = UserRole.customer
    email: EmailStr | None = None

    @field_validator("phone")
    @classmethod
    def validate_phone(cls, v: str) -> str:
        return _validate_indian_phone(v)

    @field_validator("password")
    @classmethod
    def validate_password(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters.")
        return v

    @field_validator("full_name")
    @classmethod
    def validate_name(cls, v: str) -> str:
        v = v.strip()
        if len(v) < 2:
            raise ValueError("Name is too short.")
        return v


class UserLoginRequest(ZenBaseModel):
    phone: str
    password: str

    @field_validator("phone")
    @classmethod
    def validate_phone(cls, v: str) -> str:
        return _validate_indian_phone(v)


# ── Response schemas ───────────────────────────────────────────────────────

class UserResponse(ZenBaseModel):
    id: UUID
    phone: str
    email: str | None
    full_name: str
    role: UserRole
    kyc_status: KYCStatus
    is_active: bool
    created_at: datetime


class TokenResponse(ZenBaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user: UserResponse
