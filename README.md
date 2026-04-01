<div align="center">

<img src="https://img.shields.io/badge/KisanKiAwaaz-Farmer's%20Voice-FFD700?style=for-the-badge&labelColor=1C1C1C" alt="KisanKiAwaaz"/>

# 🌾 KisanKiAwaaz — किसान की आवाज़

### AI-Powered Agricultural Intelligence Platform for Indian Farmers

*Voice-first. Multilingual. Built for Bharat.*
powershell -ExecutionPolicy Bypass -File run-android-dev.ps1
---

[![Python](https://img.shields.io/badge/Python-3.12-3776AB?style=flat-square&logo=python&logoColor=white)](https://python.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115-009688?style=flat-square&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/React-18-61DAFB?style=flat-square&logo=react&logoColor=black)](https://reactjs.org)
[![MongoDB](https://img.shields.io/badge/MongoDB-7.0-47A248?style=flat-square&logo=mongodb&logoColor=white)](https://mongodb.com)
[![Redis](https://img.shields.io/badge/Redis-7.2-DC382D?style=flat-square&logo=redis&logoColor=white)](https://redis.io)
[![Qdrant](https://img.shields.io/badge/Qdrant-Vector%20DB-DC143C?style=flat-square&logo=data:image/svg+xml;base64,PHN2Zy8+)](https://qdrant.tech)
[![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?style=flat-square&logo=docker&logoColor=white)](https://docker.com)
[![Celery](https://img.shields.io/badge/Celery-5.x-37814A?style=flat-square&logo=celery&logoColor=white)](https://docs.celeryq.dev)
[![License](https://img.shields.io/badge/License-MIT-FFD700?style=flat-square)](LICENSE)
[![PRs Welcome](https://img.shields.io/badge/PRs-Welcome-brightgreen?style=flat-square)](CONTRIBUTING.md)

---

**176 API Routes · 12 Microservices · Voice Pipeline · Multi-Agent AI · 38 MongoDB Collections · 6 Qdrant Indexes**

[Overview](#-overview) · [Architecture](#-architecture) · [Services](#-microservices) · [Setup](#-getting-started) · [API Reference](#-api-reference) · [Contributing](#-contributing)

</div>

---

## 📖 Overview

**KisanKiAwaaz** (Hindi: *Farmer's Voice*) is a full-stack, production-grade AI platform designed to bridge the information gap for Indian farmers. Built with a voice-first philosophy, it enables rural farmers — many of whom are not comfortable with text-based interfaces — to access real-time market prices, government scheme eligibility, crop disease detection, equipment rental, and AI-powered agricultural advisory in their native language.

### The Problem

India has 150+ million farming households. The vast majority lack access to:
- **Live mandi (market) price data** — forcing them to sell at whatever price middlemen quote
- **Government scheme awareness** — over ₹1 lakh crore in agricultural subsidies go unclaimed annually
- **Agronomy advice** — crop disease identification and treatment guidance is inaccessible without agronomists
- **Equipment access** — small farmers cannot afford equipment ownership, and rental markets are opaque

### What KisanKiAwaaz Does

| Feature | Description |
|---|---|
| 🎤 **Voice AI Pipeline** | STT → Multi-Agent → TTS in Indian languages via Sarvam AI |
| 📊 **Live Market Intelligence** | Real-time mandi prices, MSP tracking, price trend analysis |
| 🌾 **Crop Management** | Crop lifecycle tracking, disease detection, recommendations |
| 📋 **Scheme Discovery** | AI-powered government scheme search + eligibility checking |
| 🚜 **Equipment Rental** | Peer-to-peer farm equipment and livestock rental marketplace |
| 🤖 **Multi-Agent System** | Orchestrated AI agent with market, scheme, crop, geo tools |
| 📍 **Geo Intelligence** | Full India pincode/village/district lookup and mapping |
| 📈 **Analytics Engine** | Deterministic insight dashboards for admins and farmers |
| 🔔 **Smart Notifications** | Price alerts, scheme alerts, crop advisories, broadcasts |
| 🛡️ **Admin Console** | Full platform governance, data management, ingestion control |

---

## 🏗️ Architecture

### System Topology

```
                          ┌─────────────────────────┐
                          │     CLIENT LAYER         │
                          │  Farmer App (React Native)│
                          │  Admin Dashboard (React)  │
                          └────────────┬────────────┘
                                       │ HTTPS
                          ┌────────────▼────────────┐
                          │    NGINX GATEWAY :8000   │
                          │  Rate Limiting · CORS    │
                          │  Prefix-based Routing    │
                          └────────────┬────────────┘
                                       │
          ┌────────────────────────────┼────────────────────────────┐
          │                            │                            │
   ┌──────▼──────┐            ┌────────▼────────┐          ┌───────▼──────┐
   │  AUTH :8001 │            │ FARMER   :8002  │          │  CROP  :8003 │
   │  JWT · OTP  │            │ Profiles · Dash │          │ CRUD · AI    │
   └─────────────┘            └─────────────────┘          └──────────────┘
          │                            │                            │
   ┌──────▼──────┐            ┌────────▼────────┐          ┌───────▼──────┐
   │ MARKET :8004│            │EQUIPMENT :8005  │          │ AGENT  :8006 │
   │ 52 routes   │            │ Rental · Livestock│         │ Orchestrator │
   └─────────────┘            └─────────────────┘          └──────────────┘
          │                            │                            │
   ┌──────▼──────┐            ┌────────▼────────┐          ┌───────▼──────┐
   │ VOICE :8007 │            │NOTIF.   :8008   │          │SCHEMES :8009 │
   │ STT·TTS     │            │ Alerts · Prefs  │          │ Search · Elig│
   └─────────────┘            └─────────────────┘          └──────────────┘
          │                            │                            │
   ┌──────▼──────┐            ┌────────▼────────┐          ┌───────▼──────┐
   │  GEO  :8010 │            │ ADMIN    :8011  │          │ANALYTICS:8012│
   │ Pincode·Map │            │ Governance · Config│        │ Insights     │
   └─────────────┘            └─────────────────┘          └──────────────┘
                                       │
          ┌────────────────────────────┼─────────────────────────┐
          │                            │                          │
   ┌──────▼──────┐            ┌────────▼────────┐       ┌────────▼────────┐
   │  MONGODB    │            │     REDIS        │       │    QDRANT       │
   │  38 Colls   │            │  Cache·Sessions  │       │  6 Vector Idx   │
   │  Transact.  │            │  Rate Limits·OTP │       │  768-dim embed  │
   │  + Ref Data │            │  Celery Broker   │       │  Semantic Search│
   └─────────────┘            └─────────────────┘       └─────────────────┘
                                       │
                          ┌────────────▼────────────┐
                          │    CELERY WORKER         │
                          │  Embeddings · Analytics  │
                          │  Notifications · Indexes │
                          └─────────────────────────┘
```

### Request Flow

```
1.  Client  ──►  nginx:8000
2.  Nginx   ──►  /api/v1/<prefix>  →  target microservice
3.  Service ──►  Auth middleware  →  validation  →  business logic
4.  Service ──►  MongoDB read/write  +  Redis cache  +  Qdrant search
5.  Response ◄──  through gateway  →  client
```

### Voice Pipeline

```
Farmer speaks (any Indian language)
        │
        ▼
┌──────────────────┐
│  Voice Service   │  POST /api/v1/voice/command
│  :8007           │
└──────┬───────────┘
       │
       ▼
┌──────────────────┐
│   Sarvam STT     │  Audio → Text (Hindi/Marathi/Punjabi/Telugu/...)
└──────┬───────────┘
       │
       ▼
┌──────────────────┐
│  Agent Service   │  Multi-tool orchestration
│  :8006           │  ├── Market Tool  →  market-service:8004
│                  │  ├── Schemes Tool →  schemes-service:8009
│                  │  ├── Crop Tool    →  crop-service:8003
│                  │  ├── Weather Tool →  market-service:8004
│                  │  └── Geo Tool     →  geo-service:8010
└──────┬───────────┘
       │
       ▼
┌──────────────────┐
│   Sarvam TTS     │  Text → Audio (base64, farmer's language)
└──────┬───────────┘
       │
       ▼
  Response with
  audio + latency metadata
```

---

## 📦 Microservices

| Service | Port | Routes | Responsibility |
|---|---|---|---|
| **auth-service** | 8001 | 9 | JWT lifecycle, OTP, refresh token replay protection |
| **farmer-service** | 8002 | 7 | Farmer profiles, dashboard aggregation |
| **crop-service** | 8003 | 9 | Crop CRUD, disease detection, recommendations, cycle reference |
| **market-service** | 8004 | 52 | Mandi prices, MSP, document builder, weather, soil, ref data |
| **equipment-service** | 8005 | 25 | Equipment/livestock CRUD, rental lifecycle, provider intelligence |
| **agent-service** | 8006 | 9 | Multi-agent chat orchestration, session management, key pool |
| **voice-service** | 8007 | 2 | STT→Agent→TTS pipeline with latency telemetry |
| **notification-service** | 8008 | 10 | Notifications, broadcasting, preference management |
| **schemes-service** | 8009 | 7 | Scheme search (Mongo-first + Qdrant fallback), eligibility, PMFBY |
| **geo-service** | 8010 | 4 | Pincode decode, village search, district/state index |
| **admin-service** | 8011 | 26 | Platform governance, ingestion control, audit logs, config |
| **analytics-service** | 8012 | 16 | Deterministic insight engine, snapshots, farmer benchmarks |

**Total: 176 API routes**

---

## 🗄️ Database Structure

### MongoDB Collections

#### Operational (Transactional)
| Collection | Description |
|---|---|
| `users` | Farmer accounts (phone, hashed password, role, language) |
| `farmer_profiles` | Extended profile (village, district, state, pin, land, soil, irrigation) |
| `crops` | Farmer-owned crop records (name, season, area, sowing/harvest dates) |
| `crop_cycles` | Static crop cycle reference data |
| `livestock` | Livestock records per farmer (type, breed, count, health) |
| `market_prices` | Live and historical mandi price records |
| `mandis` | Mandi directory (name, state, district, lat, long) |
| `equipment` | Equipment listings (name, type, rate, availability, location) |
| `equipment_bookings` | Booking records with status lifecycle |
| `equipment_rental_rates` | DB-backed provider rate rows |
| `notifications` | Per-user notifications (title, message, type, read status) |
| `notification_preferences` | Per-user preference flags (price/scheme/crop/language) |
| `agent_conversations` | Full conversation records per session |
| `voice_sessions` | Voice pipeline session metadata + latency telemetry |
| `chat_messages` | Individual message records with agent/tool metadata |
| `chat_sessions` | Session-level records (session_id, farmer, timestamps) |
| `documents` | Generated document records |
| `document_builder_sessions` | Multi-step document builder session state |
| `calendar_events` | Farmer calendar and sowing/harvest event tracking |
| `feedback` | General platform feedback |
| `farmer_feedback` | Farmer-specific feedback records |
| `health_records` | Livestock health records |
| `crop_expenses` | Crop expense tracking per farmer |

#### Reference Data (`ref_*`) — Ingested from data.gov.in
| Collection | Description |
|---|---|
| `ref_mandi_prices` | Bulk historical mandi price dataset |
| `ref_mandi_directory` | Pan-India mandi directory with geocoding |
| `ref_msp_prices` | Minimum Support Price official data |
| `ref_farmer_schemes` | Government scheme master dataset |
| `ref_equipment_providers` | Curated equipment rental provider dataset |
| `ref_soil_health` | Soil health card reference data |
| `ref_cold_storage` | Cold storage facility directory |
| `ref_reservoir_data` | Reservoir water level data |
| `ref_crop_varieties` | Crop variety reference (yield, region, season) |
| `ref_pmfby_data` | PMFBY (crop insurance) scheme data |
| `ref_fertilizer_data` | Fertilizer advisory reference |
| `ref_pesticide_advisory` | Pesticide safety and dosage reference |
| `ref_fasal_data` | FASAL crop forecasting reference data |
| `ref_pin_master` | Full India pincode master (village → district → state hierarchy) |
| `ref_data_ingestion_meta` | Ingestion timestamps and freshness metadata per collection |

#### Governance & Admin
| Collection | Description |
|---|---|
| `admin_users` | Admin accounts with role (admin / super_admin) |
| `admin_audit_logs` | Immutable audit trail of all admin actions |
| `app_config` | Runtime platform configuration key-value store |
| `analytics_snapshots` | Point-in-time analytics snapshot records |
| `support_tickets` | Farmer support ticket records |

### Qdrant Vector Collections (768-dim · multilingual-mpnet)

| Collection | Purpose |
|---|---|
| `schemes_semantic` | Semantic search over government schemes |
| `schemes_faq` | FAQ-style scheme query matching |
| `mandi_price_intelligence` | Intelligent market price querying |
| `crop_advisory_kb` | Crop disease and advisory knowledge base |
| `geo_location_index` | Geographic entity vector index |
| `equipment_semantic` | Equipment and provider semantic search |

---

## 🔒 Security

KisanKiAwaaz implements production-grade security controls:

### Authentication & Token Security
- **JWT access + refresh token model** with unique `jti` per token
- **Refresh token replay protection** — used tokens are revoked in Redis for the full TTL
- **Role-aware identity resolution** — `users` vs `admin_users` collections
- **Inactive user lockout** — blocked at token refresh and login

### Credential Hardening
- `JWT_SECRET` validated at startup — weak/default secrets rejected in production
- Minimum secret length enforced for prod/staging environments
- Wildcard CORS (`*`) hard-rejected in non-development environments

### OTP Abuse Prevention
- 5-minute OTP validity TTL
- Send cooldown between requests
- Attempt counters tracked in Redis
- Lockout window after repeated failed verifications

### Rate Limiting (Two Layers)
- **Nginx gateway zones:** `auth: 5 req/s`, `api: 30 req/s`, `admin: 20 req/s`
- **Service-level:** Redis sliding-window rate limiter middleware with `Retry-After` headers
- Safe-fail: allows requests if Redis limiter temporarily unavailable

### HTTP Security Headers
```
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
Strict-Transport-Security: max-age=31536000
Referrer-Policy: strict-origin-when-cross-origin
```

### API Surface Protection
- Admin route families are separated and role-guarded (`admin` / `super_admin`)
- Key-pool status (internal infra) restricted to admin callers only
- Farmer data access checks on analytics and profile endpoints
- Centralized exception handler — unexpected errors return generic `INTERNAL_ERROR` without leaking internals

---

## 🚀 Getting Started

### Prerequisites

| Tool | Version | Notes |
|---|---|---|
| Docker | 24+ | Required for all services |
| Docker Compose | 2.x | Included in Docker Desktop |
| Python | 3.12 | For local dev / scripts only |
| Node.js | 18+ | For frontend only |
| Git | Any | — |

### 1. Clone the Repository

```bash
git clone https://github.com/vvinayakkk/kisankiawaz.git
cd kisankiawaz
```

### 2. Configure Environment

```bash
# Copy the example env file
cp kisankiawaz-backend/.env.example kisankiawaz-backend/.env
```

Open `kisankiawaz-backend/.env` and fill in your values:

```env
# ── Required ─────────────────────────────────────────────────
JWT_SECRET=<generate with: openssl rand -hex 64>
MONGODB_URI=mongodb://localhost:27017
REDIS_URL=redis://localhost:6379/0

# ── AI / Voice ────────────────────────────────────────────────
SARVAM_API_KEY=<from sarvam.ai>
GEMINI_API_KEY=<from aistudio.google.com>
GROQ_API_KEY=<from console.groq.com>

# ── Market Data / Weather Intelligence ────────────────────────
DATA_GOV_API_KEY=<from data.gov.in>   # optional — enables live feed
OPENWEATHERMAP_API_KEY=<optional fallback for legacy weather clients>
WEATHER_FULL_CACHE_TTL_SECONDS=3600
SOIL_COMPOSITION_CACHE_TTL_SECONDS=2592000
```

> **Security note:** Never commit your `.env` file. It is in `.gitignore` by default.

Generate a strong JWT secret:
```bash
openssl rand -hex 64
```

### 3. Build the Base Docker Image

```bash
cd kisankiawaz-backend
docker build -f Dockerfile.base -t kisan-base:latest .
```

### 4. Start All Services (Development)

```bash
docker-compose up --build
```

This starts:
- All 12 FastAPI microservices (ports 8001–8012)
- Nginx gateway (port 8000)
- MongoDB
- Redis
- Qdrant
- Celery worker

Wait for all healthchecks to pass (typically 30–60 seconds on first build).

Verify the gateway is up:
```bash
curl http://localhost:8000/api/v1/auth/health
# → {"status": "ok"}
```

### 5. Seed and Harden Data

Seed the admin user and reference datasets, then run data-quality and index hardening:

```bash
# Seed admin user
docker-compose exec auth-service python /app/scripts/seed_admin.py

# Seed reference data (mandi directory, schemes, pincode master, etc.)
docker-compose exec market-service python /app/scripts/seed_reference_data.py

# Normalize and audit ingested records (state canonicalization, date normalization)
docker-compose exec agent-service python /app/scripts/fix_and_audit_data_quality.py

# Build Mongo production indexes (nested/compound where applicable)
docker-compose exec agent-service python /app/scripts/build_production_indexes.py

# Build Qdrant vector indexes
docker-compose exec agent-service python /app/scripts/generate_qdrant_indexes.py

# Build Qdrant payload indexes for fast metadata filters
docker-compose exec agent-service python /app/scripts/build_qdrant_payload_indexes.py
```

Index and quality scripts are idempotent and safe to rerun after bulk imports.

Or trigger all via the admin API after logging in:
```bash
curl -X POST http://localhost:8000/api/v1/admin/ingestion/trigger \
  -H "Authorization: Bearer <admin_token>"
```

### 6. Production Deployment

Use the production compose file which closes all internal ports:

```bash
# Set APP_ENV in .env
APP_ENV=production

# Start with prod overrides
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

In production:
- Only port `8000` (Nginx gateway) is externally exposed
- All internal service/infra ports are closed (`ports: []`)
- JWT secret and CORS validation are enforced at startup

### 7. Set Up Cron Jobs

```bash
bash scripts/setup_cron.sh
```

This installs scheduled jobs:

| Time (IST) | Job |
|---|---|
| 02:00 | Seed reference data from data.gov.in |
| 02:30 | Rebuild Qdrant vector indexes |
| 03:00 | Generate analytics snapshots |

---

## 🗂️ Repository Structure

```
kisankiawaz/
├── kisankiawaz-backend/          # All backend microservices
│   ├── Dockerfile.base           # Shared Python 3.12 base image
│   ├── docker-compose.yml        # Development orchestration
│   ├── docker-compose.prod.yml   # Production overrides
│   ├── nginx/
│   │   └── nginx.conf            # Gateway routing, rate limits
│   │
│   ├── services/                 # 12 FastAPI microservices
│   │   ├── auth/                 # :8001
│   │   ├── farmer/               # :8002
│   │   ├── crop/                 # :8003
│   │   ├── market/               # :8004
│   │   │   └── scheme_documents/ # HTML/PDF scheme document assets
│   │   ├── equipment/            # :8005
│   │   ├── agent/                # :8006
│   │   ├── voice/                # :8007
│   │   ├── notification/         # :8008
│   │   ├── schemes/              # :8009
│   │   ├── geo/                  # :8010
│   │   ├── admin/                # :8011
│   │   └── analytics/            # :8012
│   │
│   ├── shared/                   # Cross-service shared library
│   │   ├── auth/                 # JWT helpers, auth dependencies
│   │   ├── cache/                # Market cache helpers
│   │   ├── core/                 # Settings, constants, enums
│   │   ├── db/                   # MongoDB + Redis connectors
│   │   ├── errors/               # Error codes, exceptions, handlers
│   │   ├── middleware/           # Logging, security, rate limiter
│   │   ├── patterns/             # Circuit breaker, bloom filter, service client
│   │   ├── schemas/              # Centralized Pydantic contracts (all services)
│   │   └── services/             # Key allocator, knowledge base, Qdrant service
│   │
│   ├── workers/                  # Celery async task workers
│   │   ├── celery_app.py
│   │   └── tasks/
│   │       ├── data_tasks.py     # refresh_qdrant_indexes, generate_analytics_snapshot, check_price_alerts
│   │       ├── embedding_tasks.py # embed_text, embed_batch
│   │       └── notification_tasks.py # send_notification, send_broadcast
│   │
│   ├── scripts/                  # Operational scripts
│   │   ├── seed.py
│   │   ├── seed_admin.py
│   │   ├── seed_reference_data.py
│   │   ├── seed_farmers_end_to_end.py
│   │   ├── generate_qdrant_indexes.py
│   │   ├── generate_analytics_snapshots.py
│   │   ├── replace_schemes_from_json.py
│   │   ├── replace_equipment_providers_from_json.py
│   │   ├── setup_cron.sh
│   │   └── data_ingestion/       # data.gov.in extraction pipelines
│   │
│   ├── tests/
│   │   ├── test_all_endpoints.py     # Full endpoint integration suite
│   │   ├── test_e2e_new_features.py  # Feature E2E flows
│   │   └── test_dynamic_pentest.py   # Auth, CORS, token replay security tests
│   │
│   └── creds/
│       └── .gitkeep              # Never commit real credentials here
│
├── farmer_app/                   # React Native farmer application
├── admin-dashboard/              # React admin console
└── README.md
```

### Service Internal Structure

Each microservice follows a consistent pattern:

```
services/<name>/
├── Dockerfile
├── requirements.txt
├── main.py              # FastAPI app, middleware, router registration
├── routes/
│   └── *.py             # Route handlers (thin layer — auth, validate, call service)
└── services/
    └── *_service.py     # Business logic, DB queries, external API calls
```

---

## 🔌 API Reference

All requests go through the Nginx gateway at `http://localhost:8000`.

### Authentication

```http
POST /api/v1/auth/register
POST /api/v1/auth/login
POST /api/v1/auth/refresh
GET  /api/v1/auth/me
PUT  /api/v1/auth/me
POST /api/v1/auth/change-password
POST /api/v1/auth/otp/send
POST /api/v1/auth/otp/verify
POST /api/v1/auth/password/reset
```

**Login Example:**
```bash
curl -X POST http://localhost:8000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"phone": "+919800000001", "password": "Farmer@123"}'

# Response
{
  "access_token": "eyJ...",
  "refresh_token": "eyJ...",
  "token_type": "bearer",
  "user": { "id": "...", "name": "...", "role": "farmer" }
}
```

### Farmer

```http
POST   /api/v1/farmers/profile          # Create profile
GET    /api/v1/farmers/profile          # Get my profile
PUT    /api/v1/farmers/profile          # Update profile
DELETE /api/v1/farmers/profile          # Delete profile
GET    /api/v1/farmers/dashboard        # Aggregated farmer dashboard
GET    /api/v1/farmers/                 # [Admin] List all farmers
GET    /api/v1/farmers/{farmer_id}      # [Admin] Get farmer detail
```

### Crops

```http
GET    /api/v1/crops/                   # My crops
POST   /api/v1/crops/                   # Add crop
GET    /api/v1/crops/{crop_id}          # Get crop
PUT    /api/v1/crops/{crop_id}          # Update crop
DELETE /api/v1/crops/{crop_id}          # Delete crop
GET    /api/v1/crops/cycles             # Crop cycle reference
POST   /api/v1/crops/disease/detect     # AI disease detection (image)
GET    /api/v1/crops/recommendations    # Crop recommendations
POST   /api/v1/crops/cycles             # Create cycle record
```

### Market (54 routes)

```http
# Live market data
GET  /api/v1/market/prices              # Query mandi prices
GET  /api/v1/market/msp                 # Minimum Support Prices
GET  /api/v1/market/mandis              # Mandi directory
GET  /api/v1/market/trends              # Price trends
GET  /api/v1/market/weather/full        # Aggregated weather intelligence
GET  /api/v1/market/weather/soil-composition  # SoilGrids soil composition
GET  /api/v1/market/weather/city        # Legacy weather by city (compat)
GET  /api/v1/market/weather/coords      # Legacy weather by coords (compat)
GET  /api/v1/market/weather/forecast/city    # Legacy forecast by city (compat)
GET  /api/v1/market/weather/forecast/coords  # Legacy forecast by coords (compat)
GET  /api/v1/market/soil-moisture       # Legacy soil moisture dataset

# Reference data (read-only)
GET  /api/v1/market/cold-storage        # Cold storage facilities
GET  /api/v1/market/reservoir           # Reservoir levels
GET  /api/v1/market/fasal               # FASAL crop data
GET  /api/v1/market/fertilizer          # Fertilizer advisory
GET  /api/v1/market/pesticide           # Pesticide advisory
GET  /api/v1/market/pmfby               # PMFBY insurance data

# Document builder (multi-step)
POST /api/v1/market/documents/session   # Start builder session
POST /api/v1/market/documents/extract   # Extract document data
GET  /api/v1/market/documents/download  # Download generated document

# Admin CRUD
POST   /api/v1/market/admin/price       # Upsert price record
POST   /api/v1/market/admin/mandi       # Upsert mandi
POST   /api/v1/market/admin/scheme      # Upsert market scheme
DELETE /api/v1/market/admin/price/{id}
POST   /api/v1/market/admin/sync        # Trigger live data sync
```

### Agent

```http
POST /api/v1/agent/chat                 # Send chat message
POST /api/v1/agent/chat/prepare         # Stage 1: fast partial response + request_id
POST /api/v1/agent/chat/finalize        # Stage 2: poll final enriched response
GET  /api/v1/agent/sessions             # List my sessions
GET  /api/v1/agent/sessions/{id}        # Session detail + transcript
DELETE /api/v1/agent/sessions/{id}      # Delete session
DELETE /api/v1/agent/sessions           # Delete all sessions for current user
GET  /api/v1/agent/sessions/{id}/messages
GET  /api/v1/agent/key-pool/status      # [Admin] Key pool health
POST /api/v1/agent/search               # Knowledge base search
GET  /api/v1/agent/health
```

**Chat Example:**
```bash
curl -X POST http://localhost:8000/api/v1/agent/chat \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "message": "आज दिल्ली में टमाटर का भाव क्या है?",
    "session_id": null,
    "language": "hi"
  }'
```

**Two-Phase Chat Example (partial + final):**
```bash
# 1) Prepare: immediate partial answer
curl -X POST http://localhost:8000/api/v1/agent/chat/prepare \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"message":"Nearby wheat mandi trend?","language":"en"}'

# 2) Finalize: poll with request_id from prepare response
curl -X POST http://localhost:8000/api/v1/agent/chat/finalize \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"request_id":"<prepare_request_id>","timeout_ms":30000}'
```

### Voice

```http
POST /api/v1/voice/command              # Audio → text response
POST /api/v1/voice/speak                # Audio → base64 TTS response
```

**Voice Pipeline Example:**
```bash
curl -X POST http://localhost:8000/api/v1/voice/command \
  -H "Authorization: Bearer <token>" \
  -F "audio=@/path/to/audio.wav" \
  -F "language=hi"

# Response includes latency metadata
{
  "text": "दिल्ली में आज टमाटर का मंडी भाव ₹2,400 प्रति क्विंटल है।",
  "session_id": "...",
  "latency_ms": { "stt": 820, "agent": 1240, "total": 2060 }
}
```

### Schemes

```http
POST /api/v1/schemes/search             # Search schemes
POST /api/v1/schemes/eligibility        # Check eligibility
GET  /api/v1/schemes/pmfby              # PMFBY crop insurance
GET  /api/v1/schemes/advisory           # Scheme advisory
GET  /api/v1/schemes/{scheme_id}
GET  /api/v1/schemes/
GET  /api/v1/schemes/health
```

**Scheme Search Example:**
```bash
curl -X POST http://localhost:8000/api/v1/schemes/search \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"query": "drip irrigation subsidy", "state": "Maharashtra", "limit": 5}'
```

### Equipment

```http
# Equipment
GET    /api/v1/equipment/               # My equipment listings
POST   /api/v1/equipment/               # Add equipment
PUT    /api/v1/equipment/{id}
DELETE /api/v1/equipment/{id}

# Livestock
GET    /api/v1/equipment/livestock
POST   /api/v1/equipment/livestock
PUT    /api/v1/equipment/livestock/{id}
DELETE /api/v1/equipment/livestock/{id}

# Rentals
POST   /api/v1/equipment/rentals        # Create rental request
GET    /api/v1/equipment/rentals        # My rental requests
PUT    /api/v1/equipment/rentals/{id}/approve
PUT    /api/v1/equipment/rentals/{id}/reject
PUT    /api/v1/equipment/rentals/{id}/complete
PUT    /api/v1/equipment/rentals/{id}/cancel

# Rates & Providers
GET    /api/v1/equipment/rates          # Rental rate intelligence
POST   /api/v1/equipment/providers/replace  # [Admin] Bulk provider seed
```

### Notifications

```http
GET    /api/v1/notifications/           # My notifications
PUT    /api/v1/notifications/{id}/read  # Mark as read
DELETE /api/v1/notifications/{id}
POST   /api/v1/notifications/           # [Admin] Create targeted notification
POST   /api/v1/notifications/broadcast  # [Admin] Broadcast by role/state
GET    /api/v1/notifications/preferences
PUT    /api/v1/notifications/preferences
GET    /api/v1/notifications/health
```

### Geo

```http
GET /api/v1/geo/pincode/{pincode}       # Full pincode decode
POST /api/v1/geo/village/search         # Village search
GET /api/v1/geo/districts               # District index by state
GET /api/v1/geo/states                  # All Indian states
```

### Admin

```http
# Platform stats & health
GET  /api/v1/admin/stats
GET  /api/v1/admin/health
GET  /api/v1/admin/freshness

# Configuration
GET  /api/v1/admin/config
PUT  /api/v1/admin/config
GET  /api/v1/admin/flags
PUT  /api/v1/admin/flags

# Farmer management
GET  /api/v1/admin/farmers
PUT  /api/v1/admin/farmers/{id}/status

# Admin user management
GET    /api/v1/admin/users
POST   /api/v1/admin/users
PUT    /api/v1/admin/users/{id}
DELETE /api/v1/admin/users/{id}

# Scheme & provider management
POST /api/v1/admin/schemes/upsert
POST /api/v1/admin/schemes/import
POST /api/v1/admin/providers/upsert

# Ingestion triggers
POST /api/v1/admin/ingestion/trigger
POST /api/v1/admin/ingestion/qdrant

# Audit
GET  /api/v1/admin/audit
```

### Analytics

```http
GET  /api/v1/analytics/admin/overview           # Full admin insight overview
GET  /api/v1/analytics/admin/snapshot           # Latest snapshot
POST /api/v1/analytics/admin/generate           # Generate new snapshot
GET  /api/v1/analytics/admin/trends             # Trend data
GET  /api/v1/analytics/farmer/{id}/summary      # Farmer insight summary
GET  /api/v1/analytics/farmer/{id}/benchmarks   # Farmer vs district benchmarks
GET  /api/v1/analytics/growth
GET  /api/v1/analytics/engagement
GET  /api/v1/analytics/market
GET  /api/v1/analytics/operational
GET  /api/v1/analytics/opportunities
```

---

## 🧪 Testing

### Run Full Test Suite

```bash
cd kisankiawaz-backend

# Install test dependencies
pip install -r requirements-base.txt pytest pytest-asyncio httpx

# Run endpoint integration tests
pytest tests/test_all_endpoints.py -v

# Run E2E feature flows
pytest tests/test_e2e_new_features.py -v

# Run security/pentest suite
pytest tests/test_dynamic_pentest.py -v
```

### Test Configuration

Set these in your `.env` (or export before running):

```bash
API_BASE=http://localhost:8000
TEST_PHONE=+919800000001
TEST_PASSWORD=Farmer@123
E2E_ADMIN_PHONE=<your-admin-phone>
E2E_ADMIN_PASSWORD=<your-admin-password>
MAX_CHAT_LATENCY_SECONDS=45
```

### Security Test Coverage

The pentest suite verifies:
- ✅ Refresh token replay is rejected after first use
- ✅ Non-admin callers are denied on admin-sensitive routes (403)
- ✅ CORS wildcard is blocked in non-development mode
- ✅ Tokens signed with default/weak secrets are rejected
- ✅ OTP lockout engages after repeated failed attempts

---

## ⚙️ Environment Variables Reference

| Variable | Required | Description |
|---|---|---|
| `APP_ENV` | ✅ | `development` / `staging` / `production` |
| `ALLOWED_ORIGINS` | ✅ | Comma-separated CORS origins |
| `MONGODB_URI` | ✅ | MongoDB connection string |
| `MONGODB_DB_NAME` | ✅ | Database name (default: `farmer`) |
| `REDIS_URL` | ✅ | Redis URL for cache + sessions |
| `CELERY_BROKER_URL` | ✅ | Redis URL for Celery broker |
| `CELERY_RESULT_BACKEND` | ✅ | Redis URL for Celery results |
| `QDRANT_HOST` | ✅ | Qdrant host |
| `QDRANT_PORT` | ✅ | Qdrant port (default: `6333`) |
| `JWT_SECRET` | ✅ | Min 32 chars; 64+ recommended. Rejected if weak in prod. |
| `JWT_ALGORITHM` | ✅ | `HS256` |
| `JWT_EXPIRE_MINUTES` | ✅ | Access token TTL (default: `60`) |
| `JWT_REFRESH_EXPIRE_DAYS` | ✅ | Refresh token TTL (default: `7`) |
| `SARVAM_API_KEY` | ✅ | Sarvam AI — STT/TTS for Indian languages |
| `GEMINI_API_KEY` | ✅ | Google Gemini — agent LLM |
| `GEMINI_API_KEYS` | ⬜ | Comma-separated pool (load balancing) |
| `GROQ_API_KEY` | ✅ | Groq — agent LLM fallback |
| `GROQ_API_KEYS` | ⬜ | Comma-separated pool |
| `GROQ_MODEL` | ✅ | Default: `llama-3.3-70b-versatile` |
| `OPENWEATHERMAP_API_KEY` | ⬜ | Optional legacy weather fallback |
| `DATA_GOV_API_KEY` | ⬜ | data.gov.in — enables live market feed |
| `WEATHER_FULL_CACHE_TTL_SECONDS` | ⬜ | Aggregated weather cache TTL (default: `3600`) |
| `SOIL_COMPOSITION_CACHE_TTL_SECONDS` | ⬜ | SoilGrids cache TTL (default: `2592000`) |
| `VOICE_STT_TIMEOUT_SECONDS` | ⬜ | Default: `12` |
| `VOICE_AGENT_TIMEOUT_SECONDS` | ⬜ | Default: `20` |
| `VOICE_AGENT_MAX_RETRIES` | ⬜ | Default: `3` |
| `VOICE_MAX_TTS_CHARS` | ⬜ | Max chars for TTS output. Default: `220` |
| `KEY_BASE_COOLDOWN_SECONDS` | ⬜ | Key pool base cooldown. Default: `20` |
| `KEY_ROUTER_MAX_RETRIES` | ⬜ | Key pool max retries. Default: `3` |

---

## 🏗️ Development Guide

### Local Development (Without Docker)

If you prefer running services locally without Docker:

```bash
cd kisankiawaz-backend

# Create virtual environment
python3.12 -m venv venv
source venv/bin/activate

# Install shared + base requirements
pip install -r requirements-base.txt

# Install a specific service's requirements
pip install -r services/auth/requirements.txt

# Run a specific service
cd services/auth
uvicorn main:app --host 0.0.0.0 --port 8001 --reload
```

You'll need MongoDB, Redis, and Qdrant running locally or via Docker:

```bash
# Start only infra services
docker-compose up mongodb redis qdrant -d
```

### Adding a New Service

1. Create `services/<name>/` following the standard structure
2. Add `Dockerfile` extending `kisan-base:latest`
3. Register route prefix in `nginx/nginx.conf`
4. Add service URL to `.env.example`
5. Add to `docker-compose.yml`
6. Add shared schemas to `shared/schemas/<name>.py` and export from `shared/schemas/__init__.py`

### Shared Schema Contracts

All request/response models live in `shared/schemas/`. **Always** define schemas there, never in individual service code. Import from the shared package:

```python
from shared.schemas.market import MandiPriceQuery, MandiPriceResponse
from shared.schemas.farmer import FarmerProfileCreate
```

Schema validation rules:
- Pydantic strict mode enabled
- `extra = "forbid"` on most request models
- Field-level constraints (min/max length, numeric bounds, enum literals)

---

## 🤝 Contributing

We welcome contributions! KisanKiAwaaz is building for rural India — if you care about agricultural technology, digital equity, or AI for social impact, this is your project.

### How to Contribute

1. **Fork** the repository
2. **Create** a feature branch: `git checkout -b feature/your-feature-name`
3. **Follow** the shared schema convention — all contracts in `shared/schemas/`
4. **Write tests** — add to `tests/test_all_endpoints.py` or `test_e2e_new_features.py`
5. **Commit** with clear messages: `feat(market): add fertilizer price trend endpoint`
6. **Push** and open a **Pull Request** against `main`

### Commit Convention

```
feat(service): short description
fix(auth): resolve OTP cooldown race condition
docs(readme): update setup flow
refactor(shared): move validation to schema layer
test(voice): add STT timeout test
```

### Areas We Need Help

- 🌐 **Translations** — scheme documents and UI strings in more Indian languages
- 📱 **React Native** — farmer app improvements and offline support
- 🧪 **Testing** — more E2E coverage, load testing
- 📊 **Data** — better reference datasets for smaller states
- 🔒 **Security** — pen testing, CVE scanning integration
- 📖 **Documentation** — API guides, deployment guides for GCP/AWS

---

## 🌐 Supported Languages

The voice pipeline and agent system support:

| Language | Code | STT | TTS |
|---|---|---|---|
| Hindi | `hi` | ✅ | ✅ |
| Marathi | `mr` | ✅ | ✅ |
| Punjabi | `pa` | ✅ | ✅ |
| Telugu | `te` | ✅ | ✅ |
| Tamil | `ta` | ✅ | ✅ |
| Kannada | `kn` | ✅ | ✅ |
| Gujarati | `gu` | ✅ | ✅ |
| Bengali | `bn` | ✅ | ✅ |
| English | `en` | ✅ | ✅ |

Language preference is stored per farmer in their profile and used by the agent for all responses.

---

## 🗺️ Roadmap

- [ ] Offline-first mode for farmer app (low-connectivity areas)
- [ ] WhatsApp Business API integration for scheme notifications
- [ ] ONDC (Open Network for Digital Commerce) integration
- [ ] Satellite imagery integration for crop health monitoring
- [ ] FPO (Farmer Producer Organisation) management module
- [ ] Direct mandi buyer-seller connection (AgriTrade module)
- [ ] Kisan Credit Card (KCC) application flow integration
- [ ] Regional language voice training feedback loop

---

## 📄 License

This project is licensed under the **MIT License** — see [LICENSE](LICENSE) for details.

---

## 🙏 Acknowledgements

- [Sarvam AI](https://sarvam.ai) — for Indian language STT/TTS models
- [data.gov.in](https://data.gov.in) — for agricultural open datasets
- [Qdrant](https://qdrant.tech) — for the vector search engine
- [FastAPI](https://fastapi.tiangolo.com) — for the microservice framework
- Every farmer in India whose problem this platform is trying to solve

---

<div align="center">

**Built with ❤️ for Indian Farmers**

*If this project helps even one farmer get a better price for their crop, it's worth it.*

[![GitHub stars](https://img.shields.io/github/stars/vvinayakkk/kisankiawaz?style=social)](https://github.com/vvinayakkk/kisankiawaz)
[![GitHub forks](https://img.shields.io/github/forks/vvinayakkk/kisankiawaz?style=social)](https://github.com/vvinayakkk/kisankiawaz/fork)

</div>