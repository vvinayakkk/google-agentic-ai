"""Notification preference and alert schemas."""

from typing import List, Literal, Optional

from pydantic import BaseModel, Field


class PriceAlert(BaseModel):
    """A single price alert subscription."""

    commodity: str = Field(..., min_length=1, max_length=200)
    market: str = Field(default="", max_length=200)
    threshold_price: float = Field(..., gt=0)
    direction: Literal["above", "below"] = "above"


class NotificationPreferencesUpdate(BaseModel):
    """Update notification preferences for a farmer."""

    price_alerts: Optional[List[PriceAlert]] = None
    scheme_alerts: Optional[bool] = None
    crop_advisories: Optional[bool] = None
    language: Optional[str] = Field(default=None, max_length=5)

    model_config = {"strict": True}


class NotificationPreferencesResponse(BaseModel):
    """Full notification preferences."""

    user_id: str
    price_alerts: List[PriceAlert] = Field(default_factory=list)
    scheme_alerts: bool = True
    crop_advisories: bool = True
    language: str = "hi"
    updated_at: str = ""


class CreateNotificationRequest(BaseModel):
    """Admin request to create a single-user notification."""

    user_id: str = Field(..., min_length=1, max_length=128)
    title: str = Field(..., min_length=1, max_length=200)
    message: str = Field(..., min_length=1, max_length=1000)
    notification_type: str = Field(default="general", alias="type", max_length=64)
    data: dict = Field(default_factory=dict)

    model_config = {"strict": True, "populate_by_name": True}


class BroadcastRequest(BaseModel):
    """Admin broadcast notification."""

    title: str = Field(..., min_length=1, max_length=200)
    message: str = Field(..., min_length=1, max_length=1000)
    role: Optional[str] = Field(default=None, max_length=64)
    target_states: Optional[List[str]] = None
    notification_type: str = Field(default="broadcast", alias="type", max_length=64)

    model_config = {"strict": True, "populate_by_name": True}
