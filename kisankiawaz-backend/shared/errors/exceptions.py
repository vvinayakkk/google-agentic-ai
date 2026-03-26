"""Application exception class and convenience factory functions."""

from typing import Optional

from shared.errors.codes import HttpStatus, ErrorCode


class AppError(Exception):
    """Unified application error carrying status, code, and detail."""

    def __init__(
        self,
        status_code: int,
        error_code: ErrorCode,
        detail: str,
        headers: Optional[dict[str, str]] = None,
    ) -> None:
        self.status_code = status_code
        self.error_code = error_code
        self.detail = detail
        self.headers = headers
        super().__init__(detail)


# ── Factory helpers ──────────────────────────────────────────────

def bad_request(detail: str, code: ErrorCode = ErrorCode.VALIDATION_ERROR) -> AppError:
    """Return a 400 Bad Request error."""
    return AppError(HttpStatus.BAD_REQUEST, code, detail)


def unauthorized(detail: str = "Invalid credentials", code: ErrorCode = ErrorCode.AUTH_INVALID_CREDENTIALS) -> AppError:
    """Return a 401 Unauthorized error."""
    return AppError(HttpStatus.UNAUTHORIZED, code, detail)


def forbidden(detail: str = "Forbidden", code: ErrorCode = ErrorCode.AUTH_INSUFFICIENT_PERMISSIONS) -> AppError:
    """Return a 403 Forbidden error."""
    return AppError(HttpStatus.FORBIDDEN, code, detail)


def not_found(detail: str = "Resource not found", code: ErrorCode = ErrorCode.RESOURCE_NOT_FOUND) -> AppError:
    """Return a 404 Not Found error."""
    return AppError(HttpStatus.NOT_FOUND, code, detail)


def conflict(detail: str = "Resource already exists", code: ErrorCode = ErrorCode.RESOURCE_EXISTS) -> AppError:
    """Return a 409 Conflict error."""
    return AppError(HttpStatus.CONFLICT, code, detail)


def internal_error(detail: str = "Internal server error", code: ErrorCode = ErrorCode.INTERNAL_ERROR) -> AppError:
    """Return a 500 Internal Server Error."""
    return AppError(HttpStatus.INTERNAL_ERROR, code, detail)


def service_unavailable(detail: str = "Service temporarily unavailable", code: ErrorCode = ErrorCode.SERVICE_UNAVAILABLE) -> AppError:
    """Return a 503 Service Unavailable error."""
    return AppError(HttpStatus.SERVICE_UNAVAILABLE, code, detail)
