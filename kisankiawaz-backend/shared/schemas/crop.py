"""Crop-related schemas."""

from typing import Optional

from pydantic import BaseModel, Field


class CropCreate(BaseModel):
    """Payload for adding a crop."""

    name: str = Field(..., min_length=1, max_length=200, description="Crop name")
    season: str = Field(..., description="kharif / rabi / zaid")
    area_acres: float = Field(..., gt=0)
    sowing_date: Optional[str] = Field(default=None, description="ISO date string")
    expected_harvest_date: Optional[str] = Field(default=None, description="ISO date string")
    variety: Optional[str] = Field(default=None, max_length=200)

    model_config = {"strict": True}


class CropUpdate(BaseModel):
    """Partial update for a crop record."""

    name: Optional[str] = Field(default=None, min_length=1, max_length=200)
    season: Optional[str] = Field(default=None)
    area_acres: Optional[float] = Field(default=None, gt=0)
    sowing_date: Optional[str] = Field(default=None)
    expected_harvest_date: Optional[str] = Field(default=None)
    variety: Optional[str] = Field(default=None, max_length=200)

    model_config = {"strict": True}
