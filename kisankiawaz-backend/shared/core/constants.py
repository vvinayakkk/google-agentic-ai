"""Application-wide constants, collection names, and enums."""

from enum import Enum


# ── Mongo collection names ──────────────────────────────────
class MongoCollections:
    """Mongo collection name constants."""

    # ── Existing farmer data ──
    USERS: str = "users"
    FARMER_PROFILES: str = "farmer_profiles"
    CROPS: str = "crops"
    CROP_CYCLES: str = "crop_cycles"
    LIVESTOCK: str = "livestock"
    MARKET_PRICES: str = "market_prices"
    EQUIPMENT: str = "equipment"
    EQUIPMENT_BOOKINGS: str = "equipment_bookings"
    GOVERNMENT_SCHEMES: str = "government_schemes"
    CALENDAR_EVENTS: str = "calendar_events"
    DOCUMENTS: str = "documents"
    NOTIFICATIONS: str = "notifications"
    CHAT_MESSAGES: str = "chat_messages"
    CHAT_SESSIONS: str = "chat_sessions"
    FEEDBACK: str = "feedback"
    HEALTH_RECORDS: str = "health_records"
    CROP_EXPENSES: str = "crop_expenses"
    MANDIS: str = "mandis"
    WASTE_RECYCLING: str = "waste_recycling"
    AGENT_SESSIONS: str = "agent_sessions"
    AGENT_SESSION_MESSAGES: str = "agent_session_messages"
    DOCUMENT_BUILDER_SESSIONS: str = "document_builder_sessions"
    EQUIPMENT_RENTAL_RATES: str = "equipment_rental_rates"
    PUBLIC_DATA_SYNC_STATE: str = "public_data_sync_state"

    # ── New farmer data ──
    NOTIFICATION_PREFERENCES: str = "notification_preferences"
    AGENT_CONVERSATIONS: str = "agent_conversations"
    VOICE_SESSIONS: str = "voice_sessions"
    FARMER_FEEDBACK: str = "farmer_feedback"

    # ── Reference data (ref_*) — populated by scripts, read-only at runtime ──
    REF_MANDI_PRICES: str = "ref_mandi_prices"
    REF_MANDI_DIRECTORY: str = "ref_mandi_directory"
    REF_MSP_PRICES: str = "ref_msp_prices"
    REF_FARMER_SCHEMES: str = "ref_farmer_schemes"
    REF_SOIL_HEALTH: str = "ref_soil_health"
    REF_EQUIPMENT_PROVIDERS: str = "ref_equipment_providers"
    REF_COLD_STORAGE: str = "ref_cold_storage"
    REF_RESERVOIR_DATA: str = "ref_reservoir_data"
    REF_CROP_VARIETIES: str = "ref_crop_varieties"
    REF_PMFBY_DATA: str = "ref_pmfby_data"
    REF_FERTILIZER_DATA: str = "ref_fertilizer_data"
    REF_PESTICIDE_ADVISORY: str = "ref_pesticide_advisory"
    REF_FASAL_DATA: str = "ref_fasal_data"
    REF_PIN_MASTER: str = "ref_pin_master"
    REF_DATA_INGESTION_META: str = "ref_data_ingestion_meta"
    REF_EQUIPMENT_RATE_HISTORY: str = "ref_equipment_rate_history"

    # ── Admin data ──
    ADMIN_USERS: str = "admin_users"
    ADMIN_AUDIT_LOGS: str = "admin_audit_logs"
    APP_CONFIG: str = "app_config"
    ANALYTICS_SNAPSHOTS: str = "analytics_snapshots"
    SUPPORT_TICKETS: str = "support_tickets"


# Backward-compatible alias for legacy imports.
Collections = MongoCollections


# ── Qdrant collection names ─────────────────────────────────────
class Qdrant:
    """Qdrant vector-collection name constants."""

    # Legacy (kept for backward compat)
    CROP_KNOWLEDGE: str = "crop_knowledge"
    SCHEME_KNOWLEDGE: str = "scheme_knowledge"
    MARKET_KNOWLEDGE: str = "market_knowledge"
    FARMING_GENERAL: str = "farming_general"

    # New multilingual collections
    SCHEMES_SEMANTIC: str = "schemes_semantic"
    SCHEMES_FAQ: str = "schemes_faq"
    MANDI_PRICE_INTELLIGENCE: str = "mandi_price_intelligence"
    CROP_ADVISORY_KB: str = "crop_advisory_kb"
    GEO_LOCATION_INDEX: str = "geo_location_index"
    EQUIPMENT_SEMANTIC: str = "equipment_semantic"

    VECTOR_DIM: int = 768  # paraphrase-multilingual-mpnet-base-v2


# Alias for convenience
QdrantCollections = Qdrant

EMBEDDING_DIM: int = 768  # Updated from 384


# ── Enums ────────────────────────────────────────────────────────
class UserRole(str, Enum):
    """Roles assignable to a user."""

    FARMER = "farmer"
    ADMIN = "admin"
    SUPER_ADMIN = "super_admin"
    AGENT = "agent"


class CropSeason(str, Enum):
    """Indian agricultural seasons."""

    KHARIF = "kharif"
    RABI = "rabi"
    ZAID = "zaid"


# ── Supported languages ─────────────────────────────────────────
SUPPORTED_LANGUAGES: dict[str, str] = {
    "en": "English",
    "hi": "Hindi",
    "mr": "Marathi",
    "ta": "Tamil",
    "te": "Telugu",
    "kn": "Kannada",
    "bn": "Bengali",
    "gu": "Gujarati",
    "pa": "Punjabi",
    "ml": "Malayalam",
}


# ── Pagination defaults ─────────────────────────────────────────
DEFAULT_PAGE: int = 1
DEFAULT_PER_PAGE: int = 20
MAX_PER_PAGE: int = 100
