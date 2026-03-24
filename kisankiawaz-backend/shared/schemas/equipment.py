"""Equipment and booking schemas."""

from typing import Optional

from pydantic import BaseModel, Field


class EquipmentCreate(BaseModel):
    """Payload for listing equipment."""

    name: str = Field(..., min_length=1, max_length=200)
    description: Optional[str] = Field(default=None, max_length=1000)
    rate_per_hour: float = Field(..., gt=0)
    available: bool = Field(default=True)

    model_config = {"strict": True}


class EquipmentUpdate(BaseModel):
    """Partial update for equipment."""

    name: Optional[str] = Field(default=None, min_length=1, max_length=200)
    description: Optional[str] = Field(default=None, max_length=1000)
    rate_per_hour: Optional[float] = Field(default=None, gt=0)
    available: Optional[bool] = Field(default=None)

    model_config = {"strict": True}


class BookingCreate(BaseModel):
    """Payload for booking a piece of equipment."""

    equipment_id: str = Field(..., min_length=1)
    start_date: str = Field(..., description="ISO datetime string")
    end_date: str = Field(..., description="ISO datetime string")
    notes: Optional[str] = Field(default=None, max_length=500)

    model_config = {"strict": True}
