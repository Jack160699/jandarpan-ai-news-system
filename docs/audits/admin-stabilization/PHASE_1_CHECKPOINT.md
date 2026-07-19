# Phase 1 Checkpoint — Admin Authorization & Data Contracts

**Date:** 2026-07-19  
**Baseline:** `60cd89d8e091e3fc0c70b63f454fd31c0acb2e7e`  
**Rollback ref:** `backup/admin-stabilization-before-phase-1`  
**Local commit:** `faf2f87b5c50510cc9cbcf61b0af722b59aab392` (message: `fix(admin): harden authorization and admin data contracts`; confirm with `git rev-parse HEAD`)  
**Pushed / deployed:** No

## Root causes

1. `/api/admin/overview/daily` authorized the entire multi-domain payload with `analytics:read`.
2. Middleware path RBAC used `nr-dashboard-role` cookie as if it were a trusted membership role.
3. Financial executive APIs incorrectly required `monitoring:read`.
4. Admin metrics lacked a shared source / period / freshness / availability contract.
5. Denial paths lacked consistent safe audit events.

## Authorization changes

- Added canonical helpers: `requireAdminSession`, `requireAdminPermission`, `requireAnyAdminPermission`, `requireSuperAdmin`, `getAdminAuthorizationContext`.
- Overview daily: sectioned access (`editorial`, `audience`, `seo`, `costs`, `platform`, `incidents`) with `permissions.granted` / `withheld`; withheld section keys omitted.
- Middleware: session presence only for admin auth; **no cookie-based path RBAC**.
- Admin layout: server RBAC via membership session + cookie/session mismatch log + cookie rewrite.
- Executive cost APIs + page + route map: `billing:read`.
- Nav policy: `/admin/executive` privileged behind billing.
- Safe audit actions: `admin.access_denied`, `admin.session_invalid`, `admin.session_mismatch`.

## Endpoints / surfaces changed

| Path | Change |
|---|---|
| `GET /api/admin/overview/daily` | Sectioned permissions + metric contract |
| `GET /api/admin/system-status` | Canonical helper + contract envelope |
| `GET /api/admin/ops/health-summary` | Canonical helper + contract envelope |
| `GET /api/admin/ops/executive` | `billing:read` |
| `POST /api/admin/ops/executive/export` | `billing:read` |
| `src/middleware.ts` | Removed cookie RBAC |
| `src/app/admin/layout.tsx` | Trusted-session route RBAC |
| `src/app/admin/executive/page.tsx` | `billing:read` gate |
| `CommandCentre` | Handles withheld sections |

## Tests run

- `vitest` Phase 1 auth/metric suites — **36 passed**
- `npm run typecheck` — **pass**
- targeted eslint — **pass** (1 pre-existing warning in CommandCentre effect)
- `npm run build` — **pass**

## Remaining Phase 1 blockers

- None for the scoped Phase 1 objectives.
- Authenticated production cookie-forgery / live role matrix re-proof still blocked without admin E2E credentials (documented, not a code blocker).
- Notifications still heavy + broadly permissioned (`content:read`) — deferred to Phase 2.
- Distinct `business_admin` / `technical_admin` DB roles not introduced (would be schema/product change).

## Deliverables

- `docs/audits/admin-stabilization/PHASE_1_PERMISSION_MATRIX.md`
- `docs/audits/admin-stabilization/PHASE_1_SECURITY_VERIFICATION.md`
- `docs/audits/admin-stabilization/PHASE_1_CHECKPOINT.md`
