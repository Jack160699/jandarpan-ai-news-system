# Phase 2 — Generation Architecture (After)

## Problem

Editorial generation ran inside `job_processor` under the shared orchestrator
(~110 s budget). Feeder workers consumed the budget; `editorial_generate` jobs
timed out; throughput collapsed to ~2–4 stories/day despite hundreds of clusters.

## Solution

A **dedicated generation lane** drains `worker_jobs` where
`job_type = editorial_generate`, on its own schedule and budget. The existing
Postgres queue (claim / lease / retry / DLQ) is reused — no second queue system.

```
ingest.completed
  → event bus enqueues editorial_generate (priority + 90s timeout)
  → /api/cron/editorial-generate (every 15m @ :05/:20/:35/:50)
       → runEditorialGenerateLane
            → claimJobBatch(jobTypes: ["editorial_generate"])
            → JOB_HANDLERS.editorial_generate
                 → generateEditorialsFromEvents(selectEditorialCandidates)
  → orchestrate / job_processor  EXCLUDES editorial_generate
```

## Components

| Module | Role |
|---|---|
| `editorial-generate-lane.ts` | Bounded batch drain + outcome classification |
| `editorial-generate-observability.ts` | SLA targets, metrics, incidents |
| `editorial-priority.ts` | Deterministic candidate ranking + diversity |
| `/api/cron/editorial-generate` | Dedicated cron (100 s budget, 840 s overlap lock) |
| `queue.ts` `excludeJobTypes` | Prevents shared workers from double-claiming |

## Worker contract

- Atomic claim via `status=pending → claimed` (existing `claimJobBatch`)
- Batch limit: 3 jobs/invocation (`EDITORIAL_GENERATE_JOB_BATCH` / default 3)
- Lease reclaim: `WORKER_STALE_CLAIM_MS` (120 s)
- Soft stop before platform hard timeout (`GENERATION_LANE_TARGETS.budgetMs` = 100 s)
- One failed job does not abort the batch (`processJobBatch` continues)
- Partial / released claims → `continuationRequired` for the next cadence
- Outcome: `success | degraded | failed` with honest heartbeat

## Idempotency

- `enqueueJob` dedupes `(job_type, dedupe_key)` among pending/claimed
- Event-bus unique `dedupe_key`
- `generateEditorialsFromEvents` skips events that already have `generated_articles`
- Abandoned claims become eligible only after lease expiry
- Legacy `/api/cron/worker/editorial_generate` gated unless backup env / manual override

## Priority & fairness

`selectEditorialCandidates` ranks by live/breaking, urgency, local CG region,
source count, cluster confidence, freshness, then applies diversity penalties so
one district or politics category cannot dominate a batch. Older valid clusters
receive an anti-starvation boost.
