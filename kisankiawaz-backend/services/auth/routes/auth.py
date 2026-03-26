"""Authentication route handlers."""

from fastapi import APIRouter, Depends

from shared.auth.deps import get_current_user
from shared.db.mongodb import get_async_db
from shared.db.redis import get_redis
from shared.errors import HttpStatus
from shared.schemas.auth import (
    RegisterRequest,
    LoginRequest,
    RefreshRequest,
    ChangePasswordRequest,
    OTPRequest,
    OTPVerify,
    ResetPasswordRequest,
    UserUpdateRequest,
)

from services.auth_service import AuthService

router = APIRouter()


@router.post("/register", status_code=HttpStatus.CREATED)
async def register(body: RegisterRequest):
    """Create a new user account."""
    db = get_async_db()
    result = await AuthService.register(
        db=db,
        phone=body.phone,
        password=body.password,
        name=body.name,
        role=body.role,
        language=body.language,
        email=body.email,
    )
    return result


@router.post("/login", status_code=HttpStatus.OK)
async def login(body: LoginRequest):
    """Authenticate with phone + password."""
    db = get_async_db()
    result = await AuthService.login(db=db, phone=body.phone, password=body.password)
    return result


@router.post("/refresh", status_code=HttpStatus.OK)
async def refresh(body: RefreshRequest):
    """Rotate access token using a refresh token."""
    db = get_async_db()
    redis = await get_redis()
    result = await AuthService.refresh(db=db, redis=redis, refresh_token=body.refresh_token)
    return result


@router.get("/me", status_code=HttpStatus.OK)
async def get_me(user: dict = Depends(get_current_user)):
    """Return the authenticated user's profile."""
    db = get_async_db()
    result = await AuthService.get_user(db=db, user_id=user["id"])
    return result


@router.put("/me", status_code=HttpStatus.OK)
async def update_me(data: UserUpdateRequest, user: dict = Depends(get_current_user)):
    """Update the authenticated user's basic info."""
    db = get_async_db()
    result = await AuthService.update_user(
        db=db,
        user_id=user["id"],
        data=data.model_dump(exclude_none=True),
    )
    return result


@router.post("/change-password", status_code=HttpStatus.OK)
async def change_password(
    body: ChangePasswordRequest,
    user: dict = Depends(get_current_user),
):
    """Change the authenticated user's password."""
    db = get_async_db()
    await AuthService.change_password(
        db=db,
        user_id=user["id"],
        old_password=body.current_password,
        new_password=body.new_password,
    )
    return {"detail": "Password changed"}


@router.post("/otp/send", status_code=HttpStatus.OK)
async def send_otp(body: OTPRequest):
    """Send a one-time password to the given phone."""
    redis = await get_redis()
    await AuthService.send_otp(redis=redis, phone=body.phone)
    return {"detail": "OTP sent"}


@router.post("/otp/verify", status_code=HttpStatus.OK)
async def verify_otp(body: OTPVerify):
    """Verify a one-time password."""
    redis = await get_redis()
    await AuthService.verify_otp(redis=redis, phone=body.phone, otp=body.otp)
    return {"detail": "OTP verified"}


@router.post("/reset-password", status_code=HttpStatus.OK)
async def reset_password(body: ResetPasswordRequest):
    """Reset password after OTP verification."""
    db = get_async_db()
    redis = await get_redis()
    await AuthService.reset_password(
        db=db, redis=redis, phone=body.phone, otp=body.otp, new_password=body.new_password
    )
    return {"detail": "Password reset successful"}
