"""Global FastAPI exception handler for AppError."""

import logging

from fastapi import Request
from fastapi.responses import JSONResponse

from shared.errors.codes import HttpStatus, ErrorCode
from shared.errors.exceptions import AppError

logger = logging.getLogger("kisankiawaz")


async def global_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    """Convert AppError (and unexpected exceptions) into a consistent JSON response."""
    if isinstance(exc, AppError):
        return JSONResponse(
            status_code=exc.status_code,
            content={
                "error": exc.error_code.value,
                "detail": exc.detail,
            },
            headers=exc.headers,
        )

    logger.exception("Unhandled exception on %s %s", request.method, request.url.path)
    return JSONResponse(
        status_code=HttpStatus.INTERNAL_ERROR,
        content={
            "error": ErrorCode.FIREBASE_ERROR.value,
            "detail": "An unexpected error occurred",
        },
    )
