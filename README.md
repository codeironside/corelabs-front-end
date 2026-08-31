# CoreLabsStudio Frontend

Standalone marketing site + Content Studio product app for CoreLabsStudio.

**This folder is the frontend.** The API lives in sibling [`../corelabs-backend`](../corelabs-backend).

## Stack

- React 19 + TypeScript + Vite 8
- Tailwind CSS 4
- React Router 7, TanStack Query, Zustand, Axios, Zod

## Setup

```bash
cd corelabs-frontend
npm install
npm run dev
```

Opens at `http://localhost:5173`.

## Environment

See `.env.development`:

| Variable | Purpose |
|----------|---------|
| `VITE_APP_NAME` | Brand label |
| `VITE_STUDIO_API_URL` | CoreLabsStudio API (`http://localhost:4005/api/v1`) |
| `VITE_FIREBASE_*` | Firebase web config for Google popup sign-in |

Config is validated in `src/config/index.ts`. Auth talks only to the Studio API — **no identity microservice**.

## Routes

| Path | Role |
|------|------|
| `/` | Marketing (hero + sections) |
| `/login` | Google sign-in (Studio-owned auth) |
| `/app` | Protected studio (themes, modules, episodes, stories) |
| `/admin/content` | Redirect → `/app` (OAuth compatibility) |

## Consistency workflow (restored)

Theme bible → Module (theme link + cover character lock) → Episode scenes (`selectedCharacterRefIds` / character handles) — backed by `src/api/content.ts` and `src/pages/dashboard/*`.

## Backend

Run [`../corelabs-backend`](../corelabs-backend) on port **4005** with `CORS_ORIGIN` / `FRONTEND_URL` = `http://localhost:5173`.
