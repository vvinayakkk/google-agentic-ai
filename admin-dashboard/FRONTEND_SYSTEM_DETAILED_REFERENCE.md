# KisanKiAwaaz Admin Dashboard Frontend Reference

Generated from current frontend source on 2026-04-02.

## 1. What This UI Is

The admin dashboard is a React 19 + Vite single-page console for the KisanKiAwaaz backend. It is not a route-based React Router app. Instead, `UIContext` stores the active page key and `App.jsx` lazy-loads the matching page component.

The live shell is built around a left sidebar, a top bar, and a full-width content area. The current shell is desktop-first and optimized for a minimum width of 1280px.

## 2. Visual System

The design language is intentionally dark, high-contrast, and data-dense.

Core palette from CSS variables in `src/index.css`:
- Background: `#0d0d0d`
- Primary surface: `#141414`
- Secondary surface: `#1a1a1a`
- Border: `#242424`
- Text: `#f0f0f0`
- Muted text: `#666666`
- Accent green: `#22c55e`
- Info blue: `#60a5fa`
- Warning amber: `#f59e0b`
- Danger red: `#ef4444`

Tailwind extends the same direction with:
- Base: `#1C1C1C`
- Surface: `#1E1E1E`
- Elevated: `#2A2A2A`
- Neutral accent: `#E5E7EB`
- Display font: `DM Serif Display`
- Mono font: `Geist Mono`

Typography uses a pragmatic blend of `Inter`, `Geist`, and the serif display face for headings. The result is closer to a dense operator console than a marketing website.

The login screen uses an `InfiniteCanvas` background: a dark dotted field with pan and zoom interaction. Most application screens use compact panels, thin borders, and green accent chips. The newer Market page pushes the palette harder with glassy overlays and gradient highlights, but it still stays inside the same dark charcoal system.

## 3. Shell And State Model

### 3.1 App entry

`src/App.jsx` mounts the authenticated dashboard when `AuthContext` reports a valid token. Otherwise it shows the login page.

The dashboard shell does the following:
- Loads pages lazily with `React.lazy` and `Suspense`.
- Uses `UIContext.activePage` to choose the current page component.
- Wraps the active page in an `ErrorBoundary`.
- Exposes `onRefresh`, `onStatsChange`, and `onActivityChange` hooks to pages.

### 3.2 Auth state

`src/context/AuthContext.jsx` stores the admin session in local storage:
- `admin_token`
- `admin_profile`

Login calls `POST /api/v1/admin/login` through `apiClient` with `skipAuth: true`. On success, the access token and admin profile are stored in context and mirrored to local storage.

If any API request returns 401, `apiClient` clears the stored auth data and emits an `auth:unauthorized` event. `AuthContext` listens for that event and resets the session.

### 3.3 UI state

`src/context/UIContext.jsx` owns the shared dashboard UI state:
- `activePage`
- command palette open/closed state
- export modal open/closed state
- canvas pan and zoom state
- mouse position for the login canvas
- live activity feed

The default active page is Database Explorer.

### 3.4 API client

`src/api/client.js` defines the data access layer.

Key behavior:
- Base URL comes from `VITE_API_BASE_URL` or falls back to `http://localhost:8000`.
- `apiClient()` injects the bearer token automatically unless `skipAuth` is set.
- `apiTry()` tries fallback endpoints in order until one succeeds.
- `withQuery()` builds query-string URLs while preserving the base path.

This fallback style is important: many pages intentionally try multiple backend route variants so the UI survives route drift or legacy aliases.

## 4. Layout And Navigation

### 4.1 Live shell

The current live shell mounts:
- `Sidebar`
- `TopBar`
- the lazy-loaded page component

`RightSidebar` and `StatusBar` still exist as components, but they are not mounted in the current `App.jsx` shell.

### 4.2 Sidebar behavior

`src/components/layout/Sidebar.jsx` shows the dashboard navigation in this order of priority:
- Analytics
- Database Explorer
- the remaining pages from `NAV_ITEMS`

The Overview page is intentionally removed from the visible nav ordering in favor of the current workspace flow.

### 4.3 Top bar behavior

`src/components/layout/TopBar.jsx` renders:
- the current page title
- a refresh button
- an export button
- a notification icon
- a profile dropdown with sign out

### 4.4 Login screen

`src/pages/Login.jsx` is a centered admin login card over the infinite dot-grid canvas. It only collects email and password and delegates all auth logic to `AuthContext.login()`.

## 5. Page-By-Page Route Map

This section documents the backend routes each visible screen currently calls.

### 5.1 Login

Login uses:
- `POST /api/v1/admin/login`

The payload is `{ email, password }`. On success it stores the returned token and admin profile locally.

### 5.2 Overview

`src/pages/Overview.jsx` is the dashboard summary page.

It currently calls:
- `GET /api/v1/admin/stats`
- `GET /api/v1/admin/analytics/overview`

It also calls the health check helper, which currently pings the admin stats endpoint for each service label to build a simple service-health strip.

### 5.3 Farmers

`src/pages/Farmers.jsx` is the admin farmer management view.

It currently calls:
- `GET /api/v1/admin/farmers`
- `GET /api/v1/farmers/admin`
- `GET /api/v1/admin/farmers/{farmer_id}`
- `GET /api/v1/farmers/admin/{farmer_id}`
- `GET /api/v1/admin/farmers/{farmer_id}/conversations`
- `GET /api/v1/agent/conversations/{farmer_id}`
- `GET /api/v1/analytics/farmer/{farmer_id}/summary?days=30`
- `GET /api/v1/analytics/farmer/{farmer_id}/summary`

This screen is built to survive backend route variation by trying admin and non-admin aliases for the same business action.

### 5.4 Market

`src/pages/Market.jsx` is now a backend-driven market intelligence dashboard. It uses live calls first, then falls back to admin collection browsing or reference-data routes.

Global filter bootstrap:
- `GET /api/v1/live-market/states`
- `GET /api/v1/live-market/commodities`

Mandi Prices tab:
- `GET /api/v1/live-market/prices`
- `GET /api/v1/admin/data/collection/market_prices`
- `GET /api/v1/admin/data/collection/ref_mandi_prices`

MSP tab:
- `GET /api/v1/live-market/msp`
- `GET /api/v1/live-market/msp/all`
- `GET /api/v1/admin/data/collection/ref_msp_prices`

Mandis tab:
- `GET /api/v1/live-market/mandis`
- `GET /api/v1/admin/data/collection/mandis`
- `GET /api/v1/admin/data/collection/ref_mandi_directory`

Price Trends tab:
- `GET /api/v1/ref-data/price-trends`
- `GET /api/v1/admin/data/collection/ref_mandi_prices`

Cold Storage tab:
- `GET /api/v1/ref-data/cold-storage`
- `GET /api/v1/admin/data/collection/ref_cold_storage`

Reservoir tab:
- `GET /api/v1/ref-data/reservoir`
- `GET /api/v1/admin/data/collection/ref_reservoir_data`

FASAL tab:
- `GET /api/v1/admin/data/collection/ref_fasal_data`

Fertilizer tab:
- `GET /api/v1/admin/data/collection/ref_fertilizer_data`
- fallback advisory route used in the page path builder: `GET /api/v1/schemes/fertilizer-advisory`

Pesticide tab:
- `GET /api/v1/admin/data/collection/ref_pesticide_advisory`
- fallback advisory route used in the page path builder: `GET /api/v1/schemes/pesticide-advisory`

The page normalizes multiple backend shapes: arrays, keyed objects, and collection-browser payloads. It also exposes filters, a data table, a spotlight panel, and chart summaries without introducing mock data.

### 5.5 Schemes

`src/pages/Schemes.jsx` manages scheme browsing, detail editing, import, and document browsing.

It currently calls:
- `GET /api/v1/admin/data/schemes`
- `GET /api/v1/schemes/search`
- `GET /api/v1/schemes/`
- `GET /api/v1/market/scheme-docs`
- `GET /api/v1/market/document-builder/scheme-docs`
- `POST /api/v1/admin/data/schemes`
- `POST /api/v1/admin/schemes/upsert`
- `DELETE /api/v1/admin/data/schemes/{id}`
- `DELETE /api/v1/admin/schemes/{id}`
- `POST /api/v1/admin/data/import/schemes`
- `POST /api/v1/admin/schemes/import`

This page also derives its state options from the loaded data, which is why the state filter is backed by `beneficiary_state` normalization rather than assuming a single `state` field.

### 5.6 Equipment

`src/pages/Equipment.jsx` is a large admin-facing equipment and livestock workspace.

It currently calls:
- `GET /api/v1/admin/data/collection/equipment`
- `GET /api/v1/admin/data/collection/equipment_bookings`
- `GET /api/v1/admin/data/collection/{collection}` for the active tab
- `GET /api/v1/admin/data/collection/ref_equipment_providers`
- `POST /api/v1/equipment/replace-seed`
- `POST /api/v1/equipment/providers/replace` as a compatibility fallback

The page uses admin collection data for broad browsing, then falls back to the curated provider collection when the rental-rate tab has no rows.

### 5.7 Analytics

`src/pages/Analytics.jsx` is the admin insight console.

It currently calls a broad set of analytics routes, including:
- `GET /api/v1/analytics/overview`
- `GET /api/v1/analytics/insights/kpis`
- `GET /api/v1/analytics/insights/engagement`
- `GET /api/v1/analytics/insights/operational`
- `GET /api/v1/analytics/insights/opportunities`
- `GET /api/v1/analytics/insights/market`
- `GET /api/v1/analytics/insights/equipment`
- `GET /api/v1/analytics/insights/recommendations`
- `GET /api/v1/analytics/segments/farmers`
- `GET /api/v1/analytics/trends`
- `POST /api/v1/analytics/snapshots/generate`
- `GET /api/v1/analytics/snapshots/{date}`
- `GET /api/v1/analytics/snapshots/trends`
- `GET /api/v1/analytics/farmer/{farmer_id}/summary`
- `GET /api/v1/analytics/farmer/{farmer_id}/benchmarks`
- `GET /api/v1/analytics/overview/live`
- `GET /api/v1/analytics/overview/today`

### 5.8 Agent System

`src/pages/AgentSystem.jsx` is the chat and orchestration debugger.

It currently calls:
- `GET /api/v1/agent/sessions`
- `GET /api/v1/agent/conversations/`
- `GET /api/v1/agent/sessions/{id}`
- `GET /api/v1/agent/conversations/{id}`
- `GET /api/v1/agent/conversations/{id}/`
- `GET /api/v1/agent/key-pool/status`
- `GET /api/v1/agent/keys/status` as a fallback alias

### 5.9 Notifications

`src/pages/Notifications.jsx` currently focuses on list, preferences, and broadcast flows.

It currently calls:
- `GET /api/v1/notifications/`
- `GET /api/v1/notifications/preferences/`
- `PUT /api/v1/notifications/{id}/read`
- `DELETE /api/v1/notifications/{id}`
- `POST /api/v1/notifications/broadcast`
- `PUT /api/v1/notifications/preferences/`

### 5.10 Database Explorer

`src/pages/DatabaseExplorer.jsx` is the admin collection browser and query workspace.

It currently calls:
- `GET /api/v1/admin/data/collection/{collection}`
- `GET /api/v1/admin/data-freshness`
- `GET /api/v1/admin/freshness` as a fallback alias

The page also uses query presets and collection-specific fallback paths for browsing the backend data model. Its query results are rendered inline in the Query tab, and that section is intentionally scrollable.

### 5.11 System Config

`src/pages/SystemConfig.jsx` is the operational admin settings page.

It currently calls:
- `GET /api/v1/admin/admins`
- `GET /api/v1/admin/stats`
- `GET /api/v1/admin/config`
- `GET /api/v1/admin/ingestion/logs`
- `GET /api/v1/admin/freshness`
- `GET /api/v1/admin/audit-logs`
- `PUT /api/v1/admin/config`
- `PUT /api/v1/admin/config/feature-flags`

The feature-flags tab also writes directly to the config endpoint after local updates.

### 5.12 Geo Explorer

`src/pages/GeoExplorer.jsx` combines state/district lookup, pincode lookup, and a map view.

It currently calls:
- `GET /api/v1/geo/states`
- `GET /api/v1/geo/district/{state}`
- `GET /api/v1/geo/pin/{pincode}`
- `GET /api/v1/admin/data/collection/ref_pin_master`

The map itself is Leaflet-based with dark Carto tiles and pin markers for looked-up locations.

## 6. Shared Components And Patterns

### 6.1 Reusable UI pieces

The dashboard uses a small shared component library:
- `DataTable`
- `Modal`
- `ExportModal`
- `Badge`
- `StatCard`
- `Toast`
- `ErrorBoundary`
- `Tooltip`
- `Drawer`
- `CommandPalette`

### 6.2 Charts

Shared chart components live in `src/components/charts`:
- `LineChart`
- `BarChart`
- `SparkLine`
- `DonutChart`

These are used across the overview, analytics, market, and equipment screens.

### 6.3 Canvas And Motion

`InfiniteCanvas` is only used on the login screen. It supports mouse tracking, pan, and ctrl/cmd+scroll zoom.

The general UI motion is restrained: subtle button lifts, soft hover transitions, and a few animated status indicators. The app intentionally avoids heavy motion everywhere except the login canvas and a few chart/indicator surfaces.

## 7. Data Conventions

- Most pages use `apiTry()` because the frontend is built to survive backend route evolution.
- Page filters commonly use state, commodity, category, district, and search fields derived from backend data rather than hard-coded fixtures.
- `withQuery()` is used heavily so the query string is appended consistently.
- When 401 is returned, the session is cleared immediately.
- Responses are normalized per page because the backend returns both typed objects and generic collection-browser payloads.
- The frontend does not introduce mock data for the current dashboard pages; it always prefers backend responses and fallback backend collections.

## 8. Practical Notes

- The active shell is desktop-first and much of the spacing assumes a wide viewport.
- The new Market page is the most visually custom screen and uses a darker glassmorphism layer than the older pages, but it still follows the same charcoal/emerald theme.
- `RightSidebar` and `StatusBar` are present in the codebase, but the live shell currently does not mount them.
- The root login and shell flow is intentionally simple: if the token exists, the dashboard loads; if not, the login form is shown.
