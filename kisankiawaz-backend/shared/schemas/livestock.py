"""Livestock schemas."""

from typing import Optional

from pydantic import BaseModel, Field


class LivestockCreate(BaseModel):
    """Payload for registering livestock."""

    animal_type: str = Field(..., min_length=1, max_length=100, description="e.g. cow, buffalo")
    breed: Optional[str] = Field(default=None, max_length=100)
    count: int = Field(..., gt=0)
    age_months: Optional[int] = Field(default=None, ge=0)
    health_status: str = Field(default="healthy", max_length=50)

    model_config = {"strict": True}


class LivestockUpdate(BaseModel):
    """Partial update for livestock."""

    animal_type: Optional[str] = Field(default=None, min_length=1, max_length=100)
    breed: Optional[str] = Field(default=None, max_length=100)
    count: Optional[int] = Field(default=None, gt=0)
    age_months: Optional[int] = Field(default=None, ge=0)
    health_status: Optional[str] = Field(default=None, max_length=50)

    model_config = {"strict": True}
