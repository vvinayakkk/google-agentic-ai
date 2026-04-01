# KisanKiAwaaz Backend System Detailed Reference

Generated from current source-of-truth code and audits on 2026-03-26.

## 1. Verification Summary

### 1.1 Firestore/Firebase removal verification

Status: runtime migration to MongoDB is complete.

What was verified:
- Shared database adapter is now Mongo-only via `shared/db/mongodb.py` and `shared/db/redis.py`.
- Legacy `shared/db/firebase.py` has been removed.
- Internal error code default is now `INTERNAL_ERROR`, with `FIREBASE_ERROR` kept only as a legacy alias in `shared/errors/codes.py`.
- No Firestore runtime modules remain in service codepaths.

Residual non-runtime references:
- `creds/serviceAccountKey.json` still contains a historical firebase-admin style service account name string. This is credential metadata naming, not an active Firestore integration.

Search confirmation:
- Remaining `firestore|firebase` matches are only in:
  - credentials metadata (`creds/serviceAccountKey.json`)
  - legacy alias enum value (`shared/errors/codes.py`)

### 1.2 .env.example completeness verification

Status: fully refreshed and aligned with current stack.

Template now covers:
- Runtime mode and CORS
- Mongo, Redis, Celery, Qdrant
- JWT and security-sensitive auth parameters
- AI/API providers (Sarvam, Open-Meteo stack, NASA POWER, SoilGrids, Gemini, Groq, data.gov, OpenWeather legacy fallback)
- All service URLs (ports 8001 through 8012)
- Voice latency and timeout tuning knobs
- Test and E2E variables including admin credentials

### 1.3 Shared schema freshness verification

Status: shared schema exports are up to date and include latest additions.

Verified in `shared/schemas/__init__.py`:
- Added and exported new/required models including:
  - `AgentTool`
  - `AuditLogEntry`
  - `DataFreshnessResponse`
  - new typed upsert/import/admin payload models
  - analytics schemas (`MetricPoint`, `InsightCard`, `AdminInsightOverview`, `FarmerInsightSummary`)

## 2. Runtime Architecture

## 2.1 Topology

Gateway pattern:
- Nginx on port 8000 receives all client traffic.
- Prefix-based routing forwards to 12 FastAPI microservices.
- Redis and Qdrant are shared infra dependencies.
- MongoDB is accessed by all data services via shared compat layer.
- Celery worker handles async scheduled/background jobs.

Primary ingress flow:
1. Client calls `gateway:8000`.
2. Nginx routes by `/api/v1/<service-prefix>`.
3. Target service enforces auth, validation, middleware.
4. Service reads/writes Mongo, Redis, optionally Qdrant.
5. Response returns through gateway.

## 2.2 Nginx gateway details

File: `nginx/nginx.conf`

Key behavior:
- Docker DNS resolver set (`127.0.0.11`) for dynamic service-name resolution.
- Request body max: `20M`.
- Rate-limit zones:
  - `auth`: 5 req/s
  - `api`: 30 req/s
  - `admin`: 20 req/s
- Explicit route blocks for all service prefixes:
  - `/api/v1/auth`
  - `/api/v1/farmers`
  - `/api/v1/crops`
  - `/api/v1/market`
  - `/api/v1/equipment`
  - `/api/v1/agent`
  - `/api/v1/voice`
  - `/api/v1/notifications`
  - `/api/v1/schemes`
  - `/api/v1/geo`
  - `/api/v1/admin`
  - `/api/v1/analytics`
- Extended read timeout on agent/voice/analytics routes for heavier responses.

## 2.3 Docker/base layering

Base image:
- `Dockerfile.base` uses `python:3.12-slim`.
- Installs shared system dependency (`curl`) and `requirements-base.txt` once.

Service image pattern:
- Each service Dockerfile uses `FROM kisan-base:latest`.
- Service-specific requirements are installed from `requirements-svc.txt`.
- Service code + shared package are copied into container.
- Healthcheck targets local service health endpoint.

Compose model:
- `docker-compose.yml` is dev/default orchestration.
- `docker-compose.prod.yml` closes service/infrastructure ports except gateway by setting `ports: []` for internal services.

## 3. Service-by-Service Deep Map

Source: `services/info.txt` + route files.

## 3.1 Service inventory

- auth-service (8001): auth lifecycle, JWT, OTP, password workflows.
- farmer-service (8002): farmer profiles and farmer dashboard views.
- crop-service (8003): crop CRUD, crop cycles, disease detection, recommendations.
- market-service (8004): mandi prices, live sync, schemes, aggregated weather intelligence, soil composition, document builder, reference data.
- equipment-service (8005): equipment/livestock CRUD, rentals, rental-rate intelligence.
- agent-service (8006): multi-agent chat/search orchestration, staged prepare/finalize chat flow, and session handling.
- voice-service (8007): STT -> agent -> TTS voice pipeline with latency metadata.
- notification-service (8008): user notifications + preference management.
- schemes-service (8009): scheme search/eligibility and advisory endpoints.
- geo-service (8010): pincode lookup, village search, district/state lists.
- admin-service (8011): admin auth, governance, ingestion control, config, user management.
- analytics-service (8012): deterministic admin/farmer insights and snapshots.

## 3.2 Route scale summary

From `services/info.txt`:
- admin: 26 routes
- agent: 9 routes
- analytics: 16 routes
- auth: 9 routes
- crop: 9 routes
- equipment: 25 routes
- farmer: 7 routes
- geo: 4 routes
- market: 54 routes
- notification: 10 routes
- schemes: 7 routes
- voice: 2 routes

Total detected API routes: 178

## 3.3 Functional responsibility per service

Auth:
- Register/login/refresh/me/update-me/password/OTP/reset.
- Refresh-token replay protection via JTI + Redis lockout semantics.
- Role-aware user resolution (`users` vs `admin_users`).

Farmer:
- Profile create/update/delete for current farmer.
- Admin-readable farmer listing/detail.
- Farmer-specific dashboard assembly.

Crop:
- Farmer-owned crop lifecycle records.
- Static crop cycle reference endpoints.
- Disease detect endpoint and recommendations endpoint.

Market:
- Core market CRUD (admin) for mandis/prices/schemes.
- Live market endpoints (prices, msp, mandi list, sync jobs).
- Document-builder flow (multi-step session + extraction + downloads).
- Aggregated weather intelligence (`/weather/full`) and SoilGrids composition (`/weather/soil-composition`) with district/profile-based coordinate resolution.
- Legacy weather compatibility endpoints (`/weather/city`, `/weather/coords`, `/weather/forecast/*`) plus `/soil-moisture`.
- Read-only ref-data windows (cold storage, reservoir, trends, etc).

Equipment:
- Farmer equipment and livestock CRUD.
- Rental request lifecycle (approve/reject/complete/cancel).
- Rental-rate intelligence with DB-backed provider rows and static fallback.
- Replace-seed endpoint for curated provider dataset ingestion.

Agent:
- Chat orchestration over toolchain and KB search.
- Supports both single-shot chat (`/chat`) and staged chat (`/chat/prepare` then `/chat/finalize`).
- Staged finalize jobs are tracked in a short-lived in-memory request store with TTL cleanup and partial/final merge semantics.
- Session list/detail/delete.
- Key-pool status endpoint guarded for admin visibility.

Voice:
- Text-returning voice command route and base64 TTS route.
- Strict agent-origin response mode, latency telemetry, retry and timeout controls.

Notification:
- Notification listing/read/delete/create/broadcast.
- Preferences read/write endpoints.
- Typed payload validation for create/broadcast operations.

Schemes:
- Search and eligibility checks.
- PMFBY and advisory endpoints.
- Mongo lexical-first, Qdrant fallback logic in schemes service layer.

Geo:
- Pincode decode and village search.
- District/state reference index endpoints.

Admin:
- Platform operations (stats/freshness/config/flags/ingestion triggers).
- Admin user lifecycle.
- Scheme/provider CRUD and bulk import orchestration endpoints.

Analytics:
- Deterministic insight engine across growth/engagement/ops/market/opportunity dimensions.
- Snapshot generation and trend retrieval.
- Farmer summary and benchmark endpoints with access guards.

## 4. Shared Library Deep Structure

Source: `shared/info.txt` and schema source files.

## 4.1 Shared modules

- `shared/auth`: JWT helpers and auth dependency guards.
- `shared/cache`: market cache helpers.
- `shared/core`: settings + constants/enums.
- `shared/db`: Mongo compat abstraction and Redis connectors.
- `shared/errors`: error codes, exception constructors, global handlers.
- `shared/middleware`: logging/security/rate-limiter middleware.
- `shared/patterns`: service client, circuit breaker, bloom filters.
- `shared/schemas`: centralized contracts for all services.
- `shared/services`: key allocator + knowledge base + Qdrant service.

## 4.2 Core constants and system contracts

File: `shared/core/constants.py`

Defines:
- Mongo collection canonical names (`MongoCollections`).
- Qdrant collection canonical names (`Qdrant`).
- embedding dimension (`EMBEDDING_DIM = 768`).
- user roles (`farmer`, `admin`, `super_admin`, `agent`).
- supported language map and pagination defaults.

## 5. Database Structure (Mongo)

Source: `shared/core/constants.py`, routes/services behavior, schema contracts.

## 5.1 Collection families

Operational domain collections:
- `users`, `farmer_profiles`, `crops`, `crop_cycles`, `livestock`
- `market_prices`, `mandis`
- `equipment`, `equipment_bookings`, `equipment_rental_rates`
- `notifications`, `notification_preferences`
- `agent_conversations`, `voice_sessions`, `chat_messages`, `chat_sessions`
- `documents`, `document_builder_sessions`
- `calendar_events`, `feedback`, `farmer_feedback`, `health_records`, `crop_expenses`

Reference data collections (`ref_*`):
- `ref_mandi_prices`, `ref_mandi_directory`, `ref_msp_prices`
- `ref_farmer_schemes`, `ref_equipment_providers`
- `ref_soil_health`, `ref_cold_storage`, `ref_reservoir_data`
- `ref_crop_varieties`, `ref_pmfby_data`
- `ref_fertilizer_data`, `ref_pesticide_advisory`, `ref_fasal_data`
- `ref_pin_master`, `ref_data_ingestion_meta`

Governance and admin collections:
- `admin_users`, `admin_audit_logs`, `app_config`, `analytics_snapshots`, `support_tickets`

## 5.2 Field-level schema contracts by functionality

Note: request/response schemas are contracts; persisted docs can carry additional service metadata fields.

Auth and identity (schemas in `shared/schemas/auth.py`):
- RegisterRequest:
  - `phone:str`, `password:str`, `name:str`, `email?:str`, `role:farmer`, `language:str`
- LoginRequest:
  - `phone:str`, `password:str`
- RefreshRequest:
  - `refresh_token:str`
- ChangePasswordRequest:
  - `current_password:str`, `new_password:str`
- OTPRequest:
  - `phone:str`
- OTPVerify:
  - `phone:str`, `otp:str`
- ResetPasswordRequest:
  - `phone:str`, `otp:str`, `new_password:str`
- UserUpdateRequest:
  - `name?:str`, `email?:str`, `language?:str`

Farmer profile (`shared/schemas/farmer.py`):
- FarmerProfileCreate/Update fields:
  - `village`, `district`, `state`, `pin_code`, `land_size_acres`, `soil_type`, `irrigation_type`, `language`

Crop (`shared/schemas/crop.py`):
- CropCreate/Update fields:
  - `name`, `season`, `area_acres`, `sowing_date`, `expected_harvest_date`, `variety`

Equipment and rental (`shared/schemas/equipment.py`):
- EquipmentCreate/Update:
  - `name`, `description`, `rate_per_hour`, `available`
- EquipmentRecordCreate/Update:
  - `name`, `type`, `status`, `rate_per_hour`, `rate_per_day`, `location`, `contact_phone`, `description`
- BookingCreate:
  - `equipment_id`, `start_date`, `end_date`, `notes`
- RentalRequestCreate:
  - `equipment_id`, `start_date`, `end_date`, `message`

Livestock (`shared/schemas/livestock.py`):
- LivestockCreate/Update:
  - `animal_type`, `breed`, `count`, `age_months`, `health_status`
- LivestockRecordCreate/Update:
  - `type`, `breed`, `count`, `health_status`

Market (`shared/schemas/market.py`):
- Query contract (MandiPriceQuery):
  - `commodity`, `state`, `district`, `market`, `days`, `limit`
- Response contract (MandiPriceResponse):
  - `state`, `district`, `market`, `commodity`, `variety`, `grade`, `arrival_date`, `min_price`, `max_price`, `modal_price`
- Trend contract (PriceTrendResponse):
  - `commodity`, `market`, `state`, `district`, `days`, `avg_modal_price`, `trend`, `price_points`
- Admin upsert contracts:
  - AdminPriceUpsert: `crop_name`, `mandi_name`, `state`, `district`, `modal_price`, `min_price`, `max_price`, `date`, `source`
  - AdminMandiUpsert: `name`, `state`, `district`, `latitude`, `longitude`, `address`, `source`
  - AdminSchemeUpsert: `name`, `description`, `category`, `state`, `is_active`

Schemes (`shared/schemas/scheme.py`):
- SchemeSearchRequest:
  - `query`, `state`, `ministry`, `limit`
- SchemeResponse:
  - `scheme_id`, `title`, `summary`, `ministry`, `eligibility`, `how_to_apply`, `official_links`, `document_links`, `beneficiary_state`, `categories`, `tags`, `contact_numbers`, `contact_emails`, `required_documents`, `similarity_score`
- SchemeEligibilityRequest:
  - `scheme_id`, `farmer_state`, `land_size_acres`

Geo (`shared/schemas/geo.py`):
- VillageSearchRequest:
  - `query`, `state`, `limit`
- PinCodeResponse fields:
  - `pincode`, `state_name`, `district_name`, `subdistrict_name`, `village_name`, `state_code`, `district_code`, `village_code`

Notification (`shared/schemas/notification.py`):
- PriceAlert:
  - `commodity`, `market`, `threshold_price`, `direction`
- NotificationPreferencesUpdate:
  - `price_alerts`, `scheme_alerts`, `crop_advisories`, `language`
- CreateNotificationRequest:
  - `user_id`, `title`, `message`, `type(alias)->notification_type`, `data`
- BroadcastRequest:
  - `title`, `message`, `role`, `target_states`, `type(alias)->notification_type`

Agent contracts (`shared/schemas/agent.py`):
- ChatRequest:
  - `message`, `session_id`, `language`
- ChatResponse:
  - `session_id`, `message`, `agents_used`, `tools_called`, `latency_ms`
- ConversationMessage:
  - `role`, `content`, `agent_used`, `tools_called`, `latency_ms`, `timestamp`

Route-local staged chat contracts (`services/agent/routes/chat.py`):
- ChatPrepareRequest:
  - `message`, `session_id`, `language`, `farmer_id`
- ChatFinalizeRequest:
  - `request_id`, `timeout_ms`
- Prepare flow response:
  - returns `request_id`, `partial_response`, and `status` (`in_progress` or `completed`)
- Finalize flow response:
  - returns `status` (`completed`, `in_progress`, or `failed`), plus merged final payload when completed

Admin contracts (`shared/schemas/admin.py`):
- AdminLoginRequest, AdminUserCreate/Response
- AppConfigUpdate/Response
- FarmerStatusUpdate
- BulkImportRequest
- SchemeUpsertRequest
- ProviderUpsertRequest
- FeatureFlagsUpdate
- AuditLogEntry
- DataFreshnessResponse
- AnalyticsOverview

Analytics contracts (`shared/schemas/analytics.py`):
- MetricPoint: `date`, `value`
- InsightCard: `title`, `value`, `delta`, `trend`, `context`
- AdminInsightOverview: `window_days`, `generated_at`, `scorecard`, `growth_trends`, `engagement`, `operational_health`, `market_intelligence`, `opportunities`, `recommendations`
- FarmerInsightSummary: `farmer_id`, `generated_at`, `totals`, `activity`, `benchmarks`, `recommendations`

## 6. Qdrant Structure and Vector Responsibilities

Collection constants (`shared/core/constants.py`):
- legacy: `crop_knowledge`, `scheme_knowledge`, `market_knowledge`, `farming_general`
- current semantic indexes:
  - `schemes_semantic`
  - `schemes_faq`
  - `mandi_price_intelligence`
  - `crop_advisory_kb`
  - `geo_location_index`
  - `equipment_semantic`

Embedding model:
- multilingual mpnet variant with vector dimension 768.

Indexing sources:
- scripts (`scripts/generate_qdrant_indexes.py`)
- worker task `refresh_qdrant_indexes`
- runtime service helpers in `shared/services/qdrant_service.py` and `shared/services/knowledge_base_service.py`

Compatibility hardening:
- Search logic supports both old `search` and newer `query_points` Qdrant client APIs.

## 7. Worker, Cron, and Background Jobs

Celery app:
- `workers/celery_app.py`
- broker/backend from env (`CELERY_BROKER_URL`, `CELERY_RESULT_BACKEND`)
- task tracking enabled, late ack enabled, prefetch 1.

Tasks:
- `workers/tasks/data_tasks.py`
  - `refresh_qdrant_indexes`
  - `generate_analytics_snapshot`
  - `check_price_alerts`
- `workers/tasks/embedding_tasks.py`
  - `embed_text`
  - `embed_batch`
- `workers/tasks/notification_tasks.py`
  - `send_notification`
  - `send_broadcast`

Cron setup script:
- `scripts/setup_cron.sh`
- configured jobs:
  - 02:00 IST seed reference data
  - 02:30 IST rebuild Qdrant indexes
  - 03:00 IST generate analytics snapshots

## 8. Scripts, Tests, and Operational Tooling

Scripts inventory:
- `scripts/info.txt` documents 51 script/data files.
- includes ingestion generators, seeders, Qdrant builders, curated replacement scripts.
- hardening runbook scripts:
  - `scripts/fix_and_audit_data_quality.py`
  - `scripts/build_production_indexes.py`
  - `scripts/generate_qdrant_indexes.py`
  - `scripts/build_qdrant_payload_indexes.py`
  - outputs written to audit/report artifacts under `scripts/*.json`

Tests inventory:
- `tests/info.txt` documents:
  - endpoint integration suite (`test_all_endpoints.py`)
  - feature E2E suite (`test_e2e_new_features.py`)
  - dynamic pentest (`test_dynamic_pentest.py`)

Security/pentest focus points covered:
- refresh replay protection
- admin-only sensitive route checks
- CORS permissiveness checks
- forged default-secret token rejection

## 9. Runtime Tree Snapshot (backend scope)

Top-level tree (`kisankiawaz-backend`):
- `.env`, `.env.example`
- `docker-compose.yml`, `docker-compose.prod.yml`
- `Dockerfile.base`
- `nginx/`
- `services/`
- `shared/`
- `workers/`
- `scripts/`
- `tests/`
- `creds/`

Services tree:
- `services/admin`
- `services/agent`
- `services/analytics`
- `services/auth`
- `services/crop`
- `services/equipment`
- `services/farmer`
- `services/geo`
- `services/market`
- `services/notification`
- `services/schemes`
- `services/voice`

Shared tree:
- `shared/auth`
- `shared/cache`
- `shared/core`
- `shared/db`
- `shared/errors`
- `shared/middleware`
- `shared/patterns`
- `shared/schemas`
- `shared/services`

Workers tree:
- `workers/celery_app.py`
- `workers/tasks/data_tasks.py`
- `workers/tasks/embedding_tasks.py`
- `workers/tasks/notification_tasks.py`

For full recursive script/test inventories, see:
- `scripts/info.txt`
- `tests/info.txt`
- `services/info.txt`
- `shared/info.txt`

## 10. Practical Notes for Frontend and Integrators

- Always call through gateway (`:8000`) in integrated environments.
- Prefer shared schema contracts for request construction and response typing.
- Admin and analytics endpoints are heavily role-guarded; design auth-aware UX fallbacks for 401/403 states.
- Voice responses now include latency and provenance metadata; consume these for debugging and UX telemetry.
- For market/equipment/schemes, many endpoints include strict->relaxed fallback behavior; source fields in payloads should be surfaced in UI for trust and traceability.

## 11. Security Features Implemented (Production-Grade)

This section consolidates all major security controls now active in the backend.

### 11.1 Authentication and token security

- JWT access/refresh token model is implemented in shared auth utilities.
- Refresh tokens include unique `jti` values and are replay-protected in Redis.
- Used refresh tokens are revoked for full refresh TTL to block reuse.
- Role-aware identity lookup is enforced (`users` vs `admin_users`).
- Inactive users are denied token refresh/login continuation.

### 11.2 Credential and secret hardening

- `JWT_SECRET` policy is validated at startup in production-like environments.
- Weak/default JWT secrets are explicitly rejected when `APP_ENV` is production/staging-like.
- Minimum JWT secret length is enforced for production-like runs.
- Wildcard CORS (`*`) is rejected in production-like mode.

### 11.3 OTP abuse prevention controls

- OTP TTL control is enforced (5-minute validity window).
- OTP send cooldown is enforced to reduce spam/replay attempts.
- OTP verification attempt counters are tracked.
- Lockout window is applied after repeated invalid OTP attempts.
- OTP attempts and lock states are persisted in Redis for centralized enforcement.

### 11.4 Rate limiting and gateway traffic protection

- Gateway-level rate limiting in Nginx with dedicated zones:
  - auth-sensitive routes
  - standard API routes
  - admin routes
- Service-level Redis sliding-window rate limiter middleware is implemented.
- Retry-After headers are returned on 429 responses.
- Safe-fail behavior allows requests if Redis limiter backend is temporarily unavailable.

### 11.5 HTTP response security headers

- Security headers middleware injects:
  - `X-Content-Type-Options: nosniff`
  - `X-Frame-Options: DENY`
  - `X-XSS-Protection: 1; mode=block`
  - `Strict-Transport-Security`
  - `Referrer-Policy`

### 11.6 API surface protection and role guarding

- Admin-only route families are separated and role-guarded.
- Sensitive internal diagnostics (for example key-pool status) are protected from non-admin callers.
- Farmer self-access checks are applied where user-scoped analytics data is returned.

### 11.7 Error handling and information exposure control

- Centralized exception handler standardizes error responses.
- Unexpected exceptions return generic `INTERNAL_ERROR` without leaking internals.
- Domain exceptions return explicit typed error codes.
- `FIREBASE_ERROR` exists only as a legacy alias and is no longer default runtime behavior.

### 11.8 Security verification coverage

Dynamic security tests include:
- refresh token replay rejection
- non-admin denial on admin-sensitive endpoint
- CORS permissiveness checks
- forged default-secret JWT rejection

## 12. Validation and Pydantic Contract Strategy

### 12.1 Contract-first API design

- Shared schema package acts as the single source of request/response contracts.
- Service routes increasingly consume typed request models instead of raw unvalidated dictionaries.
- Contract updates are centralized in shared schemas to prevent drift.

### 12.2 Input validation strictness

- Pydantic strict mode is enabled widely across schema models.
- Many request models enforce `extra = forbid` to block undocumented payload fields.
- Field-level constraints are defined with explicit bounds, for example:
  - lengths for strings
  - numeric minimums/maximums
  - enum/literal constraints for controlled values
- Aliased fields (for example notification type fields) are normalized with explicit model config.

### 12.3 Domain-specific typed payload migration

Recent typed migration examples include:
- auth profile update payload typed (`UserUpdateRequest`)
- equipment/livestock create-update payloads typed
- market admin CRUD payloads typed (`AdminPriceUpsert`, `AdminMandiUpsert`, `AdminSchemeUpsert`)
- notification create/broadcast payloads typed
- analytics response contracts typed (`AdminInsightOverview`, `FarmerInsightSummary`)

### 12.4 Business-layer defensive validation

Beyond route-level schema checks, service-layer defenses include:
- field allowlists before persistence updates
- required-field checks before create operations
- ownership checks for farmer-owned entities
- invalid/no-op update rejection (`No valid fields to update` pattern)

### 12.5 Why this matters for frontend and integrators

- Predictable validation failures enable reliable form-level error UX.
- Strong schema contracts reduce integration ambiguity between frontend/backend.
- Payload strictness lowers accidental API misuse and hidden bug classes.

## 13. Engineering Practices Followed (Industry-Level)

### 13.1 Architecture and modularity

- Clear microservice boundaries by business domain.
- Shared library pattern for cross-cutting concerns (auth, db, middleware, errors, schemas).
- Gateway-first routing model with centralized ingress controls.

### 13.2 Reliability and compatibility

- Backward-compatible handling for Qdrant client API evolution (`search` and `query_points`).
- Graceful fallback patterns in data-heavy endpoints (strict -> relaxed matching).
- Defensive default handling in external API unavailability cases.

### 13.3 Data and infra hygiene

- Mongo-only runtime path after Firestore removal.
- Ref-data ingestion and freshness metadata tracking.
- Distinct reference collections (`ref_*`) to separate canonical/static data from transactional data.
- Production compose profile keeps only gateway externally exposed.

### 13.4 Operational observability

- Request logging middleware across services.
- Health endpoints and container healthchecks per service.
- Structured latency and provenance metadata in voice flows.
- Audit and info inventory files maintained for service/shared/scripts/tests modules.

### 13.5 Testing posture

- Broad endpoint integration coverage.
- E2E feature flows across major domains.
- Dedicated dynamic pentest script for auth and exposure controls.

### 13.6 Delivery discipline

- Centralized env template with explicit runtime and test variables.
- Shared schemas exported from one index to reduce import drift.
- Docker base-layer reuse for reproducible builds and reduced variance.

## 14. Recommended Next Hardening Steps (Optional)

These are not gaps in core functionality, but common enterprise next steps:

- Add static analysis and schema-drift checks in CI pipeline.
- Add OpenAPI contract snapshot tests for breaking-change detection.
- Add secret scanning and dependency CVE checks in build pipeline.
- Add distributed tracing headers across gateway and service clients.
- Add formal threat-model notes per critical route family (auth/admin/voice).


File Tree: 
├── .dockerignore
├── .env
├── .env.example
├── .gitignore
├── .pytest_cache
│   ├── .gitignore
│   ├── CACHEDIR.TAG
│   ├── README.md
│   └── v
│       └── cache
│           ├── lastfailed
│           └── nodeids
├── BACKEND_SYSTEM_DETAILED_REFERENCE.md
├── Dockerfile.base
├── creds
│   ├── KisanKiAwaaz.postman_collection.json
│   ├── creds_gcp.json
│   ├── creds_gcpO.json
│   └── serviceAccountKey.json
├── docker-compose.prod.yml
├── docker-compose.yml
├── nginx
│   ├── Dockerfile
│   ├── info.txt
│   └── nginx.conf
├── requirements-base.txt
├── scripts
│   ├── __pycache__
│   │   ├── __init__.cpython-312.pyc
│   │   ├── generate_analytics_snapshots.cpython-312.pyc
│   │   ├── generate_qdrant_indexes.cpython-312.pyc
│   │   ├── reset_firestore.cpython-312.pyc
│   │   ├── seed.cpython-312.pyc
│   │   ├── seed_admin.cpython-312.pyc
│   │   ├── seed_farmers_end_to_end.cpython-312.pyc
│   │   └── seed_reference_data.cpython-312.pyc
│   ├── data_ingestion
│   │   ├── __pycache__
│   │   │   ├── generate_data_gov_extraction_snapshots.cpython-312.pyc
│   │   │   ├── generate_farmer_schemes_data.cpython-312.pyc
│   │   │   ├── generate_legacy_api_feeds.cpython-312.pyc
│   │   │   ├── generate_master_reference_tables.cpython-312.pyc
│   │   │   ├── generate_recovery_pipeline_data.cpython-312.pyc
│   │   │   └── generate_staging_backfill_data.cpython-312.pyc
│   │   ├── generate_data_gov_extraction_snapshots.py
│   │   ├── generate_farmer_schemes_data.py
│   │   ├── generate_legacy_api_feeds.py
│   │   ├── generate_master_reference_tables.py
│   │   ├── generate_recovery_pipeline_data.py
│   │   ├── generate_staging_backfill_data.py
│   │   └── info.txt
│   ├── generate_qdrant_indexes.py
│   ├── info.txt
│   ├── replace_equipment_providers_from_json.py
│   ├── replace_schemes_from_json.py
│   ├── reports
│   │   ├── data_assets
│   │   │   └── audit
│   │   │       ├── seed_farmers_end_to_end_report.json
│   │   │       └── seeded_farmers_credentials.csv
│   │   ├── data_gov_extraction_snapshots
│   │   │   ├── 35985678-0d79-46b4-9ed6-6f13308a1d24.csv
│   │   │   ├── 4554a3c8-74e3-4f93-8727-8fd92161e345.csv
│   │   │   └── 9ef84268-d588-465a-a308-a864a43d0070.csv
│   │   ├── equipment_rental_pan_india_2026.json
│   │   ├── farmer_schemes_data
│   │   │   └── farmer_schemes_master.csv
│   │   ├── legacy_api_feeds
│   │   │   ├── mandi_directory_derived_geocoded.csv
│   │   │   └── vegetable_api_pulls.csv
│   │   ├── master_reference_tables
│   │   │   ├── mandi_directory_india.csv
│   │   │   └── manual_rental_providers.csv
│   │   ├── recovery_pipeline_data
│   │   │   ├── agromet
│   │   │   │   └── 049d64ee-24ed-483f-b84f-00b525516552.csv
│   │   │   ├── arrivals
│   │   │   │   └── 02e72f1b-d82d-4512-a105-7b4373d6fa85.csv
│   │   │   ├── cold_storage
│   │   │   │   └── a75195de-8cd6-4ecf-a818-54c761dfa24a.csv
│   │   │   ├── cost_cultivation
│   │   │   │   └── 48bcec64-5573-4f3d-b38e-c474253a6a9d.csv
│   │   │   ├── crop_yield_varieties
│   │   │   │   ├── 7b9f57f0-5f8a-4442-9759-352dacb9d71b.csv
│   │   │   │   └── cf80173e-fece-439d-a0b1-6e9cb510593d.csv
│   │   │   ├── fasal
│   │   │   │   └── 14f6f0d0-311d-4b71-acfe-ac08bbecfd1c.csv
│   │   │   ├── fertilizer
│   │   │   │   └── 5c2f62fe-5afa-4119-a499-fec9d604d5bd.csv
│   │   │   ├── fpo
│   │   │   │   └── 28287ce1-424a-4c43-85f4-de8a38924a69.csv
│   │   │   ├── groundwater
│   │   │   │   └── 6f81905b-5c66-458f-baa3-74f870de5cd0.csv
│   │   │   ├── kcc
│   │   │   │   └── 2bbff406-a8a8-4920-90c3-095adebf531f.csv
│   │   │   ├── labour_wages
│   │   │   │   └── 67722646-54ac-4b26-b73e-124d4bc22bda.csv
│   │   │   ├── market_prices
│   │   │   │   └── 9ef84268-d588-465a-a308-a864a43d0070.csv
│   │   │   ├── msp
│   │   │   │   └── 5e6056c8-b644-40a8-a346-3da6b3d8e67e.csv
│   │   │   ├── pesticides
│   │   │   │   ├── 7c568619-b9b4-40bb-b563-68c28c27a6c1.csv
│   │   │   │   └── 98a33686-715f-4076-97da-fa3dcf6bc61b.csv
│   │   │   ├── pin_master
│   │   │   │   └── f17a1608-5f10-4610-bb50-a63c80d83974.csv
│   │   │   ├── pmfby
│   │   │   │   └── a330e681-6562-4552-a94b-58f1df7eccf3.csv
│   │   │   ├── reservoir
│   │   │   │   └── 247146af-5216-47ff-80f6-ddea261f1139.csv
│   │   │   ├── soil_health
│   │   │   │   └── 4554a3c8-74e3-4f93-8727-8fd92161e345.csv
│   │   │   └── supporting_assets
│   │   │       └── recovery_generation_report.csv
│   │   ├── scheme.json
│   │   └── staging_backfill_data
│   │       ├── 4554a3c8-74e3-4f93-8727-8fd92161e345.csv
│   │       ├── all_data_gov_rows.csv
│   │       └── mandi_master_derived_geocoded.csv
│   ├── seed.py
│   ├── seed_admin.py
│   ├── seed_farmers_end_to_end.py
│   ├── seed_reference_data.py
│   └── setup_cron.sh
├── services
│   ├── admin
│   │   ├── Dockerfile
│   │   ├── __init__.py
│   │   ├── __pycache__
│   │   │   ├── __init__.cpython-312.pyc
│   │   │   └── main.cpython-312.pyc
│   │   ├── main.py
│   │   ├── requirements.txt
│   │   ├── routes
│   │   │   ├── __init__.py
│   │   │   └── __pycache__
│   │   │       └── __init__.cpython-312.pyc
│   │   └── services
│   │       ├── __init__.py
│   │       ├── __pycache__
│   │       │   ├── __init__.cpython-312.pyc
│   │       │   └── bulk_import_service.cpython-312.pyc
│   │       └── bulk_import_service.py
│   ├── agent
│   │   ├── Dockerfile
│   │   ├── __init__.py
│   │   ├── __pycache__
│   │   │   ├── __init__.cpython-312.pyc
│   │   │   └── main.cpython-312.pyc
│   │   ├── agents
│   │   │   ├── __init__.py
│   │   │   ├── __pycache__
│   │   │   │   ├── __init__.cpython-312.pyc
│   │   │   │   ├── coordinator.cpython-312.pyc
│   │   │   │   ├── crop_agent.cpython-312.pyc
│   │   │   │   ├── general_agent.cpython-312.pyc
│   │   │   │   ├── market_agent.cpython-312.pyc
│   │   │   │   ├── scheme_agent.cpython-312.pyc
│   │   │   │   └── weather_agent.cpython-312.pyc
│   │   │   ├── coordinator.py
│   │   │   ├── crop_agent.py
│   │   │   ├── general_agent.py
│   │   │   ├── market_agent.py
│   │   │   ├── scheme_agent.py
│   │   │   └── weather_agent.py
│   │   ├── main.py
│   │   ├── requirements.txt
│   │   ├── routes
│   │   │   ├── __init__.py
│   │   │   ├── __pycache__
│   │   │   │   ├── __init__.cpython-312.pyc
│   │   │   │   ├── chat.cpython-312.pyc
│   │   │   │   └── conversations.cpython-312.pyc
│   │   │   ├── chat.py
│   │   │   └── conversations.py
│   │   ├── services
│   │   │   ├── __init__.py
│   │   │   ├── __pycache__
│   │   │   │   ├── __init__.cpython-312.pyc
│   │   │   │   ├── chat_service.cpython-312.pyc
│   │   │   │   ├── embedding_service.cpython-312.pyc
│   │   │   │   └── groq_fallback_service.cpython-312.pyc
│   │   │   ├── chat_service.py
│   │   │   ├── embedding_service.py
│   │   │   └── groq_fallback_service.py
│   │   └── tools
│   │       ├── __init__.py
│   │       ├── __pycache__
│   │       │   ├── __init__.cpython-312.pyc
│   │       │   ├── crop_tools.cpython-312.pyc
│   │       │   ├── general_tools.cpython-312.pyc
│   │       │   ├── market_tools.cpython-312.pyc
│   │       │   ├── scheme_tools.cpython-312.pyc
│   │       │   └── weather_tools.cpython-312.pyc
│   │       ├── crop_tools.py
│   │       ├── general_tools.py
│   │       ├── market_tools.py
│   │       ├── scheme_tools.py
│   │       └── weather_tools.py
│   ├── analytics
│   │   ├── Dockerfile
│   │   ├── __init__.py
│   │   ├── __pycache__
│   │   │   ├── __init__.cpython-312.pyc
│   │   │   └── main.cpython-312.pyc
│   │   ├── info.txt
│   │   ├── main.py
│   │   ├── requirements.txt
│   │   ├── routes
│   │   │   ├── __init__.py
│   │   │   └── __pycache__
│   │   │       └── __init__.cpython-312.pyc
│   │   └── services
│   │       ├── __init__.py
│   │       └── insight_service.py
│   ├── auth
│   │   ├── Dockerfile
│   │   ├── __init__.py
│   │   ├── __pycache__
│   │   │   ├── __init__.cpython-312.pyc
│   │   │   └── main.cpython-312.pyc
│   │   ├── main.py
│   │   ├── requirements.txt
│   │   ├── routes
│   │   │   ├── __init__.py
│   │   │   ├── __pycache__
│   │   │   │   ├── __init__.cpython-312.pyc
│   │   │   │   └── auth.cpython-312.pyc
│   │   │   └── auth.py
│   │   └── services
│   │       ├── __init__.py
│   │       ├── __pycache__
│   │       │   ├── __init__.cpython-312.pyc
│   │       │   └── auth_service.cpython-312.pyc
│   │       └── auth_service.py
│   ├── crop
│   │   ├── Dockerfile
│   │   ├── __init__.py
│   │   ├── __pycache__
│   │   │   ├── __init__.cpython-312.pyc
│   │   │   └── main.cpython-312.pyc
│   │   ├── main.py
│   │   ├── requirements.txt
│   │   ├── routes
│   │   │   ├── __init__.py
│   │   │   ├── __pycache__
│   │   │   │   ├── __init__.cpython-312.pyc
│   │   │   │   ├── crops.cpython-312.pyc
│   │   │   │   ├── cycles.cpython-312.pyc
│   │   │   │   ├── disease.cpython-312.pyc
│   │   │   │   └── recommendations.cpython-312.pyc
│   │   │   ├── crops.py
│   │   │   ├── cycles.py
│   │   │   ├── disease.py
│   │   │   └── recommendations.py
│   │   └── services
│   │       ├── __init__.py
│   │       ├── __pycache__
│   │       │   ├── __init__.cpython-312.pyc
│   │       │   ├── crop_service.cpython-312.pyc
│   │       │   ├── cycle_service.cpython-312.pyc
│   │       │   └── disease_service.cpython-312.pyc
│   │       ├── crop_service.py
│   │       ├── cycle_service.py
│   │       └── disease_service.py
│   ├── equipment
│   │   ├── Dockerfile
│   │   ├── __init__.py
│   │   ├── __pycache__
│   │   │   ├── __init__.cpython-312.pyc
│   │   │   └── main.cpython-312.pyc
│   │   ├── main.py
│   │   ├── requirements.txt
│   │   ├── routes
│   │   │   ├── __init__.py
│   │   │   ├── __pycache__
│   │   │   │   ├── __init__.cpython-312.pyc
│   │   │   │   ├── equipment.cpython-312.pyc
│   │   │   │   ├── livestock.cpython-312.pyc
│   │   │   │   ├── rental_rates.cpython-312.pyc
│   │   │   │   └── rentals.cpython-312.pyc
│   │   │   ├── equipment.py
│   │   │   ├── livestock.py
│   │   │   ├── rental_rates.py
│   │   │   └── rentals.py
│   │   └── services
│   │       ├── __init__.py
│   │       ├── __pycache__
│   │       │   ├── __init__.cpython-312.pyc
│   │       │   ├── equipment_rental_data.cpython-312.pyc
│   │       │   ├── equipment_service.cpython-312.pyc
│   │       │   ├── livestock_service.cpython-312.pyc
│   │       │   └── rental_service.cpython-312.pyc
│   │       ├── equipment_rental_data.py
│   │       ├── equipment_service.py
│   │       ├── livestock_service.py
│   │       └── rental_service.py
│   ├── farmer
│   │   ├── Dockerfile
│   │   ├── __init__.py
│   │   ├── __pycache__
│   │   │   ├── __init__.cpython-312.pyc
│   │   │   └── main.cpython-312.pyc
│   │   ├── main.py
│   │   ├── requirements.txt
│   │   ├── routes
│   │   │   ├── __init__.py
│   │   │   ├── __pycache__
│   │   │   │   ├── __init__.cpython-312.pyc
│   │   │   │   ├── admin.cpython-312.pyc
│   │   │   │   ├── dashboard.cpython-312.pyc
│   │   │   │   └── profiles.cpython-312.pyc
│   │   │   ├── admin.py
│   │   │   ├── dashboard.py
│   │   │   └── profiles.py
│   │   └── services
│   │       ├── __init__.py
│   │       ├── __pycache__
│   │       │   ├── __init__.cpython-312.pyc
│   │       │   └── farmer_service.cpython-312.pyc
│   │       └── farmer_service.py
│   ├── geo
│   │   ├── Dockerfile
│   │   ├── __init__.py
│   │   ├── __pycache__
│   │   │   ├── __init__.cpython-312.pyc
│   │   │   └── main.cpython-312.pyc
│   │   ├── main.py
│   │   ├── requirements.txt
│   │   ├── routes
│   │   │   ├── __init__.py
│   │   │   └── __pycache__
│   │   │       └── __init__.cpython-312.pyc
│   │   └── services
│   │       ├── __init__.py
│   │       ├── __pycache__
│   │       │   ├── __init__.cpython-312.pyc
│   │       │   └── geo_service.cpython-312.pyc
│   │       └── geo_service.py
│   ├── info.txt
│   ├── market
│   │   ├── Dockerfile
│   │   ├── __init__.py
│   │   ├── __pycache__
│   │   │   ├── __init__.cpython-312.pyc
│   │   │   └── main.cpython-312.pyc
│   │   ├── main.py
│   │   ├── requirements.txt
│   │   ├── routes
│   │   │   ├── __init__.py
│   │   │   ├── __pycache__
│   │   │   │   ├── __init__.cpython-312.pyc
│   │   │   │   ├── document_builder.cpython-312.pyc
│   │   │   │   ├── live_market.cpython-312.pyc
│   │   │   │   ├── mandis.cpython-312.pyc
│   │   │   │   ├── prices.cpython-312.pyc
│   │   │   │   ├── ref_data.cpython-312.pyc
│   │   │   │   ├── schemes.cpython-312.pyc
│   │   │   │   └── weather_soil.cpython-312.pyc
│   │   │   ├── document_builder.py
│   │   │   ├── live_market.py
│   │   │   ├── mandis.py
│   │   │   ├── prices.py
│   │   │   ├── ref_data.py
│   │   │   ├── schemes.py
│   │   │   └── weather_soil.py
│   │   └── services
│   │       ├── __init__.py
│   │       ├── __pycache__
│   │       │   ├── __init__.cpython-312.pyc
│   │       │   ├── document_builder_service.cpython-312.pyc
│   │       │   ├── government_schemes_data.cpython-312.pyc
│   │       │   ├── langextract_service.cpython-312.pyc
│   │       │   ├── mandi_data_fetcher.cpython-312.pyc
│   │       │   ├── mandi_service.cpython-312.pyc
│   │       │   ├── price_service.cpython-312.pyc
│   │       │   ├── scheme_document_downloader.cpython-312.pyc
│   │       │   ├── scheme_service.cpython-312.pyc
│   │       │   ├── soil_service.cpython-312.pyc
│   │       │   └── weather_service.cpython-312.pyc
│   │       ├── document_builder_service.py
│   │       ├── government_schemes_data.py
│   │       ├── langextract_service.py
│   │       ├── mandi_data_fetcher.py
│   │       ├── mandi_service.py
│   │       ├── price_service.py
│   │       ├── scheme_document_downloader.py
│   │       ├── scheme_service.py
│   │       ├── soil_service.py
│   │       └── weather_service.py
│   ├── notification
│   │   ├── Dockerfile
│   │   ├── __init__.py
│   │   ├── __pycache__
│   │   │   ├── __init__.cpython-312.pyc
│   │   │   └── main.cpython-312.pyc
│   │   ├── info.txt
│   │   ├── main.py
│   │   ├── requirements.txt
│   │   ├── routes
│   │   │   ├── __init__.py
│   │   │   ├── __pycache__
│   │   │   │   ├── __init__.cpython-312.pyc
│   │   │   │   ├── notifications.cpython-312.pyc
│   │   │   │   └── preferences.cpython-312.pyc
│   │   │   ├── notifications.py
│   │   │   └── preferences.py
│   │   └── services
│   │       ├── __init__.py
│   │       ├── __pycache__
│   │       │   ├── __init__.cpython-312.pyc
│   │       │   └── notification_service.cpython-312.pyc
│   │       └── notification_service.py
│   ├── scheme_documents
│   │   ├── acabc
│   │   ├── aif
│   │   │   └── aif_application.html
│   │   ├── deds_npdd
│   │   ├── drone_didi
│   │   ├── enam
│   │   │   ├── enam_farmer_registration.html
│   │   │   └── enam_user_manual.html
│   │   ├── fpo_scheme
│   │   │   └── fpo_formation_guidelines.html
│   │   ├── iss
│   │   ├── kalia
│   │   ├── kcc
│   │   │   ├── kcc_application_form_pnb.html
│   │   │   ├── kcc_guidelines_rbi.html
│   │   │   └── pm-kisan_kcc_form.html
│   │   ├── krishak_bandhu
│   │   ├── manifest.json
│   │   ├── midh
│   │   │   └── midh_guidelines.pdf
│   │   ├── mkky
│   │   ├── mks_yojana
│   │   ├── namo_shetkari
│   │   ├── nbhm
│   │   ├── nlm
│   │   ├── nmsa-rad
│   │   ├── pkvy
│   │   │   ├── pgs_india_guidelines.pdf
│   │   │   └── pkvy_cluster_registration_form.html
│   │   ├── pm-aasha
│   │   ├── pm-kisan
│   │   ├── pm-kusum
│   │   │   ├── component_b_guidelines.html
│   │   │   └── pm-kusum_application_form.html
│   │   ├── pmfby
│   │   │   ├── claim_form.html
│   │   │   ├── pmfby_application_form.html
│   │   │   └── pmfby_guidelines.pdf
│   │   ├── pmksy
│   │   ├── pmmsy
│   │   │   └── pmmsy_application.html
│   │   ├── raitha_siri
│   │   ├── rkvy
│   │   ├── rythu_bandhu
│   │   ├── shc
│   │   │   └── soil_health_card_sample.pdf
│   │   ├── smam
│   │   │   ├── smam_guidelines.pdf
│   │   │   └── smam_online_application.html
│   │   └── ysr_rythu_bharosa
│   ├── schemes
│   │   ├── Dockerfile
│   │   ├── __init__.py
│   │   ├── __pycache__
│   │   │   ├── __init__.cpython-312.pyc
│   │   │   └── main.cpython-312.pyc
│   │   ├── main.py
│   │   ├── requirements.txt
│   │   ├── routes
│   │   │   ├── __init__.py
│   │   │   └── __pycache__
│   │   │       └── __init__.cpython-312.pyc
│   │   └── services
│   │       ├── __init__.py
│   │       ├── __pycache__
│   │       │   ├── __init__.cpython-312.pyc
│   │       │   └── schemes_service.cpython-312.pyc
│   │       └── schemes_service.py
│   └── voice
│       ├── Dockerfile
│       ├── __init__.py
│       ├── __pycache__
│       │   ├── __init__.cpython-312.pyc
│       │   └── main.cpython-312.pyc
│       ├── main.py
│       ├── requirements.txt
│       ├── routes
│       │   ├── __init__.py
│       │   ├── __pycache__
│       │   │   ├── __init__.cpython-312.pyc
│       │   │   ├── stt.cpython-312.pyc
│       │   │   ├── tts.cpython-312.pyc
│       │   │   └── voice.cpython-312.pyc
│       │   ├── stt.py
│       │   ├── tts.py
│       │   └── voice.py
│       └── services
│           ├── __init__.py
│           ├── __pycache__
│           │   ├── __init__.cpython-312.pyc
│           │   ├── stt_service.cpython-312.pyc
│           │   └── tts_service.cpython-312.pyc
│           ├── stt_service.py
│           └── tts_service.py
├── shared
│   ├── __init__.py
│   ├── __pycache__
│   │   └── __init__.cpython-312.pyc
│   ├── auth
│   │   ├── __init__.py
│   │   ├── __pycache__
│   │   │   ├── __init__.cpython-312.pyc
│   │   │   ├── deps.cpython-312.pyc
│   │   │   └── security.cpython-312.pyc
│   │   ├── deps.py
│   │   └── security.py
│   ├── cache
│   │   ├── __init__.py
│   │   ├── __pycache__
│   │   │   ├── __init__.cpython-312.pyc
│   │   │   └── market_cache.cpython-312.pyc
│   │   └── market_cache.py
│   ├── core
│   │   ├── __init__.py
│   │   ├── __pycache__
│   │   │   ├── __init__.cpython-312.pyc
│   │   │   ├── config.cpython-312.pyc
│   │   │   └── constants.cpython-312.pyc
│   │   ├── config.py
│   │   └── constants.py
│   ├── db
│   │   ├── __init__.py
│   │   ├── __pycache__
│   │   │   ├── __init__.cpython-312.pyc
│   │   │   ├── firebase.cpython-312.pyc
│   │   │   ├── mongodb.cpython-312.pyc
│   │   │   └── redis.cpython-312.pyc
│   │   ├── mongodb.py
│   │   └── redis.py
│   ├── errors
│   │   ├── __init__.py
│   │   ├── __pycache__
│   │   │   ├── __init__.cpython-312.pyc
│   │   │   ├── codes.cpython-312.pyc
│   │   │   ├── exceptions.cpython-312.pyc
│   │   │   └── handlers.cpython-312.pyc
│   │   ├── codes.py
│   │   ├── exceptions.py
│   │   └── handlers.py
│   ├── info.txt
│   ├── middleware
│   │   ├── __init__.py
│   │   ├── __pycache__
│   │   │   ├── __init__.cpython-312.pyc
│   │   │   ├── auth.cpython-312.pyc
│   │   │   ├── logging.cpython-312.pyc
│   │   │   ├── rate_limiter.cpython-312.pyc
│   │   │   └── security.cpython-312.pyc
│   │   ├── auth.py
│   │   ├── logging.py
│   │   ├── rate_limiter.py
│   │   └── security.py
│   ├── patterns
│   │   ├── __init__.py
│   │   ├── __pycache__
│   │   │   ├── __init__.cpython-312.pyc
│   │   │   ├── bloom_filter.cpython-312.pyc
│   │   │   ├── circuit_breaker.cpython-312.pyc
│   │   │   └── service_client.cpython-312.pyc
│   │   ├── bloom_filter.py
│   │   ├── circuit_breaker.py
│   │   └── service_client.py
│   ├── schemas
│   │   ├── __init__.py
│   │   ├── __pycache__
│   │   │   ├── __init__.cpython-312.pyc
│   │   │   ├── admin.cpython-312.pyc
│   │   │   ├── agent.cpython-312.pyc
│   │   │   ├── auth.cpython-312.pyc
│   │   │   ├── common.cpython-312.pyc
│   │   │   ├── crop.cpython-312.pyc
│   │   │   ├── equipment.cpython-312.pyc
│   │   │   ├── farmer.cpython-312.pyc
│   │   │   ├── geo.cpython-312.pyc
│   │   │   ├── livestock.cpython-312.pyc
│   │   │   ├── market.cpython-312.pyc
│   │   │   ├── notification.cpython-312.pyc
│   │   │   └── scheme.cpython-312.pyc
│   │   ├── admin.py
│   │   ├── agent.py
│   │   ├── analytics.py
│   │   ├── auth.py
│   │   ├── common.py
│   │   ├── crop.py
│   │   ├── equipment.py
│   │   ├── farmer.py
│   │   ├── geo.py
│   │   ├── livestock.py
│   │   ├── market.py
│   │   ├── notification.py
│   │   └── scheme.py
│   └── services
│       ├── __pycache__
│       │   ├── api_key_allocator.cpython-312.pyc
│       │   ├── knowledge_base_service.cpython-312.pyc
│       │   └── qdrant_service.cpython-312.pyc
│       ├── api_key_allocator.py
│       ├── knowledge_base_service.py
│       └── qdrant_service.py
├── tests
│   ├── __pycache__
│   │   ├── test_all_endpoints.cpython-312-pytest-8.4.1.pyc
│   │   ├── test_all_endpoints.cpython-312-pytest-9.0.2.pyc
│   │   ├── test_all_endpoints.cpython-312.pyc
│   │   ├── test_e2e_new_features.cpython-312-pytest-8.4.1.pyc
│   │   ├── test_e2e_new_features.cpython-312-pytest-9.0.2.pyc
│   │   └── test_e2e_new_features.cpython-312.pyc
│   ├── info.txt
│   ├── materials
│   │   └── audio
│   │       └── voice_pipeline_test.wav
│   ├── test_all_endpoints.py
│   ├── test_dynamic_pentest.py
│   └── test_e2e_new_features.py
└── workers
    ├── Dockerfile
    ├── __init__.py
    ├── __pycache__
    │   ├── __init__.cpython-312.pyc
    │   └── celery_app.cpython-312.pyc
    ├── celery_app.py
    ├── info.txt
    ├── requirements.txt
    └── tasks
        ├── __init__.py
        ├── __pycache__
        │   ├── __init__.cpython-312.pyc
        │   ├── data_tasks.cpython-312.pyc
        │   ├── embedding_tasks.cpython-312.pyc
        │   └── notification_tasks.cpython-312.pyc
        ├── data_tasks.py
        ├── embedding_tasks.py
        └── notification_tasks.py