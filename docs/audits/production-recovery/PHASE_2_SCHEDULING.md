# Phase 2 — Dedicated Generation Scheduling

## Cadence

| Scheduler | Path | Cron | Notes |
|---|---|---|---|
| Vercel Cron | `/api/cron/editorial-generate` | `5,20,35,50 * * * *` | Every 15 minutes |
| QStash | same destination | `5,20,35,50 * * * *` | `jandarpan-editorial-generate` |

Offset from:

- `fetch-news` at `:07,:37`
- `orchestrate` at `:15,:45`

## Why 15 minutes

- Target: eligible cluster enters generation within **15 minutes**
- Target: oldest pending generation job **&lt; 30 minutes**
- Batch ≤ 3 jobs × ~editorial batch of 6 candidates fits in **100 s** budget
- Under Vercel `maxDuration = 120`
- Overlap lock **840 s** (~14 min) prevents concurrent duplicate runs

## Duplication prevention

1. `job_processor` and `cron_jobs` pass `excludeJobTypes: ["editorial_generate"]`
2. Legacy direct worker path denied with `use_dedicated_editorial_generate_cron`
   unless `EDITORIAL_GENERATE_BACKUP_CRON=true` or manual override
3. QStash schedule re-enabled (removed from `RETIRED_SCHEDULE_IDS`)
4. Heartbeat id `editorial-generate` registered in `REGISTERED_CRON_JOBS`

## Orchestrator role after Phase 2

Orchestrate keeps coordination that belongs there:

- `ai_enrich`
- event-bus delivery + non-generation job drain
- embeddings / snapshot / analytics
- `editorial_images` (still budget-sensitive; later phase)

It no longer claims or runs `editorial_generate` jobs.
