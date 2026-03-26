"""Core authentication business logic."""

import random
import uuid
from datetime import datetime, timezone

import jwt as pyjwt

from shared.auth.security import (
    hash_password,
    verify_password,
    create_access_token,
    create_refresh_token,
    decode_token,
)
from shared.core.constants import MongoCollections
from shared.core.config import get_settings
from shared.errors import (
    AppError,
    HttpStatus,
    bad_request,
    unauthorized,
    not_found,
    conflict,
    ErrorCode,
)


_OTP_TTL_SECONDS = 300  # 5 minutes
_OTP_SEND_COOLDOWN_SECONDS = 60
_OTP_MAX_VERIFY_ATTEMPTS = 5
_OTP_LOCKOUT_SECONDS = 600


class AuthService:
    """Static methods for every auth operation."""

    # ── Register ─────────────────────────────────────────────────

    @staticmethod
    async def register(
        db, phone: str, password: str, name: str,
        role: str = "farmer", language: str = "hi", email: str | None = None,
    ) -> dict:
        """Create a new user and return tokens + user payload."""
        # Bloom-filter-style duplicate check (query)
        existing = (
            db.collection(MongoCollections.USERS)
            .where("phone", "==", phone)
            .limit(1)
        )
        docs = [d async for d in existing.stream()]
        if docs:
            raise conflict("Phone number already registered", ErrorCode.AUTH_USER_EXISTS)

        user_id = str(uuid.uuid4())
        now = datetime.now(timezone.utc).isoformat()

        user_doc = {
            "phone": phone,
            "password_hash": hash_password(password),
            "name": name,
            "role": role,
            "language": language,
            "email": email,
            "is_active": True,
            "created_at": now,
            "updated_at": now,
        }

        await db.collection(MongoCollections.USERS).document(user_id).set(user_doc)

        access = create_access_token(user_id, role)
        refresh = create_refresh_token(user_id, role)

        return {
            "access_token": access,
            "refresh_token": refresh,
            "token_type": "bearer",
            "user": {
                "id": user_id,
                "phone": phone,
                "name": name,
                "role": role,
                "email": email,
                "language": language,
                "is_active": True,
                "created_at": now,
            },
        }

    # ── Login ────────────────────────────────────────────────────

    @staticmethod
    async def login(db, phone: str, password: str) -> dict:
        """Verify credentials and return tokens + user payload."""
        query = (
            db.collection(MongoCollections.USERS)
            .where("phone", "==", phone)
            .limit(1)
        )
        docs = [d async for d in query.stream()]
        if not docs:
            raise unauthorized("Invalid phone or password", ErrorCode.AUTH_INVALID_CREDENTIALS)

        doc = docs[0]
        user = doc.to_dict()

        if not verify_password(password, user.get("password_hash", "")):
            raise unauthorized("Invalid phone or password", ErrorCode.AUTH_INVALID_CREDENTIALS)

        access = create_access_token(doc.id, user["role"])
        refresh = create_refresh_token(doc.id, user["role"])

        return {
            "access_token": access,
            "refresh_token": refresh,
            "token_type": "bearer",
            "user": {
                "id": doc.id,
                "phone": user["phone"],
                "name": user.get("name", ""),
                "role": user["role"],
                "email": user.get("email"),
                "language": user.get("language", "hi"),
                "is_active": user.get("is_active", True),
                "created_at": user.get("created_at", ""),
            },
        }

    # ── Refresh ──────────────────────────────────────────────────

    @staticmethod
    async def refresh(db, redis, refresh_token: str) -> dict:
        """Rotate refresh token, issue a new access token, and revoke used refresh jti."""
        try:
            payload = decode_token(refresh_token)
        except pyjwt.ExpiredSignatureError:
            raise unauthorized("Refresh token expired", ErrorCode.AUTH_TOKEN_EXPIRED)
        except pyjwt.InvalidTokenError:
            raise unauthorized("Invalid refresh token", ErrorCode.AUTH_TOKEN_INVALID)

        if payload.get("type") != "refresh":
            raise unauthorized("Invalid token type", ErrorCode.AUTH_TOKEN_INVALID)

        user_id = payload.get("sub", "")
        role = payload.get("role", "")
        jti = payload.get("jti", "")
        if not user_id or not role or not jti:
            raise unauthorized("Invalid refresh token claims", ErrorCode.AUTH_TOKEN_INVALID)

        replay_key = f"auth:refresh:used:{jti}"
        replayed = await redis.get(replay_key)
        if replayed:
            raise unauthorized("Refresh token has already been used", ErrorCode.AUTH_TOKEN_REVOKED)

        collection = (
            MongoCollections.ADMIN_USERS
            if role in {"admin", "super_admin"}
            else MongoCollections.USERS
        )
        doc = await db.collection(collection).document(user_id).get()
        if not doc.exists:
            raise unauthorized("User not found", ErrorCode.AUTH_USER_NOT_FOUND)

        current_user = doc.to_dict()
        if not current_user.get("is_active", False):
            raise unauthorized("Account is deactivated", ErrorCode.AUTH_USER_INACTIVE)

        settings = get_settings()
        ttl_seconds = max(60, int(settings.JWT_REFRESH_EXPIRE_DAYS) * 24 * 60 * 60)
        await redis.set(replay_key, "1", ex=ttl_seconds)

        access = create_access_token(user_id, role)
        refresh = create_refresh_token(user_id, role)
        return {
            "access_token": access,
            "refresh_token": refresh,
            "token_type": "bearer",
        }

    # ── Get user ─────────────────────────────────────────────────

    @staticmethod
    async def get_user(db, user_id: str) -> dict:
        """Fetch a single user document."""
        doc = await db.collection(MongoCollections.USERS).document(user_id).get()
        if not doc.exists:
            raise not_found("User not found", ErrorCode.AUTH_USER_NOT_FOUND)
        user = doc.to_dict()
        user["id"] = doc.id
        user.pop("password_hash", None)
        return user

    # ── Update user ──────────────────────────────────────────────

    @staticmethod
    async def update_user(db, user_id: str, data: dict) -> dict:
        """Update allowed user fields."""
        allowed = {"name", "email", "language"}
        updates = {k: v for k, v in data.items() if k in allowed}
        if not updates:
            raise bad_request("No valid fields to update")
        updates["updated_at"] = datetime.now(timezone.utc).isoformat()
        await db.collection(MongoCollections.USERS).document(user_id).update(updates)
        return await AuthService.get_user(db, user_id)

    # ── Change password ──────────────────────────────────────────

    @staticmethod
    async def change_password(db, user_id: str, old_password: str, new_password: str) -> None:
        """Verify existing password and set a new one."""
        doc = await db.collection(MongoCollections.USERS).document(user_id).get()
        if not doc.exists:
            raise not_found("User not found", ErrorCode.AUTH_USER_NOT_FOUND)

        user = doc.to_dict()
        if not verify_password(old_password, user.get("password_hash", "")):
            raise bad_request("Current password is incorrect", ErrorCode.AUTH_PASSWORD_MISMATCH)

        await db.collection(MongoCollections.USERS).document(user_id).update({
            "password_hash": hash_password(new_password),
            "updated_at": datetime.now(timezone.utc).isoformat(),
        })

    # ── OTP send ─────────────────────────────────────────────────

    @staticmethod
    async def send_otp(redis, phone: str) -> None:
        """Generate a 6-digit OTP and store in Redis with 5-min TTL."""
        lock_key = f"otp:lock:{phone}"
        cooldown_key = f"otp:cooldown:{phone}"

        if await redis.get(lock_key):
            raise AppError(
                status_code=HttpStatus.TOO_MANY_REQUESTS,
                error_code=ErrorCode.RATE_LIMITED,
                detail="Too many OTP attempts. Try again later.",
            )

        if await redis.get(cooldown_key):
            raise AppError(
                status_code=HttpStatus.TOO_MANY_REQUESTS,
                error_code=ErrorCode.RATE_LIMITED,
                detail="OTP recently sent. Please wait before requesting again.",
            )

        otp = f"{random.randint(100000, 999999)}"
        await redis.set(f"otp:{phone}", otp, ex=_OTP_TTL_SECONDS)
        await redis.set(cooldown_key, "1", ex=_OTP_SEND_COOLDOWN_SECONDS)
        await redis.delete(f"otp:attempts:{phone}")

    # ── OTP verify ───────────────────────────────────────────────

    @staticmethod
    async def verify_otp(redis, phone: str, otp: str) -> None:
        """Check that *otp* matches the stored value for *phone*."""
        lock_key = f"otp:lock:{phone}"
        attempts_key = f"otp:attempts:{phone}"
        if await redis.get(lock_key):
            raise AppError(
                status_code=HttpStatus.TOO_MANY_REQUESTS,
                error_code=ErrorCode.RATE_LIMITED,
                detail="OTP verification is temporarily locked. Try again later.",
            )

        stored = await redis.get(f"otp:{phone}")
        if stored is None:
            raise bad_request("OTP expired or not sent", ErrorCode.AUTH_OTP_EXPIRED)
        if stored != otp:
            attempts = await redis.incr(attempts_key)
            if attempts == 1:
                await redis.expire(attempts_key, _OTP_TTL_SECONDS)
            if attempts >= _OTP_MAX_VERIFY_ATTEMPTS:
                await redis.set(lock_key, "1", ex=_OTP_LOCKOUT_SECONDS)
                await redis.delete(f"otp:{phone}")
                await redis.delete(attempts_key)
                raise AppError(
                    status_code=HttpStatus.TOO_MANY_REQUESTS,
                    error_code=ErrorCode.RATE_LIMITED,
                    detail="Too many invalid OTP attempts. Try again later.",
                )
            raise bad_request("Invalid OTP", ErrorCode.AUTH_OTP_INVALID)

        await redis.delete(attempts_key)

    # ── Reset password ───────────────────────────────────────────

    @staticmethod
    async def reset_password(db, redis, phone: str, otp: str, new_password: str) -> None:
        """Verify OTP then update password for user with *phone*."""
        await AuthService.verify_otp(redis, phone, otp)

        query = (
            db.collection(MongoCollections.USERS)
            .where("phone", "==", phone)
            .limit(1)
        )
        docs = [d async for d in query.stream()]
        if not docs:
            raise not_found("User not found", ErrorCode.AUTH_USER_NOT_FOUND)

        await db.collection(MongoCollections.USERS).document(docs[0].id).update({
            "password_hash": hash_password(new_password),
            "updated_at": datetime.now(timezone.utc).isoformat(),
        })

        # Invalidate OTP after successful reset
        await redis.delete(f"otp:{phone}")
