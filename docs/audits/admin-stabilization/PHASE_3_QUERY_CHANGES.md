# Phase 3 Query Changes

**Date:** 2026-07-19  
**Migrations:** None (forward-only not required — query shape changes only).

---

## 1. Editorial dashboard (`fetch-dashboard.ts`)

| Change | Rationale |
|---|---|
| Article list `limit` 80 → **40** | Desk UI does not need full pool; totals from head counts |
| Pending / approved / publishedToday / generated / AI pending via **`count: exact, head: true`** | Avoid selecting complete rows for totals |
| `ingestion_logs` projected columns (not `select("*")`) | Smaller payload |
| `rss_source_health` projected columns | Smaller payload |
| Parallel `Promise.all` retained | Avoid request waterfall |

**Not changed:** Tenant scoping remains on events/articles/signals/audit where already present.

---

## 2. Owner overview (`overview-daily.ts`)

| Change | Rationale |
|---|---|
| Section assembly via **`Promise.allSettled`** | One rejected task cannot blank the briefing |
| Per-section `timed(..., 1500)` budgets | Source-level timeout; partial results |
| Editorial section uses **head counts** + `limit(1)` latest | No large article lists |
| Platform section uses **`getCanonicalHealth()`** | Shared cache / last-known from Phase 2 |
| Payload includes `sources[]` timings + `availability` | Partial-safe contract |
| Permission-sectioned keys (Phase 1) | No forbidden section placeholders |

---

## 3. Platform / health paths

| Endpoint | Role |
|---|---|
| `GET /api/admin/ops/health-summary` | Initial technical + health pages |
| `GET /api/admin/ops/health` | Explicit diagnostics only |
| Canonical health service cache | Dedupes shell + overview health work |

No new indexes added. Indexes deferred until authenticated query plans show sequential scans on hot paths.

---

## 4. Client fetch standard

| Helper | Behaviour |
|---|---|
| `admin-fetch.ts` → `adminGet` / `adminPost` | Timeout, credentials, dedupe via `apiClient` |
| Defaults | 8s general / 4s summary / 12s diagnostics |
| `admin-poll.ts` | Intervals, jitter, backoff, hidden-tab |
| React Query editorial hook | Route `enabled`, no background refetch when hidden/idle |

---

## 5. Intentionally not done

- No destructive migrations / table drops
- No new competing data library
- No unbounded OpenAI usage scan rewrite in this phase (executive page still owns its APIs; overview uses compact costs section only)
