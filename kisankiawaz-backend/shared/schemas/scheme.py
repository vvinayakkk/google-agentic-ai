"""Government scheme search and response schemas."""

from typing import List, Optional

from pydantic import BaseModel, Field


class SchemeSearchRequest(BaseModel):
    """Semantic search over government schemes."""

    query: str = Field(..., min_length=1, max_length=500, description="Search query")
    state: Optional[str] = Field(default=None, description="Filter by beneficiary state")
    ministry: Optional[str] = Field(default=None, description="Filter by ministry")
    limit: int = Field(default=10, ge=1, le=50)

    model_config = {"strict": True}


class SchemeResponse(BaseModel):
    """Single scheme detail."""

    scheme_id: str
    title: str
    summary: str
    ministry: str
    eligibility: str = ""
    how_to_apply: str = ""
    official_links: List[str] = Field(default_factory=list)
    document_links: List[str] = Field(default_factory=list)
    beneficiary_state: List[str] = Field(default_factory=list)
    categories: List[str] = Field(default_factory=list)
    tags: List[str] = Field(default_factory=list)
    contact_numbers: List[str] = Field(default_factory=list)
    contact_emails: List[str] = Field(default_factory=list)
    required_documents: str = ""
    similarity_score: Optional[float] = None


class SchemeEligibilityRequest(BaseModel):
    """Check eligibility for a specific scheme."""

    scheme_id: str = Field(..., min_length=1)
    farmer_state: Optional[str] = None
    land_size_acres: Optional[float] = None

    model_config = {"strict": True}


class PMFBYResponse(BaseModel):
    """PMFBY (crop insurance) data."""

    year: str
    total_farmer_applications_lakhs: Optional[float] = None
    farmer_premium_crores: Optional[float] = None
    state_premium_crores: Optional[float] = None
    goi_premium_crores: Optional[float] = None
    claims_paid_crores: Optional[float] = None
