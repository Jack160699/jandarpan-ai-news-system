# Phase 2 — Canonical Health Contract

**Date:** 2026-07-19  
**Service:** `getCanonicalHealth()` in `src/lib/admin-v3/canonical-health-service.ts`  
**Derivation:** `deriveCanonicalHealth()` in `src/lib/admin-v3/canonical-health.ts`

## States

| State | Meaning |
|---|---|
| `healthy` | No active warning/degraded/critical incidents |
| `warning` | Soft degradation (timeouts, mild backlog) |
| `degraded` | Meaningful operational impairment |
| `critical` | P0/P1 incident active |
| `unknown` | Insufficient data / expired last-known |

## Required snapshot fields

- `state`, `label`
- `generatedAt`, `lastSuccessfulAt`, `freshness` (`live` \| `fresh` \| `stale` \| `unavailable`)
- `usedLastKnown`
- `sourceStatuses[]`, `partialSources[]`
- `criticalCount`, `warningCount`
- `reasons[]` / `topIncidents[]` (family-deduped)

## Deterministic rules

1. **Never Healthy** if `criticalCount > 0`.
2. Optional unconfigured providers (`redis_not_configured`, no AI keys) **do not** create Critical.
3. Probe **timeouts** → Warning (not Critical outage) unless last-known expired.
4. Retired cron jobs are **not** in `REGISTERED_CRON_JOBS` and must not be monitored as failed.
5. Multiple worker/cron failure symptoms collapse to **one** `cron-execution` family.
6. GNews/provider 429 logs collapse to **one** `provider-quota:*` incident.
7. Summary path does **not** invent authoritative stability scores; estimates follow derived state. Heavy diagnostics may attach real `computeStabilityScore` but **overall state** still comes from `deriveCanonicalHealth`.

## Consumers (must share service)

| Surface | Endpoint / path |
|---|---|
| Header / status sheet | `GET /api/admin/system-status` → `getCanonicalHealth` |
| Platform Health summary | `GET /api/admin/ops/health-summary` → same |
| Platform overview | health-summary (summary-first) |
| Command Centre platform block | `overview/daily` → same |
| Notifications / bell | `buildIncidentFeed` → same |
| Login production badge API | `GET /api/status/production` → same |
| Heavy diagnostics | `GET /api/admin/ops/health` → attaches `snapshot` from same derive |

## Cache & freshness

| Knob | Value |
|---|---|
| Server TTL | 30s |
| Client stale | 45s |
| Last-known stale | 5m (healthy → warning unverified) |
| Last-known expired | 15m → `unknown` |

## Retained legacy paths

| Path | Status |
|---|---|
| `runAllHealthChecks` via `/ops/health` | **Retained** for on-demand diagnostics only |
| `computeStabilityScore` | **Retained** on diagnostics payload |
| Synthetic 88/62/28 scores | **Removed** from summary path |
