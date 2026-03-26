export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

export const PAGE_KEYS = {
  OVERVIEW: "overview",
  FARMERS: "farmers",
  MARKET: "market",
  SCHEMES: "schemes",
  EQUIPMENT: "equipment",
  ANALYTICS: "analytics",
  AGENT: "agent",
  NOTIFICATIONS: "notifications",
  DATABASE: "database",
  SYSTEM: "system",
  GEO: "geo",
};

export const NAV_ITEMS = [
  { key: PAGE_KEYS.DATABASE, label: "Database Explorer", icon: "Database" },
  { key: PAGE_KEYS.OVERVIEW, label: "Overview", icon: "Home" },
  { key: PAGE_KEYS.FARMERS, label: "Farmers", icon: "User" },
  { key: PAGE_KEYS.MARKET, label: "Market Intelligence", icon: "BarChart2" },
  { key: PAGE_KEYS.SCHEMES, label: "Schemes", icon: "BookOpen" },
  { key: PAGE_KEYS.EQUIPMENT, label: "Equipment & Livestock", icon: "Truck" },
  { key: PAGE_KEYS.ANALYTICS, label: "Analytics", icon: "TrendingUp" },
  { key: PAGE_KEYS.AGENT, label: "Agent System", icon: "Bot" },
  { key: PAGE_KEYS.NOTIFICATIONS, label: "Notifications", icon: "Bell" },
  { key: PAGE_KEYS.SYSTEM, label: "System Config", icon: "Settings" },
  { key: PAGE_KEYS.GEO, label: "Geo Explorer", icon: "Map" },
];

export const INDIAN_STATES = [
  "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh", "Goa",
  "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka", "Kerala",
  "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya", "Mizoram", "Nagaland",
  "Odisha", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana", "Tripura",
  "Uttar Pradesh", "Uttarakhand", "West Bengal", "Andaman and Nicobar Islands",
  "Chandigarh", "Dadra and Nagar Haveli and Daman and Diu", "Delhi", "Jammu and Kashmir",
  "Ladakh", "Lakshadweep", "Puducherry"
];

export const DB_COLLECTIONS = {
  operational: [
    "users", "farmer_profiles", "crops", "crop_cycles", "livestock", "market_prices",
    "mandis", "equipment", "equipment_bookings", "equipment_rental_rates", "notifications",
    "notification_preferences", "agent_conversations", "voice_sessions", "chat_messages",
    "chat_sessions", "documents", "document_builder_sessions", "calendar_events", "feedback",
    "farmer_feedback", "health_records", "crop_expenses"
  ],
  reference: [
    "ref_mandi_prices", "ref_mandi_directory", "ref_msp_prices", "ref_farmer_schemes",
    "ref_equipment_providers", "ref_soil_health", "ref_cold_storage", "ref_reservoir_data",
    "ref_crop_varieties", "ref_pmfby_data", "ref_fertilizer_data", "ref_pesticide_advisory",
    "ref_fasal_data", "ref_pin_master", "ref_data_ingestion_meta"
  ],
  governance: [
    "admin_users", "admin_audit_logs", "app_config", "analytics_snapshots", "support_tickets"
  ],
};

export const MARKET_TABS = [
  "Mandi Prices", "MSP", "Mandis", "Price Trends", "Cold Storage", "Reservoir", "FASAL", "Fertilizer", "Pesticide",
];

export const EQUIPMENT_TABS = ["Equipment", "Livestock", "Rental Requests", "Rental Rates", "Providers"];
export const NOTIFICATION_TABS = ["All Notifications", "Broadcast", "Preferences"];
export const SYSTEM_TABS = ["App Config", "Feature Flags", "Ingestion", "Admin Users", "Audit Log"];

export const SERVICE_HEALTH_DEFAULT = [
  { name: "auth", color: "green" },
  { name: "farmer", color: "green" },
  { name: "crop", color: "green" },
  { name: "market", color: "green" },
  { name: "equipment", color: "green" },
  { name: "agent", color: "green" },
  { name: "voice", color: "green" },
  { name: "notification", color: "green" },
  { name: "schemes", color: "green" },
  { name: "geo", color: "green" },
  { name: "admin", color: "green" },
  { name: "analytics", color: "green" },
];

