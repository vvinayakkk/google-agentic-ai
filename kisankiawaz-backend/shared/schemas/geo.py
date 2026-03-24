"""Geo / PIN code schemas."""

from typing import List, Optional

from pydantic import BaseModel, Field


class PinCodeResponse(BaseModel):
    """PIN code lookup result."""

    pincode: str
    state_name: str = ""
    district_name: str = ""
    subdistrict_name: str = ""
    village_name: str = ""
    state_code: str = ""
    district_code: str = ""
    village_code: str = ""


class VillageSearchRequest(BaseModel):
    """Search for a village by name."""

    query: str = Field(..., min_length=1, max_length=200)
    state: Optional[str] = None
    limit: int = Field(default=10, ge=1, le=50)

    model_config = {"strict": True}


class DistrictListResponse(BaseModel):
    """List of districts in a state."""

    state: str
    districts: List[str] = Field(default_factory=list)


class StateListResponse(BaseModel):
    """List of all states."""

    states: List[str] = Field(default_factory=list)
