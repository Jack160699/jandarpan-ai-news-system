# Phase 2 — Generation Flow (Before)

Snapshot of the production editorial-generation path **before** the dedicated lane.
Derived from code on `main` at Phase 1 (`d58d4fe`) plus the three-day audit.

## End-to-end flow

```
1. Signal ingestion     /api/fetch-news → runScalableIngestion
2. AI enrichment        news_ai_queue → ai_enrich (inside orchestrate)
3. Clustering           event_cluster / intelligence_cluster jobs (worker_jobs)
4. Candidate selection  generateEditorialsFromEvents scans news_events
                        (urgency_score DESC, skips events with generated_articles)
5. Editorial generation editorial_generate job handler → OpenAI draft + quality gate
6. Image work           editorial_image_queue → editorial_images (orchestrate, often skipped)
7. Translation          translate_article jobs (broken — Phase later)
8. Publish decision     quality.publish_allowed + edition capacity rules
9. Final publication    generated_articles.published_at / edition-publish cron
```

## Queues / tables

| Store | Role |
|---|---|
| `news_signals` | Genuinely new ingested items |
| `news_ai_queue` | Per-signal AI enrichment |
| `news_events` | Event clusters (candidates) |
| `event_bus_messages` | Durable pub/sub; `ingest.completed` enqueues jobs |
| `worker_jobs` | Unified job queue (`editorial_generate`, embed, cluster, …) |
| `worker_job_runs` | Per-attempt outcome log |
| `worker_dead_letters` | Exhausted retries |
| `generated_articles` | Draft / approved / published stories |
| `editorial_image_queue` | Post-generate image enrichment |
| `ops_cron_runs` | Cron heartbeats |

## Workers involved

| Worker | Where it runs | Relation to generation |
|---|---|---|
| `ai_enrich` | orchestrate | Feeds enriched signals |
| `job_processor` | orchestrate | Delivers event bus **and** drains **all** `worker_jobs` including `editorial_generate` |
| `intelligence_embed` | orchestrate | Feeder; competes for budget |
| `intelligence_snapshot` | orchestrate | Feeder; competes for budget |
| `analytics_aggregate` | orchestrate | Competes for budget |
| `editorial_images` | orchestrate (last) | Often skipped (`deadline_budget`) |
| `editorial_generate` (direct QUEUE_WORKER) | `/api/cron/worker/editorial_generate` | **Gated off** for normal schedules (`canonical_path_ingest_event_job_processor`) |

Canonical generation path (policy):  
`ingest → event bus → worker_jobs(editorial_generate) → job_processor`.

## Current tunables

| Setting | Default | Source |
|---|---|---|
| Orchestrate budget | **110_000 ms** | `ORCHESTRATE_BUDGET_MS` / `INFRA_CONFIG.orchestrateBudgetMs` |
| Route `maxDuration` | 120 s | `orchestrate` + worker routes |
| Worker deadline reserve | 3_000 ms | `WORKER_DEADLINE_RESERVE_MS` |
| Job batch size | 8 | `WORKER_JOB_BATCH` |
| Editorial batch limit | 6 (noon edition) | `EDITORIAL_BATCH_LIMIT` / `EDITORIAL_LIMITS` |
| Editorial concurrency | 2 (max 4) | `EDITORIAL_CONCURRENCY` |
| Stale claim lease | **120_000 ms** | `WORKER_STALE_CLAIM_MS` |
| Job default timeout | 120_000 ms | enqueue `timeoutMs` |
| Job max attempts | 5 | enqueue default |
| Retry | exponential backoff | `nextRetryAt` |
| Claim mechanism | select pending → update `status=claimed` where still pending | `claimJobBatch` |
| Overlap lock (orchestrate) | 1700 s | `runWorkerEndpoint` |
| Daily editorial capacity | 40 | `EDITORIAL_CAPACITY.dailyLimit` |

## Orchestrator dependency (the starvation)

`INTELLIGENCE_PIPELINE` order:

1. `ai_enrich`
2. `job_processor` ← **only place that normally drains `editorial_generate`**
3. `intelligence_embed`
4. `intelligence_snapshot`
5. `analytics_aggregate`
6. `editorial_images`

All share ~110 s. Heavy feeders (`intelligence_snapshot` avg ~20 s, `embed_signals` avg ~15 s) consume the budget; `editorial_generate` jobs inside `job_processor` frequently hit `job_timeout`. Audit window: ~194 pending feeder/generation jobs; 9 `editorial_generate` timeouts; 18 pending at audit time.

## Schedules (before)

| Schedule | Cadence | Notes |
|---|---|---|
| `/api/fetch-news` | `7,37 * * * *` | Enqueues via event bus after ingest |
| `/api/cron/orchestrate` | `15,45 * * * *` | Shared budget; generation starves here |
| QStash `jandarpan-editorial-generate` | **retired** | Explicitly deleted by setup script |
| Direct `/api/cron/worker/editorial_generate` | not in vercel.json | Gated unless `EDITORIAL_GENERATE_BACKUP_CRON=true` |

## Idempotency already present

- `enqueueJob` dedupes on `(job_type, dedupe_key)` among `pending`/`claimed`
- Event bus insert unique on `dedupe_key`
- `generateEditorialsFromEvents` skips `news_events` that already have `generated_articles.event_id`
- Stale `claimed` rows reclaim after lease expiry

## Gaps this phase closes

1. No independent generation schedule — waits behind orchestrate.
2. `job_processor` claims generation jobs inside the shared 110 s budget.
3. No generation-specific throughput / queue-age incidents.
4. No dedicated heartbeat for a generation lane.
5. Candidate ordering is urgency-only (weak fairness across districts/categories).
