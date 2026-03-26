"""Pydantic v2 request / response schemas for all services."""

from shared.schemas.auth import (
    RegisterRequest,
    LoginRequest,
    TokenResponse,
    RefreshRequest,
    ChangePasswordRequest,
    OTPRequest,
    OTPVerify,
    ResetPasswordRequest,
    UserUpdateRequest,
)
from shared.schemas.farmer import FarmerProfileCreate, FarmerProfileUpdate
from shared.schemas.crop import CropCreate, CropUpdate
from shared.schemas.equipment import (
    EquipmentCreate,
    EquipmentUpdate,
    BookingCreate,
    EquipmentRecordCreate,
    EquipmentRecordUpdate,
    RentalRequestCreate,
)
from shared.schemas.livestock import (
    LivestockCreate,
    LivestockUpdate,
    LivestockRecordCreate,
    LivestockRecordUpdate,
)
from shared.schemas.common import PaginationParams, PaginatedResponse, MessageResponse
from shared.schemas.scheme import SchemeSearchRequest, SchemeResponse, SchemeEligibilityRequest, PMFBYResponse
from shared.schemas.market import (
    MandiPriceQuery,
    MandiPriceResponse,
    PriceTrendResponse,
    MSPResponse,
    ColdStorageResponse,
    ReservoirResponse,
    MandiDirectoryResponse,
    AdminPriceUpsert,
    AdminMandiUpsert,
    AdminSchemeUpsert,
)
from shared.schemas.agent import ChatRequest, ChatResponse, AgentTool, ConversationMessage, ConversationSummary
from shared.schemas.admin import (
    AdminLoginRequest,
    AdminUserCreate,
    AdminUserResponse,
    AppConfigUpdate,
    AppConfigResponse,
    FarmerStatusUpdate,
    AnalyticsOverview,
    BulkImportRequest,
    SchemeUpsertRequest,
    ProviderUpsertRequest,
    FeatureFlagsUpdate,
    AuditLogEntry,
    DataFreshnessResponse,
)
from shared.schemas.geo import PinCodeResponse, VillageSearchRequest, DistrictListResponse, StateListResponse
from shared.schemas.notification import PriceAlert, NotificationPreferencesUpdate, NotificationPreferencesResponse, CreateNotificationRequest, BroadcastRequest
from shared.schemas.analytics import MetricPoint, InsightCard, AdminInsightOverview, FarmerInsightSummary

__all__ = [
    # Auth
    "RegisterRequest",
    "LoginRequest",
    "TokenResponse",
    "RefreshRequest",
    "ChangePasswordRequest",
    "OTPRequest",
    "OTPVerify",
    "ResetPasswordRequest",
    "UserUpdateRequest",
    # Farmer
    "FarmerProfileCreate",
    "FarmerProfileUpdate",
    # Crop
    "CropCreate",
    "CropUpdate",
    # Equipment
    "EquipmentCreate",
    "EquipmentUpdate",
    "BookingCreate",
    "EquipmentRecordCreate",
    "EquipmentRecordUpdate",
    "RentalRequestCreate",
    # Livestock
    "LivestockCreate",
    "LivestockUpdate",
    "LivestockRecordCreate",
    "LivestockRecordUpdate",
    # Common
    "PaginationParams",
    "PaginatedResponse",
    "MessageResponse",
    # Scheme
    "SchemeSearchRequest",
    "SchemeResponse",
    "SchemeEligibilityRequest",
    "PMFBYResponse",
    # Market
    "MandiPriceQuery",
    "MandiPriceResponse",
    "PriceTrendResponse",
    "MSPResponse",
    "ColdStorageResponse",
    "ReservoirResponse",
    "MandiDirectoryResponse",
    "AdminPriceUpsert",
    "AdminMandiUpsert",
    "AdminSchemeUpsert",
    # Agent
    "ChatRequest",
    "ChatResponse",
    "AgentTool",
    "ConversationMessage",
    "ConversationSummary",
    # Admin
    "AdminLoginRequest",
    "AdminUserCreate",
    "AdminUserResponse",
    "AppConfigUpdate",
    "AppConfigResponse",
    "FarmerStatusUpdate",
    "AnalyticsOverview",
    "BulkImportRequest",
    "SchemeUpsertRequest",
    "ProviderUpsertRequest",
    "FeatureFlagsUpdate",
    "AuditLogEntry",
    "DataFreshnessResponse",
    # Geo
    "PinCodeResponse",
    "VillageSearchRequest",
    "DistrictListResponse",
    "StateListResponse",
    # Notification
    "PriceAlert",
    "NotificationPreferencesUpdate",
    "NotificationPreferencesResponse",
    "CreateNotificationRequest",
    "BroadcastRequest",
    # Analytics
    "MetricPoint",
    "InsightCard",
    "AdminInsightOverview",
    "FarmerInsightSummary",
]
