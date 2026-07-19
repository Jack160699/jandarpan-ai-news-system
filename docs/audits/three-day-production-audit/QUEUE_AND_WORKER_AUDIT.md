# Queue and Worker Audit (three-day window)

**Period:** 17–19 July 2026 (IST)  
**Source:** read-only forensic audit snapshots in `data/`  
**Status:** restored into repo for Phase 3 tooling context (original audit was read-only)

## Headline findings

| Signal | Value |
|---|---|
| Pending `editorial_generate` | **18** |
| Upstream pending (approx.) | **~194** (`translate` 51 + `snapshot` 50 + `embed_signals` 40 + `event_cluster` 36 + `analytics` 35 + `intelligence_cluster` 34 − overlaps noted in CSVs) |
| Dominant failure mode | `job_timeout` under shared orchestrate budget (~110s) |
| Dead letters (window) | **2** on `intelligence_snapshot` (`job_timeout`) |
| Generation output gap | ~4.3k new signals / ~349 clusters → ~10 generated articles |

## Generation lane

- `editorial_generate` completed often without producing new articles (wake-up jobs over already-covered events).
- Pending generation jobs were relatively fresh (&lt;12h) but starved by shared drain.
- Phase 2 introduced a dedicated `/api/cron/editorial-generate` lane; Phase 3 adds **safe backlog recovery tooling** (no production execute in Phase 3).

## Upstream / DLQ notes

- `translate_article`: 100% fail — `ReferenceError: urgencyScore is not defined` (code repair, not requeue).
- `intelligence_snapshot`: heavy timeouts + 2 DLQ rows — classify as retryable after capacity fixes; do not delete DLQ.
- Other intelligence/embed/cluster jobs: timeout backlog — drain after dedicated lanes / budget fixes, not blind bulk requeue.

## CSVs

- `data/stuck_articles_last_3_days.csv`
- `data/queue_status_last_3_days.csv`

## Phase 3 implication

Recovery must classify each job with DB evidence (tenant, duplicates, uncovered `news_events`, existing `generated_articles`, claim lease) and never auto-publish stale stories as breaking news.
