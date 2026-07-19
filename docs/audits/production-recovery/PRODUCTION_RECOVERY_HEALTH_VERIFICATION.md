# Production Recovery — Health Verification (Phase 9)

## Ingestion outcome (post-deploy)

First post-deploy `fetch-news` at **2026-07-19 18:37–18:38 UTC**:

| Check | Evidence |
|---|---|
| HTTP | **200** |
| Log tag | `[INGEST_SUCCESS]` with `degraded:true` |
| Heartbeat | `ok=true`, `degraded=true`, status `degraded` |
| Persistence | inserted **566**, signals **24**, queued AI **24** |
| Fallback providers | `newsdata` + `rss` completed; `gnews` skipped (quota 403) |
| Not 500 on useful partial | Confirmed |
| Canonical Critical false alarm | **Broken:** prior runs `ok=false`/`ingest_worker_failed`; post-deploy correctly degraded |

Pre-deploy contrast: last pre-deploy fetch-news rows were `ok=false`, `degraded=false`, error `ingest_worker_failed` despite `partial_timeout` persistence with hundreds of inserts.

## Expected admin health picture

Weighted model (`health-scoring.ts`) with approximate live states:

| Subsystem | Observed state | Rationale |
|---|---|---|
| Website | healthy | Homepage/sitemap 200 |
| Database | healthy | Queries succeed; indexes present |
| Ingestion | degraded | GNews quota; RSS/NewsData fallback OK |
| Editorial / generation | degraded | Queue draining but `no_signals_for_event` |
| Publishing | warning/degraded | 3 published / 24h; no flood |
| AI | warning | Enrichment runs; generation skips |
| Translation | degraded | 45 pending; CG quarantined |
| Images | warning | Heavy category fallback usage |
| SEO | warning | Google CSE optional missing |
| External | degraded | GNews quota exhausted |

**Estimated score band:** ~70–78 (**C**), state **Warning / Degraded** — **not** 28/F solely from optional GNews/RSS noise.  
**Must not force Healthy** while generation remains materially impaired.

Shallow `/api/health` returning `status:"healthy"` is **not** the admin canonical score.

## Scheduler / heartbeat verification

| Job | Post-deploy evidence |
|---|---|
| fetch-news | ok=true, degraded=true @ 18:38 |
| editorial-generate | ok=true, degraded=true @ 18:35 and 18:50 |
| orchestrate | ok=true, degraded=true @ 18:47 |
| translation-backfill | ok=true @ 18:20 (pre-window cadence) |
| Duplicate generation invocation | Not observed; orchestrator workers exclude dedicated generate path |

## Database / admin performance

| Surface | Observation |
|---|---|
| Generated pool | 505–1752ms on prod logs after deploy |
| Sitemap pool | ~400 rows / 505–651ms |
| PostgreSQL 57014 | Last clusters on **prior** deployments; **none** attributed to `dpl_GYNpQTcA9UzapXTGeQbd4KjeMDPZ` |
| Indexes | `idx_generated_articles_public_published_at`, `idx_generated_articles_pending_created_at` present |

## Incidents still visible (worded correctly)

- GNews daily quota exhausted → provider skipped; fallback continues (degraded, not Critical).
- Generation skips `no_signals_for_event` while embed/cluster queues remain deep.
- Env warnings: scoped cron secrets missing (legacy `CRON_SECRET` fallback), `SECURITY_2FA_ENCRYPTION_KEY` unset, `AI_LOCAL_ENRICH_ENABLED` should be explicitly `false`, Google CSE optional missing.
