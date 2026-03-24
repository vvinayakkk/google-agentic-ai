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
)
from shared.schemas.farmer import FarmerProfileCreate, FarmerProfileUpdate
from shared.schemas.crop import CropCreate, CropUpdate
from shared.schemas.equipment import EquipmentCreate, EquipmentUpdate, BookingCreate
from shared.schemas.livestock import LivestockCreate, LivestockUpdate
from shared.schemas.common import PaginationParams, PaginatedResponse, MessageResponse
from shared.schemas.scheme import SchemeSearchRequest, SchemeResponse, SchemeEligibilityRequest, PMFBYResponse
from shared.schemas.market import MandiPriceQuery, MandiPriceResponse, PriceTrendResponse, MSPResponse, ColdStorageResponse, ReservoirResponse, MandiDirectoryResponse
from shared.schemas.agent import ChatRequest, ChatResponse, ConversationMessage, ConversationSummary
from shared.schemas.admin import AdminLoginRequest, AdminUserCreate, AdminUserResponse, AppConfigUpdate, AppConfigResponse, FarmerStatusUpdate, AnalyticsOverview
from shared.schemas.geo import PinCodeResponse, VillageSearchRequest, DistrictListResponse, StateListResponse
from shared.schemas.notification import PriceAlert, NotificationPreferencesUpdate, NotificationPreferencesResponse, BroadcastRequest

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
    # Livestock
    "LivestockCreate",
    "LivestockUpdate",
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
    # Agent
    "ChatRequest",
    "ChatResponse",
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
    # Geo
    "PinCodeResponse",
    "VillageSearchRequest",
    "DistrictListResponse",
    "StateListResponse",
    # Notification
    "PriceAlert",
    "NotificationPreferencesUpdate",
    "NotificationPreferencesResponse",
    "BroadcastRequest",
]
