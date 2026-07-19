# Phase 2 — Polling Audit & Policy

**Date:** 2026-07-19  
**Client policy:** `src/lib/admin-v3/admin-poll.ts`  
**Hooks:** `useCanonicalStatus`, `useAdminNotifications`

## Inventory (before → after)

| Poller | Before | After |
|---|---|---|
| Header status | 60s, no visibility skip, force every tick | Shared cache; pause when hidden; backoff; hot 30s when degraded/critical |
| Notifications bell | 60s + refetch on every open; **heavy** `runAllHealthChecks` | Shared cache; pause when hidden; open refreshes **only if stale > 45s**; **light** incident feed |
| Health page summary | 60s + visibility skip | Same intervals via policy helper; seeds from shared shell snapshot |
| Command Centre daily | 60s + visibility | Unchanged interval (page data, not status duplicate) |
| Platform overview | One-shot **heavy** `/ops/health` | One-shot **summary** `/ops/health-summary` |
| Editorial dashboard | ~3m, visibility/idle gated | Unchanged (Phase 3 candidate for route gating) |
| SEO / costs panels | 60–120s page-local | Retained (out of shell status scope) |

## Final intervals

| Signal | Quiet | Hot (critical/warning) | Hidden tab |
|---|---:|---:|---|
| Canonical status | 60s ±15% jitter | 30s ±15% | Paused |
| Notifications | 60s ±15% jitter | 30s ±15% | Paused |
| Error backoff | 5s → … → 120s | — | Paused |

## Rationale

- Shell needs near-real-time awareness without waking heavy diagnostics.
- Server 30s TTL collapses header + overview + health-summary + notifications into one probe set.
- Popover/drawer open must not amplify load.
- Hot intervals only when the operator already has an active incident tone.

## Duplicate-request prevention

1. Module-level client cache + single `inflight` promise per resource.
2. Server `getCanonicalHealth` cache + single inflight build.
3. Health panel may call health-summary; within TTL this is a cache hit (≈0ms build).
