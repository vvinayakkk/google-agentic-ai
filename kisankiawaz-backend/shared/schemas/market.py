"""Market / mandi price schemas."""

from typing import List, Literal, Optional

from pydantic import BaseModel, Field


class MandiPriceQuery(BaseModel):
    """Query for mandi prices."""

    commodity: Optional[str] = None
    state: Optional[str] = None
    district: Optional[str] = None
    market: Optional[str] = None
    days: int = Field(default=7, ge=1, le=90)
    limit: int = Field(default=50, ge=1, le=500)

    model_config = {"strict": True}


class MandiPriceResponse(BaseModel):
    """Single mandi price record."""

    state: str
    district: str
    market: str
    commodity: str
    variety: str = ""
    grade: str = ""
    arrival_date: str
    min_price: int
    max_price: int
    modal_price: int


class PriceTrendResponse(BaseModel):
    """Price trend for a commodity at a market."""

    commodity: str
    market: str
    state: str
    district: str
    days: int
    avg_modal_price: float
    trend: Literal["UP", "DOWN", "STABLE"]
    price_points: List[dict] = Field(default_factory=list)


class MSPResponse(BaseModel):
    """Minimum Support Price record."""

    year: str = ""
    crop: str
    oilseeds_production_lakh_tonnes: Optional[float] = None
    resource_id: str = ""


class ColdStorageResponse(BaseModel):
    """Cold storage capacity by state."""

    state: str
    available_capacity_mt: Optional[float] = None
    capacity_required_mt: Optional[float] = None


class ReservoirResponse(BaseModel):
    """Reservoir data by state."""

    state: str
    projects_deficiency_pct: Optional[str] = None
    current_storage_pct_of_normal: Optional[str] = None


class MandiDirectoryResponse(BaseModel):
    """Mandi directory entry."""

    name: str
    state: str
    district: str
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    geocode_quality: Optional[str] = None
    source: str = ""


class AdminPriceUpsert(BaseModel):
    """Admin payload for market price create/update."""

    crop_name: str = Field(..., min_length=1, max_length=120)
    mandi_name: str = Field(..., min_length=1, max_length=160)
    state: str = Field(..., min_length=1, max_length=120)
    district: Optional[str] = Field(default=None, max_length=120)
    modal_price: float = Field(..., gt=0)
    min_price: Optional[float] = Field(default=None, ge=0)
    max_price: Optional[float] = Field(default=None, ge=0)
    date: Optional[str] = Field(default=None, max_length=40)
    source: Optional[str] = Field(default=None, max_length=120)

    model_config = {"strict": True, "extra": "forbid"}


class AdminMandiUpsert(BaseModel):
    """Admin payload for mandi create/update."""

    name: str = Field(..., min_length=1, max_length=160)
    state: str = Field(..., min_length=1, max_length=120)
    district: str = Field(..., min_length=1, max_length=120)
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    address: Optional[str] = Field(default=None, max_length=400)
    source: Optional[str] = Field(default=None, max_length=120)

    model_config = {"strict": True, "extra": "forbid"}


class AdminSchemeUpsert(BaseModel):
    """Admin payload for scheme create/update."""

    name: str = Field(..., min_length=1, max_length=180)
    description: str = Field(..., min_length=1, max_length=3000)
    category: Optional[str] = Field(default=None, max_length=120)
    state: Optional[str] = Field(default=None, max_length=120)
    is_active: Optional[bool] = True

    model_config = {"strict": True, "extra": "forbid"}
