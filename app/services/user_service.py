"""
app/services/user_service.py
─────────────────────────────
All business logic for user management.
Endpoints call this; this calls the DB. No SQLAlchemy in endpoints.
"""

from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import ConflictError, NotFoundError, UnauthorizedError
from app.core.security import create_access_token, create_refresh_token, hash_password, verify_password
from app.models.user import User, UserRole
from app.schemas.user import TokenResponse, UserRegisterRequest, UserResponse


class UserService:

    def __init__(self, db: AsyncSession):
        self.db = db

    # ── Registration ───────────────────────────────────────────────────

    async def register(self, payload: UserRegisterRequest) -> UserResponse:
        # Check phone uniqueness
        existing = await self.db.scalar(
            select(User).where(User.phone == payload.phone)
        )
        if existing:
            raise ConflictError("A user with this phone number already exists.")

        # Check email uniqueness if provided
        if payload.email:
            existing_email = await self.db.scalar(
                select(User).where(User.email == payload.email)
            )
            if existing_email:
                raise ConflictError("A user with this email already exists.")

        user = User(
            phone=payload.phone,
            email=payload.email,
            full_name=payload.full_name,
            hashed_password=hash_password(payload.password),
            role=payload.role,
        )
        self.db.add(user)
        await self.db.flush()   # get the UUID without committing
        await self.db.refresh(user)
        return UserResponse.model_validate(user)

    # ── Login ──────────────────────────────────────────────────────────

    async def login(self, phone: str, password: str) -> TokenResponse:
        user = await self.db.scalar(
            select(User).where(User.phone == phone, User.is_active == True)  # noqa: E712
        )
        if not user or not verify_password(password, user.hashed_password):
            raise UnauthorizedError("Invalid phone number or password.")

        access_token = create_access_token(
            subject=str(user.id),
            extra={"role": user.role.value},
        )
        refresh_token = create_refresh_token(subject=str(user.id))

        return TokenResponse(
            access_token=access_token,
            refresh_token=refresh_token,
            user=UserResponse.model_validate(user),
        )

    # ── Lookups ────────────────────────────────────────────────────────

    async def get_by_id(self, user_id: UUID) -> UserResponse:
        user = await self.db.get(User, user_id)
        if not user:
            raise NotFoundError(f"User {user_id} not found.")
        return UserResponse.model_validate(user)
