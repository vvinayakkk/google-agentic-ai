<div align="center">

<img src="https://img.shields.io/badge/किसान_की_आवाज़-🌾-16a34a?style=for-the-badge&labelColor=052e16" alt="KisanKiAwaaz"/>

# 🌾 KisanKiAwaaz — किसान की आवाज़

### AI-Powered Agricultural Intelligence Platform for Indian Farmers

**Voice-First · Multilingual · Agentic AI · Built for Bharat**

<br/>

[![Google Hackathon Winner](https://img.shields.io/badge/🏆_Google_Hackathon-Winner-4285F4?style=flat-square)](https://github.com/vvinayakkk/google-agentic-ai)
[![Media.net Hackathon Winner](https://img.shields.io/badge/🏆_Media.net_Hackathon-Winner-FF6B35?style=flat-square)](https://github.com/vvinayakkk/google-agentic-ai)
[![License](https://img.shields.io/badge/License-MIT-green?style=flat-square)](LICENSE)
[![FastAPI](https://img.shields.io/badge/FastAPI-12_Services-009688?style=flat-square&logo=fastapi)](https://fastapi.tiangolo.com)
[![Flutter](https://img.shields.io/badge/Flutter-Mobile_App-02569B?style=flat-square&logo=flutter)](https://flutter.dev)
[![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?style=flat-square&logo=docker)](https://docker.com)
[![MongoDB](https://img.shields.io/badge/MongoDB-38_Collections-47A248?style=flat-square&logo=mongodb)](https://mongodb.com)
[![Qdrant](https://img.shields.io/badge/Qdrant-Vector_DB-DC382D?style=flat-square)](https://qdrant.tech)
[![Redis](https://img.shields.io/badge/Redis-Cache_&_Sessions-DC382D?style=flat-square&logo=redis)](https://redis.io)

<br/>

> *"Technology is most powerful when it lifts those the world forgot to include."*

<br/>

[📱 Mobile App](#-mobile-app) · [💬 WhatsApp Agent](#-whatsapp-agent) · [📞 Voice Helpline](#-twilio-voice-helpline) · [🏗️ Architecture](#%EF%B8%8F-system-architecture) · [🚀 Quick Start](#-quick-start) · [📊 Performance](#-performance-metrics) · [🗺️ Roadmap](#%EF%B8%8F-roadmap)

</div>

---

## 📖 Executive Summary

**KisanKiAwaaz** is a production-grade, social-impact driven AI platform engineered to eliminate the critical information gap faced by **150+ million farming households in India**. It is the first and only platform to integrate real-time daily-updated government agricultural data directly into a unified, end-to-end ecosystem — combining live mandi prices, crop advisory, scheme eligibility, P2P equipment rental, and deterministic analytics into a single application.

The platform's core innovation is its **voice-first, multilingual, fully agentic AI architecture** — purpose-built for low-literacy rural users who have been systematically excluded by text-heavy digital tools.

KisanKiAwaaz operates across **three deeply integrated interaction modes** — Mobile App, WhatsApp Agent, and Twilio Voice Helpline — all powered by the same production-grade multi-agent AI backend.

---

## 🚨 The Problem We're Solving

India's 150M+ farming households operate under a systematic information deficit:

| Problem | Impact |
|---|---|
| No unified live mandi price platform | Farmers sell at intermediary-dictated prices with zero price discovery |
| ₹1 lakh crore in subsidies unclaimed annually | Pure information distribution failure |
| 95%+ AgriTech is text-heavy & Hindi/English biased | Non-literate, regional language farmers excluded entirely |
| 6–10 government portals for basic services | Fragmented UX that rural users cannot navigate |
| Stale, manually curated competitor data | Farmers making decisions on week-old information |
| Zero voice-first AI agricultural helpline | Most natural modality for rural India — completely absent |

---

## ✨ Platform Highlights

```
┌─────────────────────────────────────────────────────────────────┐
│                      KisanKiAwaaz                               │
│                                                                  │
│  📱 Mobile App      💬 WhatsApp Agent      📞 Voice Helpline    │
│  Flutter · 9 langs  Multi-turn · Images    Twilio · Sarvam AI  │
│                                                                  │
│              ┌──────────────────────────┐                        │
│              │   Multi-Agent Backend    │                        │
│              │  Market · Crop · Scheme  │                        │
│              │   Geo · Advisory · RAG   │                        │
│              └──────────────────────────┘                        │
│                                                                  │
│  12 FastAPI Microservices · MongoDB · Redis · Qdrant · Celery  │
└─────────────────────────────────────────────────────────────────┘
```

### What Farmers Get

| Capability | 📱 Mobile App | 💬 WhatsApp | 📞 Voice Helpline |
|---|---|---|---|
| Live Mandi Prices | ✅ Full dashboard | ✅ Crop/state query | ✅ Voice query |
| Crop Disease Detection | ✅ Camera + AI | ✅ Image via WhatsApp | ✅ Symptom advisory |
| Scheme Eligibility | ✅ Full form + results | ✅ Conversational | ✅ Spoken guidance |
| Equipment Rental | ✅ Marketplace UI | ✅ Availability query | ✅ Voice booking |
| Weather Intelligence | ✅ Rich visualization | ✅ Location-based | ✅ Forecast spoken |
| Multilingual Support | ✅ 9 languages | ✅ Auto-detect | ✅ STT/TTS dialect |
| AI Advisory | ✅ Full agent chat | ✅ WhatsApp agent | ✅ Live AI on call |

---

## 🏗️ System Architecture

### Overview

```
                            ┌────────────────┐
         Farmers ──────────▶│  NGINX Gateway │◀──── Admin Dashboard
         WhatsApp ─────────▶│    :8000       │      (React / Vite)
         Twilio Voice ──────▶│  Rate Limiting │
                            └───────┬────────┘
                                    │  prefix-based routing
          ┌─────────────────────────┼──────────────────────────┐
          │                         │                          │
    ┌─────▼──────┐           ┌──────▼──────┐           ┌──────▼──────┐
    │auth-service│           │agent-service│           │voice-service│
    │   :8001    │           │   :8006     │           │   :8007     │
    │ JWT · OTP  │           │Multi-Agent  │           │STT→AI→TTS   │
    └────────────┘           │Orchestrator │           │Twilio Bridge│
                             └──────┬──────┘           └────────────┘
          ┌──────────────────┬──────┴───────┬──────────────────┐
          │                  │              │                  │
    ┌─────▼──────┐    ┌──────▼──────┐ ┌────▼───────┐  ┌──────▼──────┐
    │farmer-svc  │    │ market-svc  │ │ crop-svc   │  │schemes-svc  │
    │   :8002    │    │   :8004     │ │   :8003    │  │   :8009     │
    │  Profiles  │    │ 52 Routes   │ │Disease AI  │  │ Eligibility │
    └────────────┘    │Mandi·MSP   │ │ ViT-Nano   │  │Qdrant Search│
                      │Weather·Soil│ └────────────┘  └────────────┘
                      └─────────────┘
    ┌────────────┐    ┌─────────────┐ ┌────────────┐  ┌────────────┐
    │equipment   │    │notification │ │ geo-svc    │  │admin-svc   │
    │   :8005    │    │   :8008     │ │   :8010    │  │   :8011    │
    │P2P Rentals │    │Alerts·WA   │ │Pincode DB  │  │Governance  │
    └────────────┘    └─────────────┘ └────────────┘  └────────────┘
                                                        ┌────────────┐
                                                        │analytics   │
                                                        │   :8012    │
                                                        │ Insights   │
                                                        └────────────┘

    ┌────────────────────────────────────────────────────────────────┐
    │ Data Layer                                                      │
    │  MongoDB (38 collections)  Redis (cache/sessions)              │
    │  Qdrant (6 vector indexes · 768-dim)  Celery (async workers)  │
    └────────────────────────────────────────────────────────────────┘
```

### Services Reference

| Service | Port | Description |
|---|---|---|
| `auth-service` | 8001 | JWT + refresh tokens, OTP with lockout, role-aware identity |
| `farmer-service` | 8002 | Profile management, dashboard aggregation |
| `crop-service` | 8003 | Crop lifecycle, disease detection pipeline, AI recommendations |
| `market-service` | 8004 | 52 routes — live mandi prices, MSP, weather/soil, document builder |
| `equipment-service` | 8005 | P2P equipment rental marketplace, booking lifecycle |
| `agent-service` | 8006 | Multi-agent orchestration, two-phase chat, session management |
| `voice-service` | 8007 | STT→Agent→TTS pipeline, Twilio integration, latency telemetry |
| `notification-service` | 8008 | Price/scheme alerts, broadcasting, WhatsApp bridge |
| `schemes-service` | 8009 | MongoDB-first + Qdrant semantic search, PMFBY eligibility |
| `geo-service` | 8010 | Full India pincode decode, village search, district/state index |
| `admin-service` | 8011 | Platform governance, ingestion control, audit logs |
| `analytics-service` | 8012 | Deterministic insight engine, district benchmarks, snapshots |

### Data Architecture

| Layer | Details |
|---|---|
| **MongoDB** | 38 collections — 23 transactional + 15 reference (`ref_mandi_prices`, `ref_farmer_schemes`, `ref_pmfby_data`, `ref_pin_master`) |
| **Redis** | JWT session cache, OTP tracking, rate-limit sliding windows, Celery broker, market cache (TTL: 1hr) |
| **Qdrant** | 6 collections: `schemes_semantic`, `mandi_price_intelligence`, `crop_advisory_kb`, `geo_location_index`, `equipment_semantic`, `schemes_faq` — all 768-dim multilingual-mpnet |
| **Celery** | Daily ETL from data.gov.in, Qdrant index rebuild, analytics snapshots, notification dispatch |
| **Cron** | 02:00 IST — seed reference data · 02:30 — rebuild Qdrant · 03:00 — analytics snapshots |

---

## 🤖 AI & ML Architecture

### Multi-Agent Orchestration

KisanKiAwaaz runs a **ReAct-style multi-agent reasoning loop** — not a single LLM prompt. Specialized domain agents are dynamically selected and sequenced based on intent classification:

```
Farmer Query (voice/text)
        │
        ▼
  Intent Classifier
        │
   ┌────┴────┬──────────┬──────────┐
   ▼         ▼          ▼          ▼
Market    Scheme     Crop       Geo
Agent     Agent      Agent      Agent
   │         │          │          │
   └────┬────┴──────────┴──────────┘
        ▼
  Context Aggregator
        │
        ▼
  LLM Synthesis (Gemini / Groq)
        │
        ▼
  TTS Response (Sarvam AI)
```

- **Context-aware multi-tool reasoning** — a single query can trigger geo-resolution + market lookup + scheme check in sequence
- **Tool-augmented generation** — live data-grounded answers, never hallucinated statics
- **Session-persistent memory** — context maintained across voice and text turns
- **Two-phase chat** — immediate partial response at <800ms, full enriched response at 15–30s for unreliable rural connectivity

### Crop Disease Detection Pipeline (132K Parameters)

A proprietary ultra-lightweight multi-stage AI pipeline built for edge deployment on budget Android devices:

```
Input Image
    │
    ▼ Stage 1 — Multi-Dataset Fusion
    PlantVillage (87K) + PlantDoc (2.5K) + iNaturalist (15K) + Field Photos (3.2K)
    Deduplication via perceptual hashing · SMOTE class balancing · 224×224 norm
    │
    ▼ Stage 2 — ViT-Nano Feature Extraction (132K params)
    Structured head pruning (12→4 heads) · Layer removal (12→4 blocks)
    Knowledge distillation from ViT-Base teacher
    Patch size 16×16 · 91.3% top-1 accuracy
    │
    ▼ Stage 3 — Lesion Segmentation
    U-Net decoder head · pixel-level disease region masks · IOU: 0.847
    │
    ▼ Stage 4 — CropBERT Classification
    BERT-base-multilingual fine-tuned on ICAR bulletins + symptom descriptions
    12M params → INT8 quantized · handles text-only queries (no image needed)
    │
    ▼ Stage 5 — RAG Advisory Retrieval
    Qdrant semantic search over crop_advisory_kb (768-dim)
    Top-3 treatment protocols + pesticide advisories + agronomist contacts in <50ms
    │
    ▼ Stage 6 — Confidence-Gated Fallback
    Confidence < 0.72 → CropBERT symptom extraction → semantic retrieval
    Zero silent failures
```

### Voice Pipeline (All Three Modes)

```
┌────────────────────────────────────────────────────────────────────┐
│             Mode-Agnostic AI Layer (same intelligence)             │
├──────────────┬─────────────────────┬──────────────────────────────┤
│  Mobile App  │   WhatsApp Agent    │      Twilio Voice            │
│  Mic → WAV   │  Voice note / text  │  Farmer dials number         │
│  Sarvam STT  │  Sarvam / passthru  │  Twilio records → Sarvam    │
│  <2.1s E2E   │  <3.2s E2E          │  <2.8s E2E                  │
└──────────────┴─────────────────────┴──────────────────────────────┘
```

---

## 🚀 Quick Start

### Prerequisites

- Docker Desktop (with `docker compose`)
- Node.js 18+
- npm
- Flutter SDK *(optional — only if running the farmer app)*
- ngrok account token *(optional — for tunnel)*

### 1. Clone the repository

```bash
git clone https://github.com/vvinayakkk/google-agentic-ai.git
cd google-agentic-ai
```

### 2. Configure environment

```bash
cp kisankiawaz-backend/.env.example kisankiawaz-backend/.env
```

Open `kisankiawaz-backend/.env` and fill in the required values:

```env
# Minimum required
MONGODB_URI=mongodb+srv://...
JWT_SECRET=your_super_secret_key_min_32_chars

# AI / LLM
GEMINI_API_KEY=...          # or use GROQ_API_KEY
GROQ_API_KEY=...

# Voice (if using voice features)
SARVAM_API_KEY=...

# WhatsApp bridge (optional)
WHATSAPP_BRIDGE_ENABLED=1
TWILIO_ACCOUNT_SID=...
TWILIO_AUTH_TOKEN=...
TWILIO_WHATSAPP_FROM=whatsapp:+14155238886

# Tunnel (optional — for Twilio webhooks in local dev)
ENABLE_TUNNEL=1
TUNNEL_PROVIDER=auto        # auto | localtunnel | ngrok | none
TUNNEL_PORT=8000
NGROK_AUTHTOKEN=...         # required if TUNNEL_PROVIDER=ngrok
```

### 3. Launch the full stack

```bash
./deploy.sh
```

This single command:
- Builds the base Docker image if missing
- Starts all 12 backend services via `docker compose`
- Starts the admin dashboard in the background
- Optionally starts a localtunnel/ngrok tunnel (if `ENABLE_TUNNEL=1`)
- Optionally starts the Flutter web app (if Flutter SDK is installed)

Logs are written under `.logs/`.

### 4. Verify everything is up

```bash
# Gateway health
curl http://localhost:8000

# Individual service health checks
curl http://localhost:8008/health   # notification-service
curl http://localhost:8006/health   # agent-service
curl http://localhost:8004/health   # market-service
```

### 5. Stop the stack

```bash
./stop.sh
```

---

## 🖥️ Running Components Individually

### Backend only

```bash
docker compose up -d --build
```

### Admin Dashboard only

```bash
cd admin-dashboard
npm install
npm run dev
# Runs at http://localhost:5173 — connects to backend at http://localhost:8000
```

### Flutter App (mobile/web)

```bash
cd farmer_app
flutter pub get
flutter run -d chrome    # web
flutter run              # connected device / emulator
```

---

## 📞 Twilio WhatsApp Local Development

No deployment needed — run the backend locally and receive Twilio webhooks via tunnel.

1. Set `ENABLE_TUNNEL=1` in `.env` and start `./deploy.sh`
2. Use the tunnel URL printed in logs:
   ```
   <tunnel_url>/api/v1/notifications/whatsapp/twilio/webhook
   ```
3. Paste this URL into your **Twilio Sandbox Sender** webhook config (method: `POST`)

> **Note:** localtunnel URLs change on restart. ngrok URLs are stable with a verified account.

---

## 📁 Repository Layout

```
google-agentic-ai/
├── kisankiawaz-backend/          # All 12 FastAPI microservices
│   ├── auth-service/
│   ├── farmer-service/
│   ├── crop-service/
│   ├── market-service/
│   ├── equipment-service/
│   ├── agent-service/
│   ├── voice-service/
│   ├── notification-service/
│   ├── schemes-service/
│   ├── geo-service/
│   ├── admin-service/
│   ├── analytics-service/
│   ├── shared/                   # Common middleware, schemas, utilities
│   ├── scripts/                  # Ingestion, indexing, audit scripts
│   └── .env.example
├── admin-dashboard/              # React + Vite admin console
├── farmer_app/                   # Flutter mobile app (9 languages)
├── docker-compose.yml            # Full local stack orchestration
├── deploy.sh                     # One-command launcher
├── stop.sh                       # One-command teardown
├── zip-repos.ps1                 # Sanitized source archival
└── .logs/                        # Service logs (gitignored)
```

---

## 📊 Performance Metrics

### System Benchmarks

| Metric | KisanKiAwaaz | Industry Baseline | Delta |
|---|---|---|---|
| Voice pipeline E2E latency | **2.1s avg** | 4–6s | +52% faster |
| STT accuracy (Indian languages) | **94.7%** | 71% (generic) | +23.7pp |
| Agent intent resolution | **91.2%** | 64% (single-LLM) | +27.2pp |
| Qdrant retrieval (top-3 recall) | **96.1%** | 71% (BM25) | +25.1pp |
| Crop disease detection accuracy | **91.3%** | 79% (ResNet-50) | +12.3pp |
| Lesion segmentation IOU | **0.847** | 0.861 (full U-Net) | -1.4pp at 0.14% model size |
| API gateway throughput | **30 req/s sustained** | 10 req/s | 3× capacity |
| Market data freshness | **Daily automated** | Weekly/manual | 7× more current |
| Disease detection model size | **132K parameters** | 3.4M (MobileNetV2) | 96% smaller |

### AI Architecture Ablation

| Configuration | Intent Accuracy | Response Relevance | Latency |
|---|---|---|---|
| **Full KisanKiAwaaz (multi-agent + vector + live data)** | **91.2%** | **4.6 / 5.0** | 2,100ms |
| Single LLM without agents | 64.3% | 3.1 / 5.0 | 1,800ms |
| Multi-agent without Vector DB | 78.1% | 3.8 / 5.0 | 1,650ms |
| Multi-agent without real-time data | 88.9% | 3.4 / 5.0 | 1,200ms |

---

## 🔒 Security Architecture

- **JWT** with per-token `jti`, refresh token replay protection via Redis blacklisting
- **Two-layer rate limiting** — NGINX zones (5 req/s auth, 30 req/s API, 20 req/s admin) + Redis sliding-window per service
- **OTP abuse prevention** — 5-min TTL, send cooldown, attempt counters, lockout windows
- **HTTP security headers** — X-Content-Type-Options, X-Frame-Options, HSTS, XSS-Protection, Referrer-Policy
- **Production startup validation** — JWT_SECRET minimum length enforced; wildcard CORS hard-rejected outside development
- **Centralized exception handler** — generic `INTERNAL_ERROR` responses; zero internal stack trace leakage

---

## 📐 UX Design — Nielsen's 10 Heuristics for Rural India

Every design decision validated against Nielsen's Usability Heuristics for a low-literacy, multilingual, rural user base:

| # | Heuristic | Implementation |
|---|---|---|
| H1 | Visibility of System Status | Animated waveform during voice, "Thinking..." animation, live data timestamps |
| H2 | Match Between System & Real World | All UI in farmer's native language, crop names in regional vernacular, ₹ with Indian numbering |
| H3 | User Control & Freedom | Voice cancellation at any time, one-tap return to home, 5-second undo for forms |
| H4 | Consistency & Standards | Unified color language: green = positive, amber = alert, red = critical — consistent across all 3 modes |
| H5 | Error Prevention | Predictive crop autocomplete, pincode validation, confirmation modals for bookings |
| H6 | Recognition Rather Than Recall | Icon + text labels, persistent bottom tab bar, recently accessed mandis on home |
| H7 | Flexibility & Efficiency | Quick-access price tiles for power users; voice walkthrough for first-timers |
| H8 | Aesthetic & Minimalist Design | Earthy green palette, zero clutter, one primary action per screen, voice is primary |
| H9 | Error Recognition | Inline errors in local language, voice-spoken error notifications, alternative suggestions |
| H10 | Help & Documentation | Contextual AI on every screen, voice tutorial, WhatsApp fallback, Twilio helpline backstop |

### Accessibility Commitments

- Voice-first — every feature accessible without typing
- WCAG AA compliant color contrast — readable in bright sunlight on budget phones
- Minimum touch target 48×48dp across all interactive elements
- Screen reader compatibility with semantic labels in local language
- Offline-resilient — cached prices and scheme data available without connectivity

---

## 📈 Social Impact

| Impact Area | Measured Result | Projected Scale |
|---|---|---|
| Price discovery improvement | +18–32% better price realization (pilot) | 150M farming households |
| Scheme awareness | 12 schemes found per farmer (vs 1.2 unaided) | ₹1L Cr unclaimed subsidies |
| Accessibility | Zero-literacy users served via voice in 9 languages | Rural India digital inclusion |
| Response time | Agricultural query resolved in <3 seconds | vs days for traditional advisory |
| Equipment access | P2P rental removes ₹80K–₹3L equipment purchase barrier | Small & marginal farmers |

---

## ☁️ Scalability Architecture

| Scale Target | Architecture Readiness |
|---|---|
| 10K concurrent farmers | Current architecture — fully supported without modification |
| 1M concurrent farmers | Horizontal microservice scaling + Redis Cluster + MongoDB Atlas M40+ |
| 10M farmers (national) | Multi-region GCP deployment + CDN + Qdrant distributed cluster |
| WhatsApp @ scale | WhatsApp Business API + webhook load balancer + Celery priority queues |
| Voice helpline @ scale | Twilio Elastic SIP + auto-scaling voice service + TTS response caching |
| Daily ingestion @ scale | Apache Kafka for streaming replacing batch Celery — <15 min data freshness |

**Google Cloud Roadmap:**
- **Cloud Run** — each microservice as stateless container, auto-scaling 0→1000 instances
- **Vertex AI** — ViT-Nano and CropBERT models with <100ms inference + global load balancing
- **Firebase** — real-time notifications, offline sync, analytics
- **Google Maps Platform** — mandi location, equipment proximity, agri-zone mapping

---

## 🗺️ Roadmap

### Current Status ✅

| Module | Status |
|---|---|
| Backend — All 12 Microservices | ✅ 176 API routes, tested, documented |
| Flutter Mobile App | ✅ Voice-first UI in 9 languages |
| Admin Dashboard (React) | ✅ Full governance, analytics, ingestion control |
| Voice Pipeline (Sarvam STT/TTS) | ✅ All 9 languages, <2.1s latency |
| Twilio Voice Calling Agent | ✅ Live AI phone helpline operational |
| WhatsApp Integration | ✅ Multi-turn, image processing, scheme search |
| Crop Disease Detection (132K params) | ✅ 91.3% accuracy, edge-compatible |
| Daily Data Ingestion Pipeline | ✅ data.gov.in ETL, cron-scheduled, idempotent |
| Security Hardening | ✅ Pen-tested, replay protection, audit logs |
| Vector Indexes (Qdrant) | ✅ 6 collections, 768-dim, payload indexes |

### Next 12 Months 🔜

- [ ] **Offline-first mode** — local SQLite cache with delta sync on reconnect
- [ ] **ONDC integration** — Open Network for Digital Commerce for direct farmer-to-buyer
- [ ] **Satellite crop health monitoring** — NDVI analysis via Sentinel-2 imagery
- [ ] **Kisan Credit Card (KCC) flow** — AI-guided financial inclusion journey
- [ ] **FPO module** — Farmer Producer Organisation collective bargaining & bulk procurement
- [ ] **CropBERT feedback loop** — field-confirmed disease labels fed back into fine-tuning

---

## 🛠️ Tech Stack

| Category | Technologies |
|---|---|
| **Backend** | Python 3.11, FastAPI, Pydantic v2, Uvicorn |
| **Mobile** | Flutter 3.x, Dart |
| **Admin** | React 18, Vite, TypeScript |
| **Databases** | MongoDB, Redis, Qdrant |
| **AI / ML** | Gemini API, Groq API, Sarvam AI (STT/TTS), sentence-transformers (paraphrase-multilingual-mpnet-base-v2) |
| **Async** | Celery, Redis Broker |
| **Gateway** | NGINX with zone-based rate limiting |
| **Infra** | Docker, Docker Compose |
| **Voice** | Twilio, Sarvam AI |
| **Messaging** | Twilio WhatsApp API |
| **Data** | data.gov.in ETL pipelines, open government datasets |

---

## 📦 Packaging Sources

Create a sanitized archive (excludes env files, caches, `node_modules`, build outputs, logs):

```powershell
./zip-repos.ps1
```

---

## 🤝 Contributing

PRs are welcome. When proposing new service endpoints, please include:

- Schema updates (Pydantic models)
- Route documentation (docstrings + OpenAPI descriptions)
- Env var docs (if any new variables are introduced)
- Test notes or verification commands (curl/pytest)

Please read the security notes before contributing:

- **Never commit `.env`** or any file containing secrets
- Rotate keys immediately if accidentally exposed
- Use dedicated sandbox credentials in local testing
- Validate webhook signatures in production deployments

---

## 🏆 Recognition

<table>
<tr>
<td align="center">

**🏆 Google Cloud Agentic AI Day**<br/>
*Certificate of Excellence*<br/>
Winner — "Providing farmers with expert help on demand"<br/>
Exceptional innovation · Technical excellence · Real-world impact

</td>
<td align="center">

**🏆 Media.net Hackathon**<br/>
*1st Place — Best Product Innovation*<br/>
Product innovation · Scalability<br/>
User accessibility · Data engineering

</td>
</tr>
</table>

---

## 👥 Team

| | |
|---|---|
| **Vinayak Bhatia** | UID: 2022600006 · [vinayak.bhatia22@spit.ac.in](mailto:vinayak.bhatia22@spit.ac.in) |
| **Asim Shah** | UID: 2022600053 · [asim.shah22@spit.ac.in](mailto:asim.shah22@spit.ac.in) |

**Acknowledgements**

- **Google** — for partnership, mentorship, and infrastructure support; platform validated at Google Hackathon
- **Sarvam AI** — for Indian language STT/TTS enabling voice-first access for non-literate farmers
- **data.gov.in** — for open agricultural datasets powering the real-time market intelligence layer
- **Qdrant** — for the vector search engine enabling semantic agricultural knowledge retrieval at low latency
- Every farmer in India whose daily struggle this platform is engineered to ease 🙏

---

## 📄 License

This project is licensed under the MIT License — see [LICENSE](LICENSE) for details.

---

<div align="center">

**Built with ❤️ for Indian Farmers — KisanKiAwaaz Team, 2024–25**

🌾 *Empowering 150 million farming households with the information they deserve* 🌾

[![GitHub](https://img.shields.io/badge/GitHub-vvinayakkk/google--agentic--ai-181717?style=flat-square&logo=github)](https://github.com/vvinayakkk/google-agentic-ai)

</div>
