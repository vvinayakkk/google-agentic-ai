# KisanKiAwaaz Admin Dashboard

Standalone web admin console for KisanKiAwaaz backend services.

## Stack

- React 19 + Vite
- Tailwind CSS v3
- Lucide React icons
- Shared API client with endpoint fallback support for current backend route variants

## Location

Project root:

`kisankiawaz-backend/admin-dashboard`

## Run

1. Install dependencies:

```bash
npm install
```

2. Start dev server:

```bash
npm run dev
```

3. Build production bundle:

```bash
npm run build
```

4. Lint:

```bash
npm run lint
```

## Environment

Env variable:

- `VITE_API_BASE_URL` (default fallback in code: `http://localhost:8000`)

Included env files:

- `.env.example`
- `.env.development`
- `.env.production`

Recommended local override:

1. Copy `.env.example` to `.env.local`
2. Set your backend URL in `.env.local`

Example:

```env
VITE_API_BASE_URL=http://localhost:8000
```

## Auth

Login uses backend admin endpoint:

- `POST /api/v1/admin/login`

JWT is stored in local storage under `admin_token`.

## Notes

- Dashboard is desktop-first with minimum width `1280px`.
- Infinite dot-grid canvas supports pan and ctrl/cmd+scroll zoom.
- Most pages call multiple fallback paths to stay compatible with current backend route differences.
- Detailed frontend documentation lives in [FRONTEND_SYSTEM_DETAILED_REFERENCE.md](FRONTEND_SYSTEM_DETAILED_REFERENCE.md).
