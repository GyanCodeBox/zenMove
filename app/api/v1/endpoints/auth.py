"""
app/api/v1/endpoints/auth.py
─────────────────────────────
Registration and login endpoints.
"""

from fastapi import APIRouter

from app.core.dependencies import DBSession
from app.schemas.common import SuccessResponse
from app.schemas.user import TokenResponse, UserLoginRequest, UserRegisterRequest, UserResponse
from app.services.user_service import UserService

router = APIRouter(prefix="/auth", tags=["Auth"])


@router.post(
    "/register",
    response_model=SuccessResponse[UserResponse],
    status_code=201,
    summary="Register a new user (customer, packer, driver)",
)
async def register(payload: UserRegisterRequest, db: DBSession):
    user = await UserService(db).register(payload)
    return SuccessResponse(data=user)


@router.post(
    "/login",
    response_model=SuccessResponse[TokenResponse],
    summary="Login and receive JWT tokens",
)
async def login(payload: UserLoginRequest, db: DBSession):
    tokens = await UserService(db).login(payload.phone, payload.password)
    return SuccessResponse(data=tokens)
