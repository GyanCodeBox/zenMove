"""
app/schemas/common.py
──────────────────────
Shared Pydantic models used across multiple schemas.
"""

from typing import Generic, TypeVar
from uuid import UUID

from fastapi import Query
from pydantic import BaseModel, ConfigDict

from app.core.config import get_settings

settings = get_settings()

T = TypeVar("T")


class ZenBaseModel(BaseModel):
    """All response models inherit from this."""
    model_config = ConfigDict(from_attributes=True)


class SuccessResponse(ZenBaseModel, Generic[T]):
    """Standard envelope for all successful API responses."""
    success: bool = True
    data: T


class PaginatedResponse(ZenBaseModel, Generic[T]):
    success: bool = True
    data: list[T]
    total: int
    page: int
    page_size: int
    has_next: bool


class PaginationParams:
    """FastAPI dependency — add to any list endpoint."""
    def __init__(
        self,
        page: int = Query(default=1, ge=1),
        page_size: int = Query(default=None, ge=1),
    ):
        self.page = page
        self.page_size = min(
            page_size or settings.default_page_size,
            settings.max_page_size,
        )

    @property
    def offset(self) -> int:
        return (self.page - 1) * self.page_size
