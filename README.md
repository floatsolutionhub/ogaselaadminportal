# OgaselaControlPortalUI

The internal admin/operations portal for Ogasela ("Ogasela Control Portal") - moderation queue,
biometric manual review, the platform KPI dashboard, the admin audit log, and NDPA data-subject
erasure. Every screen here is a thin UI over `Ogasela.Api`'s `AdminController` (plus one action on
`VerificationController`); there's no business logic here beyond what to show and which endpoint
to call - all of it is re-enforced server-side by `[Authorize(Roles = ...)]`, so this app is a
convenience layer, not a security boundary.

Only **Moderator**, **FinanceAdmin**, and **SuperAdmin** accounts can sign in.

## Stack

React 19 + TypeScript + Vite + Tailwind CSS v4 + React Router. No state-management or
data-fetching library beyond a small hand-rolled `useApiQuery` hook (`src/lib/useApiQuery.ts`) -
this app makes too few distinct API calls to justify one.

## Project layout

```
src/
  services/      one file per backend controller (auth.ts, admin.ts, verification.ts) - every
                 API call in the app goes through one of these, never a raw fetch() in a page
  lib/           apiClient (fetch wrapper + auth header), auth (AuthContext), useApiQuery, format
  types/api.ts   TypeScript types mirroring the backend's response/request DTOs exactly
  components/    layout shell (Sidebar/Topbar/AppLayout) + small shared UI primitives
  pages/         one file per route (Login, Dashboard, ModerationQueue, ManualReviewQueue,
                 AuditLog, DataErasure)
```

`services/*` is the intended single point of change if a backend route's path or payload shape
ever changes - pages call `services/admin.getDashboard()`, not `api.get("/admin/dashboard")`
directly.

## Local setup

1. Make sure `Ogasela.API` is running and reachable (see its own README - `docker compose up`
   from that repo gets you Postgres + Redis + the API on `http://localhost:8080`). Its
   `Cors:AllowedOrigins` (in `appsettings.Development.json`) already includes this app's Vite dev
   server origin (`http://localhost:5173`) by default.

2. Copy the environment template and adjust only if the API isn't on `localhost:8080`:

   ```bash
   cp .env.example .env.local
   ```

3. Install and run:

   ```bash
   npm install
   npm run dev
   ```

4. Sign in with a Moderator/FinanceAdmin/SuperAdmin account. There's no self-registration -
   internal roles are provisioned directly in the database, or via `Ogasela.API`'s
   `SuperAdminSeeder` (see that repo's `.env.example` for `SUPERADMIN_SEED_*`).

## Build

```bash
npm run build
```

Type-checks (`tsc -b`) then produces a static `dist/` bundle - deploy it behind any static file
host/CDN pointed at the production API via `VITE_API_BASE_URL`.
