import logging
from fastapi import Request
from fastapi.responses import JSONResponse
from app.exceptions import (
    AppException,
    EmailSendError,
    GuestNotFoundError,
    GuestSelectionNotFoundError,
    MenuItemNotFoundError,
    OrderClosedError,
    OrderNotClosedError,
    OrderNotFoundError,
    ValidationError,
)

logger = logging.getLogger(__name__)

_STATUS_MAP: dict[type, int] = {
    OrderNotFoundError: 404,
    MenuItemNotFoundError: 404,
    GuestNotFoundError: 404,
    GuestSelectionNotFoundError: 404,
    OrderClosedError: 409,
    OrderNotClosedError: 409,
    ValidationError: 422,
    EmailSendError: 502,
}


async def app_exception_handler(request: Request, exc: AppException) -> JSONResponse:
    status_code = _STATUS_MAP.get(type(exc), 500)
    logger.warning(
        "Application exception: code=%s message=%s path=%s",
        exc.code,
        exc.message,
        request.url.path,
    )
    return JSONResponse(
        status_code=status_code,
        content={"error": {"code": exc.code, "message": exc.message}},
    )
