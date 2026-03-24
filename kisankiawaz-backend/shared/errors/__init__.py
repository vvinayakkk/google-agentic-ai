"""Error handling: status codes, error codes, exceptions, and handlers."""

from shared.errors.codes import HttpStatus, ErrorCode
from shared.errors.exceptions import (
    AppError,
    bad_request,
    unauthorized,
    forbidden,
    not_found,
    conflict,
    internal_error,
    service_unavailable,
)
from shared.errors.handlers import global_exception_handler

__all__ = [
    "HttpStatus",
    "ErrorCode",
    "AppError",
    "bad_request",
    "unauthorized",
    "forbidden",
    "not_found",
    "conflict",
    "internal_error",
    "service_unavailable",
    "global_exception_handler",
]
