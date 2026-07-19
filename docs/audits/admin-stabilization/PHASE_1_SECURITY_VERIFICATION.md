# Phase 1 — Security Verification

**Date:** 2026-07-19  
**Branch:** `main` (local commit only — not pushed)

## Threats addressed

| Threat | Before | After |
|---|---|---|
| Forged `nr-dashboard-role` grants page RBAC in middleware | Middleware called `checkPathRbac(pathname, cookieRole)` | Middleware authenticates only; layout RBAC uses membership session |
| `/api/admin/overview/daily` leaked health + costs via `analytics:read` | Single permission for full payload | Sectioned payload; costs require `billing:read`; platform/incidents require `monitoring:read` |
| Executive cost APIs used `monitoring:read` | Technical roles saw financial data | `billing:read` required |
| Inconsistent 401/403 + weak denial logging | Partial `api.forbidden` only | `admin.access_denied` / `admin.session_mismatch` / `admin.session_invalid` |
| Metrics lacked contract | Raw numbers | `AdminMetric` / envelope on daily, system-status, health-summary |

## Test evidence

| Case | How verified |
|---|---|
| Unauthenticated daily / admin APIs → 401 | Unit: `admin-authorization.test.ts` |
| Editor cannot access costs section | Unit: `overview-daily-access.test.ts` (keys omitted) |
| Editor cannot access schema/team pages | Unit: `middleware-rbac.test.ts` + layout uses same `checkPathRbac` |
| Moderator cannot access executive/billing routes | Unit: `middleware-rbac.test.ts` + `billing:read` gate |
| Super admin retains full access | Unit tests |
| Middleware must not authorize from role cookie | `middlewareMayAuthorizeFromRoleCookie() === false` |
| Cookie/session role mismatch | Layout logs `admin.session_mismatch` and rewrites cookies from membership |
| Expired session | Layout redirects to login when `getUser()` null; APIs 401 via session null |

## Manual / production notes

- Authenticated production re-check still requires `E2E_ADMIN_EMAIL` / `E2E_ADMIN_PASSWORD` (not available in this phase).
- Emergency admin mode (`isAdminEmergencyMode`) remains an explicit break-glass path and was not expanded.

## Logging safety

Denied events log: reason, pathname/permission id, actor user id/email, tenant id, IP, UA.  
Never logged: passwords, tokens, service-role keys, full session payloads.
