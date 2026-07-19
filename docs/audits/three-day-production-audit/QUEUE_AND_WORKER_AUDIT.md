# Queue & Worker Audit

Source: `worker_jobs`, `worker_job_runs`, `worker_dead_letters`, `news_ai_queue`, `editorial_image_queue`. Workers run **inside the `orchestrate` cron** (`INTELLIGENCE_PIPELINE = ai_enrich, job_processor, intelligence_embed, intelligence_snapshot, analytics_aggregate, editorial_images`), bounded by `ORCHESTRATE_BUDGET_MS ≈ 110s` (route `maxDuration=120`).

## Queue status (3-day window)

| Queue (job_type) | Pending | Processing/Claimed | Completed 3d | Failed 3d (runs) | DLQ | Oldest pending (IST) | Success rate |
|---|---:|---:|---:|---:|---:|---|---:|
| news_ai_queue (enrichment) | 0 | 0 | 4,534 | 0 | — | — | **100%** |
| editorial_generate | 18 | 0 | 295 (all-time) | 9 | 0 | 2026-07-19 09:15 | 88.9% |
| embed_signals | 40 | 0 | 289 | 44 | 0 | 2026-07-17 17:16 | 73.5% |
| event_cluster | 36 | 0 | 332 | 9 | 0 | 2026-07-18 16:45 | 93.2% |
| intelligence_cluster | 34 | 0 | 302 | 3 | 0 | 2026-07-18 17:15 | 97.7% |
| intelligence_snapshot | 50 | 0 | 357 | 66 | **2** | 2026-07-17 10:46 | 63.5% |
| analytics_aggregate | 35 | 0 | 335 | 6 | 0 | 2026-07-18 11:16 | 95.5% |
| translate_article | **51** | 0 | 6 (all-time) | **26 (100%)** | 0 | 2026-07-17 11:14 | **0.0%** |
| translation_batch | 0 | 0 | 4 | 0 | 0 | — | n/a |
| editorial_image_queue | 1 | 0 | 501 | 0 | — | — | ~100% |

**Total pending across generation-feeding queues ≈ 194 jobs.** Total dead letters = **2** (both `intelligence_snapshot`, `job_timeout`, 5 attempts).

## Failure breakdown (worker_job_runs, window)

| Job type | Runs | OK | Fail | Dominant error |
|---|---:|---:|---:|---|
| intelligence_snapshot | 181 | 115 | 66 | `job_timeout` |
| embed_signals | 166 | 122 | 44 | `job_timeout` |
| analytics_aggregate | 133 | 127 | 6 | `job_timeout` |
| event_cluster | 133 | 124 | 9 | `job_timeout` |
| intelligence_cluster | 129 | 126 | 3 | `job_timeout` |
| editorial_generate | 81 | 72 | 9 | `job_timeout` |
| translate_article | 26 | 0 | 26 | **`urgencyScore is not defined`** (code bug, not timeout) |

## Findings against the checklist

- **Blocked jobs:** ✅ `translate_article` — hard-blocked by a code error (`urgencyScore is not defined`), 51 pending, 0 ever succeeding since ~Jul 9.
- **Backlog / stuck jobs:** ✅ ~194 pending; oldest from **Jul 17 10:46** (>2 days). See `data/stuck_articles_last_3_days.csv` for >30min/>2h/>12h buckets (e.g. intelligence_snapshot: 49/46/25).
- **Orphan jobs / retries creating duplicates:** not observed as duplicates; retries (`max_attempts=5`, exp backoff) re-queue the same row. `translate_article` pending rows show `attempts=0` (freshly enqueued, never claimed) alongside 26 separate failed runs.
- **Jobs without tenant ID:** ✅ **widespread** — e.g. all 18 pending `editorial_generate`, 36/51 pending `translate_article`, 335/335 `analytics_aggregate` have `tenant_id = null`. Single-tenant system (1 `newsroom_tenants` row) so they still process, but this is a data-hygiene gap and complicates any future multi-tenant routing.
- **Jobs completed but not removed:** completed jobs are retained (295–357 per type) rather than purged; `queue_cleanup_archive` (14,500 rows) is the archival path — housekeeping OK.
- **Incorrect pending/backlog calculation:** the admin backlog counts pending per `job_type`; historical `completed` rows are **not** counted as active (verified). No inflation observed here — the backlog is real.
- **Workers with stale heartbeat:** `WORKER_STALE_CLAIM_MS=120s` reclaims stale `claimed` rows to `pending`; no stuck `claimed` rows found (0 claimed at audit time).
- **Renamed/retired workers:** `translation_batch` (4 completed, last Jul 7) appears superseded by `translate_article`; no active renames causing miscount.

## Root cause of the backlog

Every failing worker except `translate_article` fails with **`job_timeout`**. These workers execute **inside the shared `orchestrate` ~110s budget** behind 5 other workers; heavy ones (`intelligence_snapshot` avg 20s/max 39s, `embed_signals` avg 15s/max 33s) get killed when the budget is exhausted, and `editorial_images`/generation are **skipped** (which is why orchestrate is **always `degraded`**). The result is a slowly growing pending backlog and a starved generation lane — the mechanical cause of the 2–4 articles/day output.

**Fix direction (do not apply in this audit):** give generation + embeddings + snapshot their own scheduled lane (separate cron) or a larger/again dedicated budget, and process the backlog; fix the `translate_article` code bug so its 51 pending drain.
