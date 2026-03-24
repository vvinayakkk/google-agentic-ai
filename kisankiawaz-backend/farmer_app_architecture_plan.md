# FARMER APP — COMPLETE ARCHITECTURAL REDESIGN PLAN
## Master Prompt for Implementation (Claude Opus 4.6)

---

## CONTEXT & CURRENT STATE

This is a microservices backend for a farmer-facing Flutter app (and upcoming admin website). The system uses:
- **Python FastAPI** for all services
- **Firebase Firestore** as primary database
- **Redis** for caching
- **Qdrant** for vector search
- **Celery** for background tasks (embedding, notifications)
- **NGINX** as API gateway (port 8000)
- **Shared library** at `shared/` for auth, DB, schemas, middleware, patterns

Current services (from NGINX upstream config):
`auth_service`, `farmer_service`, `crop_service`, `market_service`, `equipment_service`, `agent_service`, `voice_service`, `notification_service`

A rich dataset has been ingested from data.gov.in and india.gov.in into CSV files under `scripts/reports/`. The redesign moves all runtime data fetching to Firestore (populated by scripts), with nightly cron refresh from data.gov.in.

---

## SECTION 1 — MICROSERVICES ARCHITECTURE (12 Services)

### Keep & Expand (8 existing → modified)

#### 1. `auth_service`
- **Responsibility**: Registration, login (phone/password), OTP, JWT access + refresh tokens, password change/reset, role-based access (FARMER, ADMIN, SUPER_ADMIN)
- **New additions**: Admin login endpoint, admin role token issuance
- **Routes**: `/api/v1/auth/register`, `/api/v1/auth/login`, `/api/v1/auth/refresh`, `/api/v1/auth/otp/send`, `/api/v1/auth/otp/verify`, `/api/v1/auth/password/change`, `/api/v1/auth/password/reset`, `/api/v1/auth/admin/login`
- **Firestore**: reads/writes `users`, `admin_users`

#### 2. `farmer_service`
- **Responsibility**: Farmer profile CRUD, livestock CRUD, farmer onboarding, profile completeness scoring
- **Routes**: `/api/v1/farmers/profile`, `/api/v1/farmers/livestock`, `/api/v1/farmers/onboarding-status`
- **Firestore**: `farmer_profiles`, `livestock`

#### 3. `crop_service`
- **Responsibility**: Farmer's personal crop records (sow/harvest tracking) + crop reference data (varieties, seasons, production targets, FASAL data, soil health by location)
- **New additions**: Crop calendar advisory (which crops to sow this month in the farmer's district), soil health lookup by state/district, crop yield benchmarks
- **Routes**: `/api/v1/crops/` (CRUD for personal crops), `/api/v1/crops/reference/varieties`, `/api/v1/crops/reference/seasons`, `/api/v1/crops/reference/soil-health`, `/api/v1/crops/advisory/calendar`
- **Firestore**: `crops` (farmer data), `ref_crop_varieties`, `ref_soil_health`, `ref_fasal_data`

#### 4. `market_service`
- **Responsibility**: Mandi price lookup (daily prices from data.gov.in), MSP prices, mandi directory with geocoding, cold storage capacity by state, reservoir levels, vegetable price feeds
- **New additions**: Price trend calculation (7-day / 30-day modal price trend), best-market-to-sell recommendation for a commodity in a region, cold storage availability
- **Routes**: `/api/v1/market/prices`, `/api/v1/market/prices/trend`, `/api/v1/market/msp`, `/api/v1/market/mandis`, `/api/v1/market/mandis/nearby`, `/api/v1/market/cold-storage`, `/api/v1/market/reservoir`
- **Firestore**: `ref_mandi_prices`, `ref_mandi_directory`, `ref_msp_prices`, `ref_cold_storage`, `ref_reservoir_data`
- **Cache**: Redis TTLs for price queries (15 min), mandi directory (24 hr)

#### 5. `equipment_service`
- **Responsibility**: Farmer-owned equipment listings, P2P equipment bookings between farmers, curated rental provider catalog (from scripts), booking management
- **New additions**: Provider catalog endpoint (returns ref_equipment_providers), rental rate comparison, booking status tracking
- **Routes**: `/api/v1/equipment/` (CRUD), `/api/v1/equipment/bookings/`, `/api/v1/equipment/providers/`, `/api/v1/equipment/providers/rates`
- **Firestore**: `equipment`, `equipment_bookings`, `ref_equipment_providers`

#### 6. `agent_service` ← MAJOR EXPANSION
- See Section 3 (Agentic Architecture) for full detail
- **Routes**: `/api/v1/agent/chat`, `/api/v1/agent/chat/history`, `/api/v1/agent/chat/session`, `/api/v1/agent/tools/{tool_name}`
- **Firestore**: `agent_conversations` (with `messages` subcollection)

#### 7. `voice_service`
- **Responsibility**: Real-time voice pipeline (like GPT Live / Gemini Live), STT → agent orchestrator → TTS, WebSocket-based streaming
- **New additions**: Voice session recording metadata, language detection (Hindi, regional), voice-to-text preprocessing for agricultural vocabulary
- **Routes**: `WS /api/v1/voice/stream`, `POST /api/v1/voice/session/start`, `POST /api/v1/voice/session/end`
- **Firestore**: `voice_sessions`

#### 8. `notification_service`
- **Responsibility**: Push notifications (FCM), broadcast to farmer segments, scheduled notifications (price alerts, crop advisory reminders, scheme deadlines)
- **New additions**: Price alert subscriptions (farmer subscribes to get notified when commodity price crosses threshold), scheme deadline reminders
- **Routes**: `/api/v1/notifications/`, `/api/v1/notifications/preferences`, `/api/v1/notifications/alerts/price`, `/api/v1/notifications/broadcast`
- **Firestore**: `notifications`, `notification_preferences`

---

### New Services (4 new)

#### 9. `schemes_service` ← NEW
- **Responsibility**: Government scheme discovery and eligibility matching, PMFBY (crop insurance) data, subsidy information, fertilizer advisories, pesticide advisories
- **Routes**: `/api/v1/schemes/`, `/api/v1/schemes/{id}`, `/api/v1/schemes/search`, `/api/v1/schemes/eligibility-check`, `/api/v1/schemes/pmfby`, `/api/v1/schemes/fertilizer-advisory`, `/api/v1/schemes/pesticide-advisory`
- **Firestore**: `ref_farmer_schemes`, `ref_pmfby_data`, `ref_fertilizer_data`, `ref_pesticide_advisory`
- **Qdrant**: `schemes_index` for semantic search + eligibility matching

#### 10. `geo_service` ← NEW
- **Responsibility**: PIN code master (village/subdistrict/district/state hierarchy), location resolution, geocoding helpers, farmer location enrichment
- **Routes**: `/api/v1/geo/pin/{pincode}`, `/api/v1/geo/village/search`, `/api/v1/geo/district/{state}`, `/api/v1/geo/states`
- **Firestore**: `ref_pin_master`
- **Used by**: farmer_service, market_service, schemes_service for location enrichment

#### 11. `admin_service` ← NEW
- **Responsibility**: All admin-facing APIs for the admin website. Farmer management, reference data management, system configuration, analytics dashboard data, data ingestion monitoring
- **Routes**: See Section 4 (Admin Architecture)
- **Firestore**: `admin_users`, `admin_audit_logs`, `app_config`, `analytics_snapshots`
- **Auth**: Admin JWT only (ADMIN or SUPER_ADMIN role required on all routes)

#### 12. `analytics_service` ← NEW
- **Responsibility**: Pre-computed and real-time analytics. Farmer engagement metrics, agent query analysis, popular commodities/mandis, scheme uptake, daily active users. Powers admin dashboard and internal monitoring.
- **Routes**: `/api/v1/analytics/overview`, `/api/v1/analytics/farmers`, `/api/v1/analytics/agent-queries`, `/api/v1/analytics/market-trends`, `/api/v1/analytics/schemes-usage`
- **Firestore**: `analytics_snapshots`, reads across multiple farmer data collections
- **Note**: Heavy queries use pre-computed snapshots (generated nightly), not live scans

---

### NGINX Update Required

Add new upstream blocks and location routes for:
- `schemes_service` → `/api/v1/schemes/`
- `geo_service` → `/api/v1/geo/`
- `admin_service` → `/api/v1/admin/`
- `analytics_service` → `/api/v1/analytics/`

---

## SECTION 2 — FIRESTORE DATABASE STRUCTURE

### Design Principles
1. All data.gov.in / india.gov.in data lives in `ref_*` collections (populated by scripts, never written by services)
2. All farmer-generated data lives in named collections (no prefix)
3. All admin data lives in `admin_*` collections
4. Services READ from Firestore. They NEVER call external APIs at runtime.
5. Composite indexes on all frequently queried field combinations
6. All `ref_*` docs include `_ingested_at` and `_source_resource_id` for lineage

---

### NAMESPACE A — Reference Data (`ref_*` collections)

#### `ref_mandi_prices`
- **Source**: `data_gov_extraction_snapshots/*.csv` + `legacy_api_feeds/vegetable_api_pulls.csv` + `staging_backfill_data/all_data_gov_rows.csv`
- **Scale**: ~90,000+ rows total
- **Doc ID**: `{state_slug}_{district_slug}_{market_slug}_{commodity_slug}_{arrival_date}` (all lowercase, spaces→underscores)
- **Fields**: `state`, `district`, `market`, `commodity`, `variety`, `grade`, `arrival_date` (ISO string), `min_price` (int), `max_price` (int), `modal_price` (int), `commodity_code`, `resource_id`, `_ingested_at`, `_source_resource_id`
- **Firestore Indexes**: Compound on `[state, district, commodity, arrival_date]`, `[market, commodity, arrival_date]`, `[commodity, arrival_date]`

#### `ref_mandi_directory`
- **Source**: `staging_backfill_data/mandi_master_derived_geocoded.csv` (779 rows, merged from master + geocoded)
- **Doc ID**: `{state_slug}_{district_slug}_{name_slug}`
- **Fields**: `name`, `state`, `district`, `latitude` (float|null), `longitude` (float|null), `geocode_quality` (string|null), `source`, `_ingested_at`
- **Firestore Indexes**: `[state, district]`, `[state]`

#### `ref_msp_prices`
- **Source**: `recovery_pipeline_data/msp/*.csv`
- **Doc ID**: `{year}_{crop_slug}`
- **Fields**: `year`, `crop`, `oilseeds_production_lakh_tonnes`, `resource_id`, `_ingested_at`

#### `ref_farmer_schemes`
- **Source**: `farmer_schemes_data/farmer_schemes_master.csv` (743 rows)
- **Doc ID**: `scheme_{scheme_id}` (from CSV)
- **Fields**: `source`, `scheme_id`, `title`, `summary`, `ministry`, `categories` (array), `beneficiary_state` (array), `tags` (array), `official_links` (array), `document_links` (array), `contact_numbers` (array), `contact_emails` (array), `office_addresses`, `how_to_apply`, `eligibility`, `required_documents`, `faqs`, `_ingested_at`
- **Firestore Indexes**: `[ministry]`, `[beneficiary_state]`, `[categories]`

#### `ref_soil_health`
- **Source**: `staging_backfill_data/4554a3c8...csv` (26,000 rows) + `recovery_pipeline_data/soil_health/`
- **Doc ID**: `{state_slug}_{district_slug}_{year}_{month}`
- **Fields**: `state`, `district`, `date`, `year` (int), `month` (int), `avg_smlvl_at15cm` (float), `agency_name`, `resource_id`, `_ingested_at`
- **Firestore Indexes**: `[state, district, year, month]`, `[state, year]`

#### `ref_equipment_providers`
- **Source**: `master_reference_tables/manual_rental_providers.csv` (15 rows, manually curated)
- **Doc ID**: `{rental_id}`
- **Fields**: `rental_id`, `name`, `category`, `state`, `district`, `rate_hourly` (float), `rate_daily` (float), `unit`, `provider_name`, `provider_phone`, `provider_email`, `provider_address`, `booking_link`, `source`, `last_verified_at`, `is_active` (bool), `_ingested_at`

#### `ref_cold_storage`
- **Source**: `recovery_pipeline_data/cold_storage/`
- **Doc ID**: `{state_slug}`
- **Fields**: `state`, `available_capacity_mt` (float), `capacity_required_mt` (float), `resource_id`, `_ingested_at`

#### `ref_reservoir_data`
- **Source**: `recovery_pipeline_data/reservoir/`
- **Doc ID**: `{state_slug}`
- **Fields**: `state`, `projects_deficiency_pct`, `current_storage_pct_of_normal`, `resource_id`, `_ingested_at`

#### `ref_crop_varieties`
- **Source**: `recovery_pipeline_data/crop_yield_varieties/`
- **Doc ID**: `{crop_slug}_{season_slug}`
- **Fields**: `crop`, `season`, `production_target_2016_17`, `resource_id`, `_ingested_at`

#### `ref_pmfby_data`
- **Source**: `recovery_pipeline_data/pmfby/`
- **Doc ID**: `pmfby_{year}`
- **Fields**: `year`, `total_farmer_applications_lakhs`, `farmer_premium_crores`, `state_premium_crores`, `goi_premium_crores`, `claims_paid_crores`, `resource_id`, `_ingested_at`

#### `ref_fertilizer_data`
- **Source**: `recovery_pipeline_data/fertilizer/`
- **Doc ID**: auto-generated
- **Fields**: raw structured data from fertilizer CSV + `resource_id`, `_ingested_at`

#### `ref_pesticide_advisory`
- **Source**: `recovery_pipeline_data/pesticides/`
- **Doc ID**: `{crop_slug}`
- **Fields**: `crop`, `production_million_tonnes`, `resource_id`, `_ingested_at`

#### `ref_fasal_data`
- **Source**: `recovery_pipeline_data/fasal/`
- **Doc ID**: `{crop_slug}`
- **Fields**: `sl_no`, `crop`, `notified_firkas`, `notified_villages`, `crop_cutting_experiments_firkas`, `crop_cutting_experiments_villages`, `resource_id`, `_ingested_at`

#### `ref_pin_master`
- **Source**: `recovery_pipeline_data/pin_master/` (200 rows — NOTE: this is a sample; use full dataset if available)
- **Doc ID**: `{pincode}_{village_code}`
- **Fields**: `state_code`, `state_name`, `district_code`, `district_name`, `subdistrict_code`, `subdistrict_name`, `village_code`, `village_name`, `pincode`, `_ingested_at`
- **Firestore Indexes**: `[pincode]`, `[state_name, district_name]`, `[district_name]`

#### `ref_data_ingestion_meta`
- **Purpose**: Tracks last successful ingestion per dataset
- **Doc ID**: `{script_name}_{dataset_slug}`
- **Fields**: `script`, `dataset`, `last_run_at`, `row_count`, `status` (success|failure), `error_message` (optional), `output_path`

---

### NAMESPACE B — Farmer Data (user-generated)

#### `users` (existing, unchanged)
Fields: `phone`, `password_hash`, `name`, `role` (FARMER|ADMIN|SUPER_ADMIN), `language`, `is_active`, `created_at`, `updated_at`, `fcm_token`

#### `farmer_profiles` (existing, expanded)
Add: `pin_code`, `geo_resolved` (bool), `geo_state`, `geo_district`, `geo_village`, `profile_completeness_score` (0-100), `preferred_language`

#### `crops` (existing, unchanged)
Fields: `farmer_id`, `name`, `variety`, `season`, `area`, `sowing_date`, `expected_harvest_date`, `status`, `created_at`, `updated_at`

#### `livestock` (existing, unchanged)

#### `equipment` (existing, unchanged)

#### `equipment_bookings` (existing, unchanged)

#### `notifications` (existing, unchanged)

#### `notification_preferences` ← NEW
- **Doc ID**: `{user_id}`
- **Fields**: `user_id`, `price_alerts` (array of `{commodity, market, threshold_price, direction: above|below}`), `scheme_alerts` (bool), `crop_advisories` (bool), `language`, `updated_at`

#### `agent_conversations` ← NEW
- **Doc ID**: `{user_id}_{session_id}`
- **Fields**: `user_id`, `session_id`, `channel` (chat|voice), `created_at`, `last_message_at`, `message_count`, `language`
- **Subcollection `messages`**:
  - **Doc ID**: `{timestamp_ms}_{seq}`
  - **Fields**: `role` (user|assistant|tool), `content`, `agent_used`, `tools_called` (array), `latency_ms`, `timestamp`

#### `voice_sessions` ← NEW
- **Doc ID**: `{session_id}`
- **Fields**: `user_id`, `started_at`, `ended_at`, `duration_seconds`, `transcript_summary`, `language`, `agent_conversation_id`

#### `farmer_feedback` ← NEW
- **Doc ID**: auto
- **Fields**: `user_id`, `type` (agent_response|bug|suggestion), `content`, `rating` (1-5), `created_at`

---

### NAMESPACE C — Admin Data (`admin_*`)

#### `admin_users`
- **Doc ID**: `{admin_id}`
- **Fields**: `admin_id`, `email`, `password_hash`, `name`, `role` (ADMIN|SUPER_ADMIN), `is_active`, `created_at`, `last_login_at`, `created_by`

#### `admin_audit_logs`
- **Doc ID**: auto (timestamp-based)
- **Fields**: `admin_id`, `action` (e.g., `UPDATE_SCHEME`, `SUSPEND_FARMER`, `BULK_NOTIFY`), `target_collection`, `target_doc_id`, `payload_summary`, `ip_address`, `timestamp`
- **TTL**: 90 days (set Firestore TTL policy)

#### `app_config`
- **Doc ID**: `global` (single document)
- **Fields**: `maintenance_mode` (bool), `agent_enabled` (bool), `voice_enabled` (bool), `data_gov_api_keys` (array), `max_price_alert_per_user` (int), `feature_flags` (map), `updated_at`, `updated_by`

#### `analytics_snapshots`
- **Doc ID**: `{date_ISO}` (one per day, generated by cron)
- **Fields**: `date`, `total_farmers`, `new_farmers_today`, `dau`, `agent_queries_today`, `voice_sessions_today`, `top_queried_commodities` (array), `top_queried_schemes` (array), `top_states` (array), `notification_sent_count`, `generated_at`

#### `support_tickets` ← NEW (optional Phase 2)
- **Doc ID**: `ticket_{auto_id}`
- **Fields**: `user_id`, `subject`, `description`, `status` (open|in_progress|resolved), `assigned_to`, `created_at`, `updated_at`

---

## SECTION 3 — QDRANT VECTOR INDEXING PLAN

### Design Principles
- Use `sentence-transformers/paraphrase-multilingual-mpnet-base-v2` (768-dim) for multilingual support (Hindi + English)
- All collections use **Cosine distance**
- All documents carry payload for metadata filtering
- Collections rebuilt nightly by `generate_qdrant_indexes.py`

---

### Collection 1: `schemes_semantic`
- **Purpose**: Semantic search over all 743 government schemes
- **Source**: `ref_farmer_schemes` Firestore collection
- **Text to embed**: `"{title}. {summary}. Eligibility: {eligibility}. Categories: {categories}. Ministry: {ministry}. Tags: {tags}"`
- **Payload fields** (for filtering): `scheme_id`, `ministry`, `beneficiary_state` (array), `categories` (array), `source`
- **Vector count**: ~743
- **Use cases**:
  - "schemes for small farmers in Maharashtra" → filter by beneficiary_state
  - "drought relief subsidy" → pure semantic
  - Eligibility matching: farmer says their land size/income → retrieve matching schemes
- **Index**: HNSW, m=16, ef_construct=100

### Collection 2: `schemes_faq`
- **Purpose**: Instant FAQ answering for specific schemes
- **Source**: Parse `faqs` field from `ref_farmer_schemes` into individual Q&A pairs
- **Text to embed**: `"{question} {answer}"` per FAQ pair
- **Payload**: `scheme_id`, `scheme_title`, `question`
- **Vector count**: ~2000-5000 (estimated FAQ pairs across 743 schemes)
- **Use cases**: "How do I apply for PMKSY?" → retrieve exact FAQ

### Collection 3: `mandi_price_intelligence`
- **Purpose**: Textual summaries of price trends for semantic querying
- **Source**: Aggregated nightly from `ref_mandi_prices`
- **Text to embed**: `"[Commodity: {commodity}] [Market: {market}, {district}, {state}] Recent modal price ₹{modal_price}/quintal. 7-day avg: ₹{7d_avg}. Trend: {UP|DOWN|STABLE}. Best price in region: {market} at ₹{max_modal}."` (one doc per commodity per district)
- **Payload**: `commodity`, `state`, `district`, `modal_price`, `7d_avg`, `trend`, `last_date`
- **Vector count**: ~5000-15000 (unique commodity-district combinations)
- **Use cases**: "Where should I sell my wheat in Punjab?" → retrieve top markets
- **Refresh**: Nightly

### Collection 4: `crop_advisory_kb`
- **Purpose**: Farming knowledge base for crop advisory agent
- **Source**: `shared/services/knowledge_base_service.py` + curated content (need to build this)
- **Text to embed**: Articles/paragraphs about crop management, pest/disease, irrigation, best practices
- **Payload**: `topic`, `crop` (optional), `season` (optional), `language`, `source`
- **Vector count**: Starts at ~500, grows with content additions
- **Use cases**: "How to manage aphids in wheat?", "Best sowing time for kharif cotton in Vidarbha"

### Collection 5: `geo_location_index`
- **Purpose**: Fuzzy location resolution — farmers speak village names that may be misspelled or in regional language
- **Source**: `ref_pin_master` + `ref_mandi_directory`
- **Text to embed**: `"{village_name} {subdistrict_name} {district_name} {state_name} {pincode}"`
- **Payload**: `pincode`, `village_code`, `district_name`, `state_name`
- **Vector count**: ~50,000+ (full PIN master when complete)
- **Use cases**: Voice/text says "Amravati wala mera gaon" → resolve to correct district/state for market queries

### Collection 6: `equipment_semantic`
- **Purpose**: Semantic equipment search across both farmer listings and provider catalog
- **Source**: `equipment` Firestore + `ref_equipment_providers`
- **Text to embed**: `"{name} {type} in {district}, {state}. Rate: ₹{rate_daily}/day. {provider_name}"`
- **Payload**: `equipment_id`, `source` (farmer|provider), `state`, `district`, `type`, `is_active`
- **Vector count**: ~500 initially
- **Refresh**: On every equipment create/update (via Celery task `embed_text`)

---

## SECTION 4 — AGENTIC AI ARCHITECTURE

### Overview
The farmer app provides two interfaces:
1. **Chat interface** (like ChatGPT) — multi-turn conversation, text
2. **Individual tool panels** — dedicated UI for market prices, schemes finder, etc.
3. **Voice interface** (like Gemini Live) — real-time voice with streaming

All three funnel through `agent_service`.

---

### Orchestrator Agent

**File**: `agent_service/orchestrator.py`

**Responsibilities**:
- Receives: `{user_id, session_id, message, farmer_context, language}`
- Runs intent classification (LLM call) → identifies primary domain + sub-intents
- Dispatches to one or more specialist agents
- If multi-domain query → runs agents in parallel → merges responses
- Returns structured response + metadata (which agents were used, tools called)
- Logs everything to `agent_conversations/{user_id}_{session_id}/messages`

**Intent Domains**:
```
MARKET_PRICES, SCHEME_SEARCH, SCHEME_ELIGIBILITY, CROP_ADVISORY, 
EQUIPMENT_RENTAL, SOIL_HEALTH, WEATHER_CONTEXT, KNOWLEDGE_GENERAL,
BOOKING_ACTION, NOTIFICATION_SETUP, PROFILE_UPDATE, SMALLTALK
```

**Farmer Context** (injected into every agent call):
```json
{
  "farmer_id": "...",
  "name": "...",
  "state": "...",
  "district": "...",
  "crops": ["wheat", "cotton"],
  "language": "hi",
  "profile_completeness": 85
}
```

---

### Specialist Agents

#### 1. `MarketAgent`
- **Tools**:
  - `get_mandi_prices(commodity, state, district, days=7)` → hits market_service
  - `get_msp(crop, year)` → hits market_service
  - `get_nearby_mandis(lat, lon, radius_km=50)` → hits market_service
  - `search_price_intelligence(query)` → hits Qdrant `mandi_price_intelligence`
- **System prompt emphasis**: Always give prices in ₹/quintal. Always mention date of price. Recommend best market to sell in farmer's region.

#### 2. `CropAgent`
- **Tools**:
  - `get_crop_calendar(district, state, month)` → hits crop_service
  - `get_soil_health(state, district)` → hits crop_service
  - `get_crop_varieties(crop_name)` → hits crop_service
  - `search_crop_kb(query)` → hits Qdrant `crop_advisory_kb`
  - `get_fasal_data(crop)` → hits crop_service
- **System prompt emphasis**: Ground advice in farmer's specific location and current season. Give practical actionable advice.

#### 3. `SchemeAgent`
- **Tools**:
  - `semantic_search_schemes(query, state=None)` → hits Qdrant `schemes_semantic`
  - `get_scheme_detail(scheme_id)` → hits schemes_service
  - `check_scheme_eligibility(scheme_id, farmer_profile)` → local logic + Qdrant FAQ
  - `get_pmfby_info()` → hits schemes_service
  - `search_scheme_faqs(question, scheme_id=None)` → hits Qdrant `schemes_faq`
- **System prompt emphasis**: Always tell farmer what documents they need. Give contact info. Explain eligibility in simple language.

#### 4. `EquipmentAgent`
- **Tools**:
  - `search_equipment_nearby(type, state, district)` → hits equipment_service + Qdrant
  - `get_rental_providers(state, district)` → hits equipment_service
  - `create_booking(equipment_id, dates, message)` → hits equipment_service (action tool)
  - `get_my_bookings()` → hits equipment_service
- **System prompt emphasis**: Always confirm price before booking. Compare farmer listings vs provider catalog.

#### 5. `WeatherSoilAgent`
- **Tools**:
  - `get_soil_moisture(state, district)` → hits crop_service (ref_soil_health)
  - `get_reservoir_status(state)` → hits market_service (ref_reservoir_data)
  - `get_cold_storage_availability(state)` → hits market_service
- **System prompt emphasis**: Translate data into actionable irrigation/planting advice.

#### 6. `KnowledgeAgent`
- **Tools**:
  - `search_knowledge_base(query)` → hits Qdrant `crop_advisory_kb`
  - `resolve_location(location_text)` → hits Qdrant `geo_location_index` + geo_service
- **System prompt emphasis**: Farmer-friendly language, no jargon, multilingual support.

#### 7. `AdminAgent` (admin portal only, ADMIN role required)
- **Tools**: All analytics endpoints, data freshness checks, farmer count queries
- Not exposed to farmer-facing chat

---

### Voice Pipeline

**File**: `voice_service/pipeline.py`

Flow:
```
Farmer audio (WebSocket stream)
  → STT (Deepgram / Whisper with agricultural vocab)
  → Language detection (Hindi, Marathi, Punjabi, Tamil, etc.)
  → Text → Orchestrator Agent (same as chat)
  → Agent response text
  → TTS (ElevenLabs / Google TTS with regional voice)
  → Audio stream back to farmer
```

Agricultural vocabulary hint file: `voice_service/vocab/agri_terms.txt`
(crop names, mandi names, scheme names — boosts STT accuracy)

---

## SECTION 5 — ADMIN WEBSITE ARCHITECTURE

### Stack
- **Frontend**: React + Next.js (App Router), TailwindCSS, shadcn/ui
- **Backend**: `admin_service` (FastAPI, admin JWT required on all routes)
- **Auth**: Separate admin login — JWT with ADMIN/SUPER_ADMIN role claim
- **Hosting**: Separate from Flutter app (web-only)

---

### Admin Service Routes (`/api/v1/admin/`)

#### Dashboard & Stats
- `GET /stats` — daily overview (farmers, DAU, queries, data freshness)
- `GET /data-freshness` — last ingestion timestamp per ref_ collection

#### Farmer Management
- `GET /farmers` — paginated list with search/filter by state, district, active status
- `GET /farmers/{farmer_id}` — full profile view
- `PUT /farmers/{farmer_id}/status` — activate/suspend
- `GET /farmers/{farmer_id}/conversations` — view agent chat history

#### Reference Data Management
- `GET /data/schemes` — paginated scheme list
- `POST /data/schemes` — add new scheme manually
- `PUT /data/schemes/{scheme_id}` — edit scheme
- `DELETE /data/schemes/{scheme_id}` — soft delete (set is_active=false)
- `GET /data/equipment-providers` — provider list
- `POST /data/equipment-providers` — add provider
- `PUT /data/equipment-providers/{rental_id}` — edit provider
- `GET /data/mandi-prices` — browse price data (paginated, filterable)

#### Data Ingestion Monitoring
- `GET /ingestion/logs` — script run history
- `POST /ingestion/trigger/{script_name}` — manually trigger a script (SUPER_ADMIN only)

#### Analytics
- `GET /analytics/overview?date=...` — daily snapshot
- `GET /analytics/farmers/growth` — farmer growth over time
- `GET /analytics/agent/top-queries` — most asked questions
- `GET /analytics/market/top-commodities` — most queried commodities
- `GET /analytics/schemes/top-viewed` — most viewed schemes

#### System Config
- `GET /config` — read app_config
- `PUT /config` — update config (SUPER_ADMIN only)
- `PUT /config/feature-flags` — toggle features

#### Admin User Management (SUPER_ADMIN only)
- `GET /admins` — list admin users
- `POST /admins` — create new admin
- `PUT /admins/{admin_id}/status` — activate/deactivate admin

---

### Admin Website Pages

| Page | Route | Description |
|------|-------|-------------|
| Dashboard | `/` | KPIs, data freshness, quick stats |
| Farmers | `/farmers` | Farmer list, search, filter |
| Farmer Detail | `/farmers/[id]` | Profile, crops, livestock, chat history |
| Schemes | `/data/schemes` | CRUD for govt schemes |
| Equipment Providers | `/data/providers` | CRUD for rental providers |
| Market Data | `/data/market` | Browse mandi prices, filter by date/state |
| Ingestion Logs | `/data/ingestion` | Script run history, status |
| Analytics | `/analytics` | Charts: growth, queries, commodities |
| Config | `/config` | Feature flags, system settings |
| Admin Users | `/admins` | Manage admin accounts |

---

## SECTION 6 — DATA PIPELINE & SCRIPTS

### Data Flow Architecture
```
data.gov.in / india.gov.in
        ↓  (nightly cron, 2AM IST)
  Python scripts (scripts/data_ingestion/)
        ↓
  CSVs in scripts/reports/  (backup + audit)
        ↓
  Firestore ref_* collections (upsert)
        ↓
  Qdrant re-indexing (generate_qdrant_indexes.py)
        ↓
  analytics_snapshots generation
        ↓
  admin_service data freshness updated
```

**At runtime**: Services query Firestore only. No live data.gov.in calls.

---

### Existing Scripts — Required Updates

Each data ingestion script needs a new final step: **Firestore upsert** after CSV write.

Pattern to add to every script:
```python
# After write_csv() call in each script's main():
from shared.db.firebase import get_db, init_firebase
from shared.core.config import get_settings

init_firebase()
db = get_db()

# Upsert rows to Firestore ref_ collection
batch = db.batch()
for i, row in enumerate(rows):
    doc_id = build_doc_id(row)  # deterministic ID
    ref = db.collection("ref_mandi_prices").document(doc_id)
    batch.set(ref, {**row, "_ingested_at": datetime.utcnow().isoformat()}, merge=True)
    if (i + 1) % 500 == 0:  # Firestore batch limit is 500
        batch.commit()
        batch = db.batch()
batch.commit()

# Log ingestion to ref_data_ingestion_meta
db.collection("ref_data_ingestion_meta").document(f"{script_name}_{dataset_slug}").set({
    "script": script_name,
    "dataset": dataset_slug,
    "last_run_at": datetime.utcnow().isoformat(),
    "row_count": len(rows),
    "status": "success"
})
```

Scripts to update with Firestore write:
1. `generate_data_gov_extraction_snapshots.py` → writes `ref_mandi_prices`
2. `generate_farmer_schemes_data.py` → writes `ref_farmer_schemes`
3. `generate_legacy_api_feeds.py` → writes `ref_mandi_directory` (geocoded)
4. `generate_master_reference_tables.py` → writes `ref_mandi_directory`, `ref_equipment_providers`
5. `generate_recovery_pipeline_data.py` → writes `ref_soil_health`, `ref_cold_storage`, `ref_reservoir_data`, `ref_crop_varieties`, `ref_pmfby_data`, `ref_fertilizer_data`, `ref_pesticide_advisory`, `ref_fasal_data`, `ref_pin_master`, `ref_msp_prices`
6. `generate_staging_backfill_data.py` → writes additional `ref_mandi_prices` rows + `ref_mandi_directory`

---

### New Scripts Required

#### `scripts/seed_admin.py` ← NEW
- Creates 2 admin users: 1 SUPER_ADMIN + 1 ADMIN for testing
- Writes to `admin_users` collection
- Output: `scripts/reports/data_assets/audit/seeded_admin_credentials.csv`

```python
# Admin doc structure:
admin_doc = {
    "admin_id": f"admin_{slug}",
    "email": email,
    "password_hash": hash_password(password),
    "name": name,
    "role": "SUPER_ADMIN" | "ADMIN",
    "is_active": True,
    "created_at": now,
    "last_login_at": None,
    "created_by": "seed_script"
}
```

#### `scripts/seed_reference_data.py` ← NEW
- One-time script to populate ALL ref_ collections from existing CSV files (for initial setup / DB rebuild)
- Reads from `scripts/reports/` CSVs
- Writes to all `ref_*` Firestore collections
- Shows progress bar + summary of rows written per collection
- Idempotent (uses merge=True)

#### `scripts/generate_qdrant_indexes.py` ← NEW
- Reads from Firestore ref_ collections
- Builds/rebuilds all 6 Qdrant collections
- Uses Celery task `embed_batch` for parallelism OR runs synchronously with batch embedding
- Collections to build: `schemes_semantic`, `schemes_faq`, `mandi_price_intelligence`, `crop_advisory_kb`, `geo_location_index`, `equipment_semantic`
- Logs to `ref_data_ingestion_meta` with collection name as dataset

#### `scripts/generate_analytics_snapshots.py` ← NEW
- Runs nightly, generates one doc per day in `analytics_snapshots`
- Counts: total farmers, new today, DAU (from agent_conversations last_message_at), agent queries today, top commodities, top schemes
- Writes to `analytics_snapshots/{date_ISO}`

#### `scripts/setup_cron.sh` ← NEW
```bash
#!/bin/bash
# Install all cron jobs for nightly data refresh

# 2:00 AM IST (20:30 UTC prev day) - Run all data ingestion scripts
30 20 * * * cd /app && python scripts/data_ingestion/generate_data_gov_extraction_snapshots.py >> /var/log/cron_data.log 2>&1
30 20 * * * cd /app && python scripts/data_ingestion/generate_farmer_schemes_data.py >> /var/log/cron_data.log 2>&1
30 20 * * * cd /app && python scripts/data_ingestion/generate_master_reference_tables.py >> /var/log/cron_data.log 2>&1
30 20 * * * cd /app && python scripts/data_ingestion/generate_recovery_pipeline_data.py >> /var/log/cron_data.log 2>&1
30 20 * * * cd /app && python scripts/data_ingestion/generate_legacy_api_feeds.py >> /var/log/cron_data.log 2>&1

# 2:30 AM IST - Rebuild Qdrant indexes (after data refresh)
00 21 * * * cd /app && python scripts/generate_qdrant_indexes.py >> /var/log/cron_qdrant.log 2>&1

# 3:00 AM IST - Generate analytics snapshots
30 21 * * * cd /app && python scripts/generate_analytics_snapshots.py >> /var/log/cron_analytics.log 2>&1
```

---

## SECTION 7 — SHARED LIBRARY UPDATES (`shared/`)

### New Schemas Required

#### `shared/schemas/scheme.py` ← NEW
```python
class SchemeSearchRequest(BaseModel):
    query: str
    state: Optional[str] = None
    ministry: Optional[str] = None
    limit: int = 10

class SchemeResponse(BaseModel):
    scheme_id: str
    title: str
    summary: str
    ministry: str
    eligibility: str
    how_to_apply: str
    official_links: List[str]
    beneficiary_state: List[str]
    tags: List[str]
    similarity_score: Optional[float] = None
```

#### `shared/schemas/market.py` ← NEW
```python
class MandiPriceResponse(BaseModel):
    state: str
    district: str
    market: str
    commodity: str
    variety: str
    arrival_date: str
    min_price: int
    max_price: int
    modal_price: int

class PriceTrendResponse(BaseModel):
    commodity: str
    market: str
    days: int
    avg_modal_price: float
    trend: Literal["UP", "DOWN", "STABLE"]
    price_points: List[dict]
```

#### `shared/schemas/agent.py` ← NEW
```python
class ChatRequest(BaseModel):
    message: str
    session_id: Optional[str] = None
    language: Optional[str] = "hi"

class ChatResponse(BaseModel):
    session_id: str
    message: str
    agents_used: List[str]
    tools_called: List[str]
    latency_ms: int

class AgentTool(BaseModel):
    name: str
    description: str
    parameters: dict
```

#### `shared/schemas/admin.py` ← NEW
```python
class AdminUserCreate(BaseModel):
    email: EmailStr
    password: str
    name: str
    role: Literal["ADMIN", "SUPER_ADMIN"]

class AppConfigUpdate(BaseModel):
    maintenance_mode: Optional[bool] = None
    agent_enabled: Optional[bool] = None
    voice_enabled: Optional[bool] = None
    feature_flags: Optional[dict] = None
```

### Updated Constants

#### `shared/core/constants.py` — Add new Firestore collection names:
```python
class Firestore:
    # Existing
    USERS = "users"
    FARMER_PROFILES = "farmer_profiles"
    CROPS = "crops"
    LIVESTOCK = "livestock"
    EQUIPMENT = "equipment"
    EQUIPMENT_BOOKINGS = "equipment_bookings"
    NOTIFICATIONS = "notifications"
    
    # New farmer data
    NOTIFICATION_PREFERENCES = "notification_preferences"
    AGENT_CONVERSATIONS = "agent_conversations"
    VOICE_SESSIONS = "voice_sessions"
    FARMER_FEEDBACK = "farmer_feedback"
    
    # New ref data
    REF_MANDI_PRICES = "ref_mandi_prices"
    REF_MANDI_DIRECTORY = "ref_mandi_directory"
    REF_MSP_PRICES = "ref_msp_prices"
    REF_FARMER_SCHEMES = "ref_farmer_schemes"
    REF_SOIL_HEALTH = "ref_soil_health"
    REF_EQUIPMENT_PROVIDERS = "ref_equipment_providers"
    REF_COLD_STORAGE = "ref_cold_storage"
    REF_RESERVOIR_DATA = "ref_reservoir_data"
    REF_CROP_VARIETIES = "ref_crop_varieties"
    REF_PMFBY_DATA = "ref_pmfby_data"
    REF_FERTILIZER_DATA = "ref_fertilizer_data"
    REF_PESTICIDE_ADVISORY = "ref_pesticide_advisory"
    REF_FASAL_DATA = "ref_fasal_data"
    REF_PIN_MASTER = "ref_pin_master"
    REF_DATA_INGESTION_META = "ref_data_ingestion_meta"
    
    # Admin data
    ADMIN_USERS = "admin_users"
    ADMIN_AUDIT_LOGS = "admin_audit_logs"
    APP_CONFIG = "app_config"
    ANALYTICS_SNAPSHOTS = "analytics_snapshots"
    SUPPORT_TICKETS = "support_tickets"

class Qdrant:
    SCHEMES_SEMANTIC = "schemes_semantic"
    SCHEMES_FAQ = "schemes_faq"
    MANDI_PRICE_INTELLIGENCE = "mandi_price_intelligence"
    CROP_ADVISORY_KB = "crop_advisory_kb"
    GEO_LOCATION_INDEX = "geo_location_index"
    EQUIPMENT_SEMANTIC = "equipment_semantic"
    VECTOR_DIM = 768  # paraphrase-multilingual-mpnet-base-v2
```

### New Shared Service

#### `shared/services/qdrant_service.py` ← NEW
```python
class QdrantService:
    def __init__(self): ...
    async def search(self, collection: str, query_text: str, limit: int = 10, filter_payload: dict = None) -> List[ScoredPoint]: ...
    async def upsert(self, collection: str, points: List[PointStruct]) -> None: ...
    async def embed_text(self, text: str) -> List[float]: ...
    async def embed_batch(self, texts: List[str]) -> List[List[float]]: ...
```

---

## SECTION 8 — NGINX UPDATES

Updated `nginx/nginx.conf` upstreams and routes:

```nginx
# New upstreams to add:
upstream schemes_service { server schemes_service:8000; }
upstream geo_service { server geo_service:8000; }
upstream admin_service { server admin_service:8000; }
upstream analytics_service { server analytics_service:8000; }

# New location routes to add:
location /api/v1/schemes/ { proxy_pass http://schemes_service; }
location /api/v1/geo/ { proxy_pass http://geo_service; }
location /api/v1/admin/ { proxy_pass http://admin_service; }
location /api/v1/analytics/ { proxy_pass http://analytics_service; }
```

---

## SECTION 9 — WORKERS UPDATES (`workers/`)

### New Celery Tasks

#### `workers/tasks/data_tasks.py` ← NEW
```python
@celery_app.task(name="refresh_qdrant_collection")
def refresh_qdrant_collection(collection_name: str): ...

@celery_app.task(name="generate_daily_analytics")
def generate_daily_analytics(date_str: str): ...

@celery_app.task(name="process_price_alerts")
def process_price_alerts(): ...
# Checks ref_mandi_prices vs notification_preferences, fires send_notification
```

#### Update `workers/tasks/embedding_tasks.py`
- Add Qdrant collection name as parameter to `embed_batch`
- Support multilingual model (paraphrase-multilingual-mpnet-base-v2)

---

## SECTION 10 — IMPLEMENTATION PRIORITY ORDER

### Phase 1 — Foundation (Do First)
1. Update `shared/core/constants.py` with all new collection names
2. Add new schemas to `shared/schemas/`
3. Create `shared/services/qdrant_service.py`
4. Update all data ingestion scripts with Firestore write step
5. Create `scripts/seed_reference_data.py` and run it
6. Create `scripts/seed_admin.py`
7. Update auth_service for admin login + role handling

### Phase 2 — Core Services
8. Build `schemes_service` (most data-rich new service)
9. Build `geo_service` (needed by other services)
10. Expand `market_service` with Firestore reads
11. Expand `crop_service` with reference data
12. Expand `equipment_service` with provider catalog

### Phase 3 — Intelligence Layer
13. Create `scripts/generate_qdrant_indexes.py`
14. Build `agent_service` orchestrator + all specialist agents
15. Update `voice_service` pipeline
16. Build `analytics_service`

### Phase 4 — Admin
17. Build `admin_service`
18. Build admin website (React/Next.js)

### Phase 5 — Automation
19. Create `scripts/setup_cron.sh`
20. Update NGINX config
21. Add docker-compose entries for new services
22. End-to-end tests for new flows

---

## APPENDIX: KEY DECISIONS RATIONALE

| Decision | Rationale |
|----------|-----------|
| Services read Firestore, not data.gov.in at runtime | Reliability (data.gov.in has 5-10% failure rate), latency (Firestore < 10ms vs 500-2000ms), cost |
| Nightly cron, not real-time sync | Agricultural data (prices, schemes, soil) changes daily at most; nightly is sufficient |
| `ref_` prefix for all reference collections | Clear namespace separation, prevents accidental writes by farmer-facing code |
| Separate `admin_users` collection (not `users`) | Different auth flow, different fields, prevents privilege escalation bugs |
| Multilingual embedding model | Farmers query in Hindi/regional languages; English-only model would fail |
| 12 microservices (not fewer) | Single responsibility, independent deployment, scales per service load |
| PIN master for location resolution | Farmers identify by village+district, not lat/lon; PIN master bridges to geo data |
| Pre-computed analytics snapshots | Admin dashboard must be fast; live aggregation across 50K+ docs is too slow |
| Qdrant for schemes search (not Firestore full-text) | Firestore has no semantic search; scheme eligibility requires understanding intent, not just keyword match |
