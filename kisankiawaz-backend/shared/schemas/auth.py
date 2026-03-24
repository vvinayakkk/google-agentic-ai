"""Authentication and authorisation request / response schemas."""

from typing import Optional

from pydantic import BaseModel, Field


class RegisterRequest(BaseModel):
    """New user registration payload."""

    phone: str = Field(..., min_length=10, max_length=15, description="Phone number")
    password: str = Field(..., min_length=6, max_length=128, description="Plain-text password")
    name: str = Field(..., min_length=1, max_length=100, description="Full name")
    email: Optional[str] = Field(default=None, description="Optional email")
    role: str = Field(default="farmer", description="User role")
    language: str = Field(default="hi", description="Preferred language code")

    model_config = {"strict": True}


class LoginRequest(BaseModel):
    """Login with phone + password."""

    phone: str = Field(..., min_length=10, max_length=15)
    password: str = Field(..., min_length=1, max_length=128)

    model_config = {"strict": True}


class TokenResponse(BaseModel):
    """JWT token pair returned after authentication."""

    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class RefreshRequest(BaseModel):
    """Refresh-token rotation request."""

    refresh_token: str = Field(..., min_length=1)

    model_config = {"strict": True}


class ChangePasswordRequest(BaseModel):
    """Authenticated password change."""

    current_password: str = Field(..., min_length=1)
    new_password: str = Field(..., min_length=6, max_length=128)

    model_config = {"strict": True}


class OTPRequest(BaseModel):
    """Request an OTP for the given phone number."""

    phone: str = Field(..., min_length=10, max_length=15)

    model_config = {"strict": True}


class OTPVerify(BaseModel):
    """Verify an OTP."""

    phone: str = Field(..., min_length=10, max_length=15)
    otp: str = Field(..., min_length=4, max_length=6)

    model_config = {"strict": True}


class ResetPasswordRequest(BaseModel):
    """Password reset after OTP verification."""

    phone: str = Field(..., min_length=10, max_length=15)
    otp: str = Field(..., min_length=4, max_length=6)
    new_password: str = Field(..., min_length=6, max_length=128)

    model_config = {"strict": True}
