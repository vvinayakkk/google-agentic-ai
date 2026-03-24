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
from shared.core.constants import Firestore
from shared.errors import (
    bad_request,
    unauthorized,
    not_found,
    conflict,
    ErrorCode,
)


_OTP_TTL_SECONDS = 300  # 5 minutes


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
            db.collection(Firestore.USERS)
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

        await db.collection(Firestore.USERS).document(user_id).set(user_doc)

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
            db.collection(Firestore.USERS)
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
    def refresh(refresh_token: str) -> dict:
        """Issue a new access token from a valid refresh token."""
        try:
            payload = decode_token(refresh_token)
        except pyjwt.ExpiredSignatureError:
            raise unauthorized("Refresh token expired", ErrorCode.AUTH_TOKEN_EXPIRED)
        except pyjwt.InvalidTokenError:
            raise unauthorized("Invalid refresh token", ErrorCode.AUTH_TOKEN_INVALID)

        if payload.get("type") != "refresh":
            raise unauthorized("Invalid token type", ErrorCode.AUTH_TOKEN_INVALID)

        access = create_access_token(payload["sub"], payload["role"])
        return {"access_token": access, "token_type": "bearer"}

    # ── Get user ─────────────────────────────────────────────────

    @staticmethod
    async def get_user(db, user_id: str) -> dict:
        """Fetch a single user document."""
        doc = await db.collection(Firestore.USERS).document(user_id).get()
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
        await db.collection(Firestore.USERS).document(user_id).update(updates)
        return await AuthService.get_user(db, user_id)

    # ── Change password ──────────────────────────────────────────

    @staticmethod
    async def change_password(db, user_id: str, old_password: str, new_password: str) -> None:
        """Verify existing password and set a new one."""
        doc = await db.collection(Firestore.USERS).document(user_id).get()
        if not doc.exists:
            raise not_found("User not found", ErrorCode.AUTH_USER_NOT_FOUND)

        user = doc.to_dict()
        if not verify_password(old_password, user.get("password_hash", "")):
            raise bad_request("Current password is incorrect", ErrorCode.AUTH_PASSWORD_MISMATCH)

        await db.collection(Firestore.USERS).document(user_id).update({
            "password_hash": hash_password(new_password),
            "updated_at": datetime.now(timezone.utc).isoformat(),
        })

    # ── OTP send ─────────────────────────────────────────────────

    @staticmethod
    async def send_otp(redis, phone: str) -> None:
        """Generate a 6-digit OTP and store in Redis with 5-min TTL."""
        otp = f"{random.randint(100000, 999999)}"
        await redis.set(f"otp:{phone}", otp, ex=_OTP_TTL_SECONDS)

    # ── OTP verify ───────────────────────────────────────────────

    @staticmethod
    async def verify_otp(redis, phone: str, otp: str) -> None:
        """Check that *otp* matches the stored value for *phone*."""
        stored = await redis.get(f"otp:{phone}")
        if stored is None:
            raise bad_request("OTP expired or not sent", ErrorCode.AUTH_OTP_EXPIRED)
        if stored != otp:
            raise bad_request("Invalid OTP", ErrorCode.AUTH_OTP_INVALID)

    # ── Reset password ───────────────────────────────────────────

    @staticmethod
    async def reset_password(db, redis, phone: str, otp: str, new_password: str) -> None:
        """Verify OTP then update password for user with *phone*."""
        await AuthService.verify_otp(redis, phone, otp)

        query = (
            db.collection(Firestore.USERS)
            .where("phone", "==", phone)
            .limit(1)
        )
        docs = [d async for d in query.stream()]
        if not docs:
            raise not_found("User not found", ErrorCode.AUTH_USER_NOT_FOUND)

        await db.collection(Firestore.USERS).document(docs[0].id).update({
            "password_hash": hash_password(new_password),
            "updated_at": datetime.now(timezone.utc).isoformat(),
        })

        # Invalidate OTP after successful reset
        await redis.delete(f"otp:{phone}")
