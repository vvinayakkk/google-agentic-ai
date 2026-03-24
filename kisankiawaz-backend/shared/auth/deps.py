"""FastAPI dependency functions for authentication and authorisation."""

import jwt
from fastapi import Depends
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from shared.auth.security import decode_token
from shared.core.constants import MongoCollections, UserRole
from shared.db.mongodb import get_async_db
from shared.errors.codes import ErrorCode
from shared.errors.exceptions import AppError, unauthorized, forbidden

_bearer_scheme = HTTPBearer()


async def get_current_user(
    creds: HTTPAuthorizationCredentials = Depends(_bearer_scheme),
) -> dict:
    """Extract, validate, and return the authenticated user dict.

    The raw token is attached as ``user["_token"]`` so downstream
    services can forward it for inter-service calls.
    """
    token = creds.credentials

    # 1. Decode JWT
    try:
        payload = decode_token(token)
    except jwt.ExpiredSignatureError:
        raise unauthorized("Token has expired", ErrorCode.AUTH_TOKEN_EXPIRED)
    except jwt.InvalidTokenError:
        raise unauthorized("Invalid token", ErrorCode.AUTH_TOKEN_INVALID)

    if payload.get("type") != "access":
        raise unauthorized("Invalid token type", ErrorCode.AUTH_TOKEN_INVALID)

    user_id: str = payload.get("sub", "")
    if not user_id:
        raise unauthorized("Token missing subject", ErrorCode.AUTH_TOKEN_INVALID)

    role: str = payload.get("role", "")

    # 2. Lookup user in appropriate collection
    db = get_async_db()

    if role in (UserRole.ADMIN.value, UserRole.SUPER_ADMIN.value):
        # Admin users live in admin_users collection
        doc = await db.collection(MongoCollections.ADMIN_USERS).document(user_id).get()
        if not doc.exists:
            raise unauthorized("Admin user not found", ErrorCode.AUTH_USER_NOT_FOUND)
        user: dict = doc.to_dict()
        user["id"] = doc.id
    else:
        # Farmer / agent users live in users collection
        doc = await db.collection(MongoCollections.USERS).document(user_id).get()
        if not doc.exists:
            raise unauthorized("User not found", ErrorCode.AUTH_USER_NOT_FOUND)
        user: dict = doc.to_dict()
        user["id"] = doc.id

    # 3. Check active flag
    if not user.get("is_active", False):
        raise AppError(403, ErrorCode.AUTH_USER_INACTIVE, "Account is deactivated")

    # 4. Attach raw token for forwarding
    user["_token"] = token
    return user


async def get_current_farmer(
    user: dict = Depends(get_current_user),
) -> dict:
    """Ensure the authenticated user has the *farmer* role."""
    if user.get("role") != UserRole.FARMER.value:
        raise forbidden("Farmer role required")
    return user


async def get_current_admin(
    user: dict = Depends(get_current_user),
) -> dict:
    """Ensure the authenticated user has ADMIN or SUPER_ADMIN role."""
    role = user.get("role", "")
    if role not in (UserRole.ADMIN.value, UserRole.SUPER_ADMIN.value):
        raise forbidden("Admin role required")
    return user


async def get_current_super_admin(
    user: dict = Depends(get_current_user),
) -> dict:
    """Ensure the authenticated user has SUPER_ADMIN role."""
    if user.get("role") != UserRole.SUPER_ADMIN.value:
        raise forbidden("Super Admin role required")
    return user
