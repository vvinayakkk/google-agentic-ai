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


class EquipmentRecordCreate(BaseModel):
    """Payload for farmer equipment record create."""

    name: str = Field(..., min_length=1, max_length=200)
    type: str = Field(..., min_length=1, max_length=100)
    status: Optional[str] = Field(default="available", max_length=50)
    rate_per_hour: Optional[float] = Field(default=None, ge=0)
    rate_per_day: Optional[float] = Field(default=None, ge=0)
    location: Optional[str] = Field(default=None, max_length=240)
    contact_phone: Optional[str] = Field(default=None, max_length=20)
    description: Optional[str] = Field(default=None, max_length=1000)

    model_config = {"strict": True, "extra": "forbid"}


class EquipmentRecordUpdate(BaseModel):
    """Payload for farmer equipment record update."""

    name: Optional[str] = Field(default=None, min_length=1, max_length=200)
    type: Optional[str] = Field(default=None, min_length=1, max_length=100)
    status: Optional[str] = Field(default=None, max_length=50)
    rate_per_hour: Optional[float] = Field(default=None, ge=0)
    rate_per_day: Optional[float] = Field(default=None, ge=0)
    location: Optional[str] = Field(default=None, max_length=240)
    contact_phone: Optional[str] = Field(default=None, max_length=20)
    description: Optional[str] = Field(default=None, max_length=1000)

    model_config = {"strict": True, "extra": "forbid"}


class RentalRequestCreate(BaseModel):
    """Payload for equipment rental request create."""

    equipment_id: str = Field(..., min_length=1, max_length=120)
    start_date: str = Field(..., min_length=1, max_length=40)
    end_date: str = Field(..., min_length=1, max_length=40)
    message: Optional[str] = Field(default=None, max_length=500)

    model_config = {"strict": True, "extra": "forbid"}
