# Phase 2 — Notification Verification

**Date:** 2026-07-19  
**Feed:** `buildIncidentFeed()` → `GET /api/admin/notifications`  
**Actions:** `POST /api/admin/notifications/actions`

## Architecture

1. Collaboration notifications (editorial:write) — lightweight hub fetch.
2. Ops incidents (monitoring:read) — **canonical health + bounded extras** (queue depth from summary metrics, ops error summary ≤800ms, recent errors ≤8 rows for family folding).
3. **No** `runAllHealthChecks`, OpenAI usage scans, launch widget fan-out, or full schema probes on the poll path.

## Deduplication

| Symptom cluster | Incident id / family |
|---|---|
| Stale/failed cron/workers | `cron-execution` |
| GNews 429 repeats | `provider-quota:gnews` |
| Generic rate limits | `provider-quota` |
| DB/query timeouts | `database-performance` |
| Translation backlog | `translation-backlog` |
| Queue depth | `queue-backlog` (stable id) |

Notification count uses family keys — not one alert per log row.

## Actions (server-authorized)

| Action | Who | Effect |
|---|---|---|
| Open | Any viewer of item | Navigate deep link |
| Mark read | `editorial:write` for `collab-*` | Client + acknowledged API |
| Acknowledge | `monitoring:read` | Server ACK store (6h TTL) |
| Diagnostics | Link | `/admin/health` |
| Retry / purge | **Not exposed** | Would require explicit privileged APIs |

## Performance target

- Incident feed wall clock: **&lt; 1s** typical (health cache hit + &lt;800ms extras).
- Timing logged as `[admin-notifications]`.

## Permission checks verified

- Unauthenticated → 401
- Editor acknowledging ops incident → 403
- Moderator acknowledge → 200
