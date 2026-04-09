# KisanKiAwaaz

AI operating system for agriculture in India: voice-first advisory, market intelligence, schemes navigation, equipment rental, documents, and admin governance.

## Feature Tags

- `#VoiceFirst` low-friction STT -> AI -> TTS pipeline for field users
- `#Multilingual` Hindi + Indian language support across chat/voice
- `#AgenticAI` tool-orchestrated assistant with live data + knowledge context
- `#MarketIntel` mandi prices, trends, MSP context, and sell-side signals
- `#SchemeNavigator` discovery + eligibility + document assistance for schemes
- `#DocumentBuilder` guided form prep, preview, and vault workflows
- `#EquipmentNetwork` rental marketplace + provider/rate intelligence
- `#GeoAware` pincode, district, village, and locality-aware responses
- `#Notifications` preferences, alerts, broadcast workflows
- `#AdminControl` auditable operations, ingestion, and platform controls
- `#Microservices` 12 FastAPI services behind gateway routing
- `#OpenSourceReady` modular architecture, scripts, docs, and local-first flows

## Why This Project Exists

Small and mid-scale farmers lose money and time because critical information is fragmented:

- prices are delayed or hard to compare
- scheme eligibility is confusing
- documentation workflows are painful
- advisory is not always in local language
- equipment access is operationally fragmented

KisanKiAwaaz unifies these into one platform with assistant-led interactions, practical workflows, and admin observability.

## What You Get

- AI chat and voice assistant over real agricultural contexts
- market + mandi insights and trends
- scheme guidance and form/document workflows
- equipment and rental operations
- user notifications and preference management
- admin dashboard for platform-level controls

## Repository Layout

- `kisankiawaz-backend/` backend microservices, shared packages, scripts
- `admin-dashboard/` React + Vite administrative console
- `farmer_app/` Flutter client app
- `docker-compose.yml` full local stack orchestration
- `deploy.sh` one-command local launcher (backend + admin + optional tunnel)
- `stop.sh` one-command stop/cleanup
- `zip-repos.ps1` sanitized source archival script

## Architecture Summary

- Gateway: Nginx (`:8000`)
- Services: 12 FastAPI services (`:8001` to `:8012`)
- Data: MongoDB + Redis + Qdrant
- Workers: Celery for async/background workflows
- Frontend Admin: React/Vite
- Farmer App: Flutter

## Services

- `auth-service` authentication, JWT, OTP
- `farmer-service` farmer profile and dashboard surfaces
- `crop-service` crop lifecycle and disease/recommendation interfaces
- `market-service` mandi, market, weather/soil, scheme-doc workflows
- `equipment-service` equipment/livestock and rental operations
- `agent-service` assistant orchestration and chat lifecycle
- `voice-service` STT/TTS + voice command orchestration
- `notification-service` notifications, preferences, WhatsApp bridge
- `schemes-service` scheme search and eligibility logic
- `geo-service` geo lookup and locality context
- `admin-service` governance and operational controls
- `analytics-service` operational and agricultural insight APIs

## Quick Start (Local, End-to-End)

### 1) Prerequisites

- Docker Desktop (with `docker compose`)
- Node.js 18+
- npm
- Optional: Flutter SDK (if you also run farmer app from launcher)
- Optional: ngrok account token (if you prefer ngrok over localtunnel)

### 2) Configure environment

```bash
cp kisankiawaz-backend/.env.example kisankiawaz-backend/.env
```

Fill values in `kisankiawaz-backend/.env`.

Minimum required:

- `MONGODB_URI`
- `JWT_SECRET`
- `SARVAM_API_KEY` (if voice used)
- `GEMINI_API_KEY` or `GROQ_API_KEY` (for agent paths)

For WhatsApp bridge:

- `WHATSAPP_BRIDGE_ENABLED=1`
- `TWILIO_ACCOUNT_SID=...`
- `TWILIO_AUTH_TOKEN=...`
- `TWILIO_WHATSAPP_FROM=whatsapp:+14155238886`

For launcher tunnel behavior:

- `ENABLE_TUNNEL=1`
- `TUNNEL_PROVIDER=auto` (`auto|localtunnel|ngrok|none`)
- `TUNNEL_PORT=8000`
- optional `NGROK_AUTHTOKEN=...`

### 3) Start everything

```bash
./deploy.sh
```

This script will:

- ensure backend env file exists
- build base image if missing
- start all backend services via docker compose
- start admin dashboard (`admin-dashboard`) in background
- start tunnel (localtunnel/ngrok) if enabled
- optionally start Flutter app when Flutter is installed and web device is available

Logs are written under `.logs/`.

### 4) Stop everything

```bash
./stop.sh
```

This stops docker compose services and any launcher-managed background processes (admin dashboard, tunnel, flutter run).

## Twilio WhatsApp Local Development (No Deployment Needed)

You can run backend locally and still receive Twilio webhooks by using a tunnel URL.

If `deploy.sh` starts tunnel successfully, use:

`<public_tunnel_url>/api/v1/notifications/whatsapp/twilio/webhook`

Set this URL in Twilio sandbox sender webhook config (`POST`).

Notes:

- localtunnel URLs change when restarted
- keep tunnel process running during tests
- ngrok requires verified account + authtoken

## Admin Dashboard

```bash
cd admin-dashboard
npm install
npm run dev
```

Default API base is `http://localhost:8000`.

## Backend-Only Start

```bash
docker compose up -d --build
```

Health checks:

- gateway: `http://localhost:8000`
- notification: `http://localhost:8008/health`
- agent: `http://localhost:8006/health`

## Packaging Sources (Safe Zip)

Use the script to create a sanitized archive without secrets/cache artifacts:

```powershell
./zip-repos.ps1
```

The script excludes env files, virtualenvs, cache folders, node_modules, build outputs, and logs.

## Developer Experience

- local-first scriptable workflows
- route-segmented microservice boundaries
- shared schemas and common middleware
- explicit health checks and service-level rate limits
- practical scripts for indexing, ingestion, and audits

## Security Notes

- never commit `.env`
- rotate keys immediately if exposed
- prefer dedicated sandbox credentials in local testing
- validate webhook signatures for production deployments

## Roadmap Signals

- stronger turnkey observability (structured dashboards)
- richer voice-first workflow states
- tighter scheme-document automation
- deeper multilingual quality loops

## Contributing

PRs are welcome. If you propose new service endpoints, include:

- schema updates
- route docs
- env var docs (if any)
- test notes or verification commands

## License

Set your preferred open-source license in this repository (`LICENSE`).

## Maintainers

KisanKiAwaaz core contributors.

# Vinayak Bhatia: vinayak.bhatia22@spit.ac.in
# Asim Shah: asim.shah22@spit.ac.in

