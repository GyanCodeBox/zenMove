"""
app/core/exceptions.py
───────────────────────
Domain-specific exceptions + FastAPI exception handlers.
Centralising here means we never scatter HTTPException across business logic.
"""

from fastapi import FastAPI, Request, status
from fastapi.responses import JSONResponse


# ── Domain Exceptions ──────────────────────────────────────────────────────

class ZenMoveException(Exception):
    """Base for all domain exceptions."""
    status_code: int = status.HTTP_500_INTERNAL_SERVER_ERROR
    detail: str = "An unexpected error occurred."

    def __init__(self, detail: str | None = None):
        self.detail = detail or self.__class__.detail
        super().__init__(self.detail)


class NotFoundError(ZenMoveException):
    status_code = status.HTTP_404_NOT_FOUND
    detail = "Resource not found."


class ConflictError(ZenMoveException):
    status_code = status.HTTP_409_CONFLICT
    detail = "Resource already exists."


class ForbiddenError(ZenMoveException):
    status_code = status.HTTP_403_FORBIDDEN
    detail = "You do not have permission to perform this action."


class UnauthorizedError(ZenMoveException):
    status_code = status.HTTP_401_UNAUTHORIZED
    detail = "Authentication required."


class ValidationError(ZenMoveException):
    status_code = status.HTTP_422_UNPROCESSABLE_ENTITY
    detail = "Validation failed."


class QRAlreadyBoundError(ConflictError):
    detail = "This QR sticker is already bound to another item."


class QRNotFoundError(NotFoundError):
    detail = "QR code not found or not registered to this move."


class MoveNotEditableError(ForbiddenError):
    detail = "This move is no longer in a state that allows edits."


class PhotoIntegrityError(ValidationError):
    detail = "Photo hash mismatch — file may have been tampered with."


# ── FastAPI Exception Handlers ─────────────────────────────────────────────

def _error_response(status_code: int, detail: str) -> JSONResponse:
    return JSONResponse(
        status_code=status_code,
        content={"success": False, "error": {"detail": detail}},
    )


def register_exception_handlers(app: FastAPI) -> None:
    @app.exception_handler(ZenMoveException)
    async def zenmove_exception_handler(
        request: Request, exc: ZenMoveException
    ) -> JSONResponse:
        return _error_response(exc.status_code, exc.detail)

    @app.exception_handler(404)
    async def not_found_handler(request: Request, exc: Exception) -> JSONResponse:
        return _error_response(404, "The requested resource was not found.")

    @app.exception_handler(405)
    async def method_not_allowed_handler(
        request: Request, exc: Exception
    ) -> JSONResponse:
        return _error_response(405, "Method not allowed.")
