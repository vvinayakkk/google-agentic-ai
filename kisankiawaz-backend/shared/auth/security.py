"""JWT creation / verification and bcrypt password helpers."""

from datetime import datetime, timedelta, timezone
from uuid import uuid4

import bcrypt
import jwt

from shared.core.config import get_settings


# ── Password hashing ────────────────────────────────────────────

def hash_password(plain: str) -> str:
    """Return a bcrypt hash of *plain*."""
    return bcrypt.hashpw(plain.encode(), bcrypt.gensalt()).decode()


def verify_password(plain: str, hashed: str) -> bool:
    """Return True if *plain* matches *hashed*."""
    return bcrypt.checkpw(plain.encode(), hashed.encode())


# ── JWT helpers ──────────────────────────────────────────────────

def _build_token(payload: dict, expires_delta: timedelta) -> str:
    settings = get_settings()
    payload["exp"] = datetime.now(timezone.utc) + expires_delta
    return jwt.encode(payload, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)


def create_access_token(user_id: str, role: str) -> str:
    """Create a short-lived access token."""
    settings = get_settings()
    return _build_token(
        {"sub": user_id, "role": role, "type": "access"},
        timedelta(minutes=settings.JWT_EXPIRE_MINUTES),
    )


def create_refresh_token(user_id: str, role: str) -> str:
    """Create a long-lived refresh token."""
    settings = get_settings()
    return _build_token(
        {"sub": user_id, "role": role, "type": "refresh", "jti": str(uuid4())},
        timedelta(days=settings.JWT_REFRESH_EXPIRE_DAYS),
    )


def decode_token(token: str) -> dict:
    """Decode and verify a JWT, returning the payload dict.

    Raises ``jwt.ExpiredSignatureError`` or ``jwt.InvalidTokenError``.
    """
    settings = get_settings()
    return jwt.decode(token, settings.JWT_SECRET, algorithms=[settings.JWT_ALGORITHM])
