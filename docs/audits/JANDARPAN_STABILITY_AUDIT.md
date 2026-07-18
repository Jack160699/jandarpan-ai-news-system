# Jandarpan Stability Audit

**Date:** July 2026  
**Scope:** Stability of the admin command-centre overhaul and shared platform edges  
**Repo:** `jandarpan-ai-news-system` / `newspaper-motion`  
**Runtime:** Next.js 16.2.6 on Vercel; Supabase Auth + Postgres; QStash for scheduled/worker orchestration  

---

## 1. Verdict

The July 2026 admin IA and auth recovery work is **structurally stable**: routes, redirects, RBAC gates, and workspace resolution are centralized and covered by unit tests. Runtime production health (cron success rates, live email delivery, live GSC pulls) was **not measured in this agent session** and must be confirmed against Vercel / Supabase / Google dashboards.

---

## 2. Stability strengths (implemented)

### 2.1 Single admin shell

- UI console is `/admin` only (`AdminShell` + `AdminPageGate` + `AdminProvider`).
- Legacy `/dashboard` app tree was removed earlier; redirects preserve old URLs without dual shells.
- Styles consolidated on `admin-newsroom.css` (plus platform settings CSS).

### 2.2 Centralized workspace IA

- Source of truth: `src/lib/admin-platform/workspaces.ts`.
- Path → workspace resolution: `resolveWorkspaceFromPath`.
- Role → workspace filter: `workspacesForRole` + permission checks.
- Unit coverage: `src/lib/admin-platform/workspaces.test.ts` (landings, team visibility, path resolution, safe `next`).

### 2.3 Auth edges hardened

Public auth routes exempt from login redirect in middleware / session guard / admin layout:

- `/admin/login`
- `/admin/forgot-password`
- `/admin/reset-password`

Forgot-password API:

- Rate-limited via existing login brute-force helper.
- Always returns a generic success message (no account enumeration).
- Redirect target for Supabase recovery: `{canonicalSite}/admin/reset-password`.

Reset-password API:

- Requires authenticated recovery session (`getUser`).
- Enforces minimum password length (8).
- Writes session cookies after successful `updateUser`.

### 2.4 Redirect consistency

| Mechanism | Role |
|-----------|------|
| `LEGACY_DASHBOARD_REDIRECTS` in `next.config.ts` | Permanent (308) exact legacy paths |
| `mapLegacyDashboardPath` + middleware | Catch-all `/dashboard/*` → `/admin/editorial` |
| `/admin/dashboard` → `/admin/overview` | Temporary redirect for mistaken admin path |

### 2.5 Admin noindex

`src/app/admin/layout.tsx` sets `robots: NOINDEX_ROBOTS`, reducing accidental indexing of console pages.

---

## 3. Known stability pressure points

| Area | Risk | Mitigation in code |
|------|------|--------------------|
| Orchestrate duration | Long jobs / 504 history | Prior work raised `maxDuration` / deadline-aware timeouts (see git history); monitor Vercel logs |
| Fetch-news rate limits | Provider 429s | Serialization / retry patterns exist in news providers; monitor ingestion failures in Technical workspace |
| QStash signing | Missing keys reject signed crons | Startup checks warn when signing keys absent |
| Session recovery | Cookie / membership gaps | Middleware session guard + friendly login error codes |
| Emergency mode | Admin emergency static shell | `isAdminEmergencyMode` path in admin layout |

---

## 4. What this audit did **not** verify live

- Production cron success/failure rates for the last 7/30 days.
- Supabase Auth email delivery success for password reset.
- Whether `GSC_SERVICE_ACCOUNT_JSON` / OAuth refresh tokens are present in the production Vercel project.
- Real-user RUM / error budgets from Sentry (integration exists as dependency; live issue counts not pulled here).

Where data is unavailable, treat operational green status as **unconfirmed**, not as failure.

---

## 5. Stability checklist for operators

1. Open `/admin/overview` as `super_admin` — confirm Command Centre loads without auth loops.
2. Open `/admin/forgot-password` — submit a known account; confirm email arrives (Supabase config dependent).
3. Hit a legacy bookmark `/dashboard/analytics` — confirm redirect to `/admin/analytics`.
4. Technical workspace → System health / Ingestion — confirm queue depth and recent failures look sane.
5. Confirm Vercel cron schedule matches `vercel.json` (fetch-news, orchestrate, edition-publish, etc.).

---

## 6. Related documents

- `JANDARPAN_PIPELINE_AUDIT.md` — worker/cron chain  
- `JANDARPAN_AUTH_AUDIT.md` — recovery flow detail  
- `JANDARPAN_REMAINING_BLOCKERS.md` — external-only blockers  
