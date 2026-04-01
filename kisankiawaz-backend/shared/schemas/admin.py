"""Admin-facing schemas."""

from typing import Any, Dict, List, Literal, Optional

from pydantic import BaseModel, EmailStr, Field


class AdminLoginRequest(BaseModel):
    """Admin login with email + password."""

    email: EmailStr
    password: str = Field(..., min_length=6, max_length=128)

    model_config = {"strict": True}


class AdminUserCreate(BaseModel):
    """Create a new admin user (SUPER_ADMIN only)."""

    email: EmailStr
    password: str = Field(..., min_length=6, max_length=128)
    name: str = Field(..., min_length=1, max_length=100)
    role: Literal["admin", "super_admin"] = "admin"

    model_config = {"strict": True}


class AdminUserResponse(BaseModel):
    """Admin user profile (no password)."""

    admin_id: str
    email: str
    name: str
    role: str
    is_active: bool = True
    created_at: str = ""
    last_login_at: Optional[str] = None


class AppConfigUpdate(BaseModel):
    """Update application config (SUPER_ADMIN only)."""

    maintenance_mode: Optional[bool] = None
    agent_enabled: Optional[bool] = None
    voice_enabled: Optional[bool] = None
    feature_flags: Optional[Dict] = None

    model_config = {"strict": True}


class AppConfigResponse(BaseModel):
    """Application config."""

    maintenance_mode: bool = False
    agent_enabled: bool = True
    voice_enabled: bool = True
    max_price_alert_per_user: int = 10
    feature_flags: Dict = Field(default_factory=dict)
    updated_at: str = ""
    updated_by: str = ""


class FarmerStatusUpdate(BaseModel):
    """Activate or suspend a farmer."""

    is_active: bool

    model_config = {"strict": True}


class BulkImportRequest(BaseModel):
    """Bulk import request body for admin data pipelines."""

    input_file: str = Field(..., min_length=3)
    reembed: bool = False

    model_config = {"strict": True}


class AuditLogEntry(BaseModel):
    """Audit log for admin actions."""

    admin_id: str
    action: str
    target_collection: str = ""
    target_doc_id: str = ""
    payload_summary: str = ""
    timestamp: str = ""


class DataFreshnessResponse(BaseModel):
    """Data freshness per collection."""

    collection: str
    last_run_at: Optional[str] = None
    row_count: int = 0
    status: str = ""


class AnalyticsOverview(BaseModel):
    """Daily analytics snapshot."""

    date: str
    total_farmers: int = 0
    new_farmers_today: int = 0
    dau: int = 0
    agent_queries_today: int = 0
    voice_sessions_today: int = 0
    top_queried_commodities: List[str] = Field(default_factory=list)
    top_queried_schemes: List[str] = Field(default_factory=list)
    top_states: List[str] = Field(default_factory=list)
    notification_sent_count: int = 0


class SchemeUpsertRequest(BaseModel):
    """Validated request for admin scheme create/update."""

    scheme_id: Optional[str] = Field(default=None, min_length=1, max_length=120)
    scheme_name: str = Field(..., min_length=2, max_length=240)
    category: Optional[str] = Field(default=None, max_length=120)
    state: Optional[str] = Field(default=None, max_length=120)
    is_active: Optional[bool] = True
    metadata: Dict[str, Any] = Field(default_factory=dict)

    model_config = {"strict": True}


class ProviderUpsertRequest(BaseModel):
    """Validated request for equipment provider create/update."""

    rental_id: Optional[str] = Field(default=None, min_length=1, max_length=120)
    provider_id: Optional[str] = Field(default=None, min_length=1, max_length=120)
    provider_name: Optional[str] = Field(default=None, min_length=2, max_length=240)
    source_type: Optional[str] = Field(default=None, max_length=64)
    source_url: Optional[str] = Field(default=None, max_length=512)
    name: Optional[str] = Field(default=None, min_length=1, max_length=240)
    category: Optional[str] = Field(default=None, max_length=120)
    rate_hourly: Optional[float] = Field(default=None, ge=0)
    rate_daily: Optional[float] = Field(default=None, ge=0)
    rate_per_acre: Optional[float] = Field(default=None, ge=0)
    rate_per_trip: Optional[float] = Field(default=None, ge=0)
    operator_included: Optional[bool] = None
    fuel_extra: Optional[bool] = None
    availability: Optional[str] = Field(default=None, max_length=64)
    season_note: Optional[str] = Field(default=None, max_length=500)
    min_booking_hours: Optional[int] = Field(default=None, ge=0)
    state: Optional[str] = Field(default=None, max_length=120)
    district: Optional[str] = Field(default=None, max_length=120)
    city: Optional[str] = Field(default=None, max_length=120)
    pincode: Optional[str] = Field(default=None, max_length=20)
    address: Optional[str] = Field(default=None, max_length=400)
    service_radius_km: Optional[float] = Field(default=None, ge=0)
    contact_person: Optional[str] = Field(default=None, max_length=120)
    contact_phone: Optional[str] = Field(default=None, max_length=20)
    alternate_phone: Optional[str] = Field(default=None, max_length=20)
    whatsapp: Optional[str] = Field(default=None, max_length=20)
    working_hours: Optional[str] = Field(default=None, max_length=120)
    eligibility: List[str] = Field(default_factory=list)
    documents_required: List[str] = Field(default_factory=list)
    is_active: Optional[bool] = None
    last_verified_at: Optional[str] = Field(default=None, max_length=64)

    model_config = {"strict": False, "extra": "allow"}


class FeatureFlagsUpdate(BaseModel):
    """Typed feature flag update payload."""

    flags: Dict[str, bool] = Field(default_factory=dict)

    model_config = {"strict": True}
