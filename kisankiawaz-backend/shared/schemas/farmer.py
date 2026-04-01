"""Farmer-profile schemas."""

from typing import Optional

from pydantic import BaseModel, Field


class SavedDocumentEntry(BaseModel):
    """Saved generated document metadata linked to a scheme."""

    scheme_id: str = Field(..., min_length=1, max_length=120)
    scheme_name: str = Field(..., min_length=1, max_length=240)
    session_id: str = Field(..., min_length=1, max_length=120)
    document_url: str = Field(..., min_length=1, max_length=1000)
    generated_at: str = Field(..., min_length=1, max_length=80)

    model_config = {"strict": True}


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
    saved_documents: Optional[list[SavedDocumentEntry]] = Field(default=None)

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
    saved_documents: Optional[list[SavedDocumentEntry]] = Field(default=None)

    model_config = {"strict": True}


class FarmerProfileMePatch(BaseModel):
    """Patch payload for /me lightweight updates (document vault etc.)."""

    saved_documents: list[SavedDocumentEntry] = Field(default_factory=list)

    model_config = {"strict": True}
