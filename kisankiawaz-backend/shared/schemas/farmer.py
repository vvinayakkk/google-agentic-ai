"""Farmer-profile schemas."""

from typing import Optional

from pydantic import BaseModel, Field


class FarmerProfileCreate(BaseModel):
    """Payload for creating a farmer profile."""

    village: str = Field(..., min_length=1, max_length=200, description="Village name")
    district: str = Field(..., min_length=1, max_length=200, description="District")
    state: str = Field(..., min_length=1, max_length=100, description="State")
    pin_code: str = Field(..., min_length=6, max_length=6, description="PIN code")
    land_size_acres: float = Field(..., gt=0, description="Total land in acres")
    soil_type: Optional[str] = Field(default=None, max_length=100)
    irrigation_type: Optional[str] = Field(default=None, max_length=100)
    language: str = Field(default="hi", max_length=5)

    model_config = {"strict": True}


class FarmerProfileUpdate(BaseModel):
    """Partial update for a farmer profile."""

    village: Optional[str] = Field(default=None, min_length=1, max_length=200)
    district: Optional[str] = Field(default=None, min_length=1, max_length=200)
    state: Optional[str] = Field(default=None, min_length=1, max_length=100)
    pin_code: Optional[str] = Field(default=None, min_length=6, max_length=6)
    land_size_acres: Optional[float] = Field(default=None, gt=0)
    soil_type: Optional[str] = Field(default=None, max_length=100)
    irrigation_type: Optional[str] = Field(default=None, max_length=100)
    language: Optional[str] = Field(default=None, max_length=5)

    model_config = {"strict": True}
