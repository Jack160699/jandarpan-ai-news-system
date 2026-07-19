# Phase 8 — Infrastructure Audit

## Competitor tracker

| Before | After |
|---|---|
| Sequential crawl of all sources inside one 120s Vercel invocation | Bounded batch (`COMPETITOR_BATCH_SIZE`, default 3) |
| No continuation — timeouts killed the whole run | Persisted cursor `ops:competitor:progress:v1` |
| One slow domain could exhaust the budget | Per-domain timeout (`COMPETITOR_DOMAIN_TIMEOUT_MS`) |
| Page enrichments unbounded by wall clock | Per-page timeout (`COMPETITOR_PAGE_TIMEOUT_MS`) |
| Single end-of-run heartbeat | Mid-run heartbeats + final record |
| All-or-nothing status | Partial success + `continued` + retryable failure counts |

## Redis / Upstash

| Question | Finding |
|---|---|
| Configured in production? | **Not verified via CLI** (project not linked in this worktree). Checklist in `PHASE_8_ENVIRONMENT_CHECKLIST.md`. |
| Features requiring Redis | Distributed cache, cron heartbeat state, rate-limit coordination, homepage feed keys |
| Fallback | Memory cache via `cacheGet`/`cacheSet` when Redis missing/unreachable |
| Correctness impact | **Unaffected** — Postgres remains source of truth |
| Performance impact | Degraded multi-instance consistency / higher DB load |
| Tenant safety | Homepage feed keys already tenant×lang; segment caches now tenant-scoped (`:t:<slug>`) with legacy read fallback |

## Cron secret scoping

Already supported in `cron-auth.ts`:

- `CRON_INGEST_SECRET` / `CRON_PIPELINE_SECRET` / `CRON_OPS_SECRET` / `CRON_ADMIN_SECRET`
- Master fallback: `CRON_SECRET` (+ legacy `CRON_API_SECRET`)
- Do **not** remove `CRON_SECRET` until all Vercel/QStash callers migrate

## Worker health

| Item | Change |
|---|---|
| Retired ids | `editorial_generate`, `cluster`, `revalidate` excluded from stale evaluation |
| Active generation | `editorial-generate` remains in `REGISTERED_CRON_JOBS` |
| Stale thresholds | Per-job windows (e.g. competitor-tracker 2h, cleanup 36h) |

## Local enrich

`AI_LOCAL_ENRICH_ENABLED` defaults **off** in production; health summary aligned with `isLocalEnrichEnabled()`.
