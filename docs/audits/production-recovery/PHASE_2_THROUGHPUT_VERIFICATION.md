# Phase 2 — Throughput Targets & Verification

## Explicit targets

| Target | Value |
|---|---|
| Eligible cluster → generation | ≤ **15 minutes** |
| Oldest pending `editorial_generate` | ≤ **30 minutes** (normal ops) |
| Worker budget | **100 s** soft stop (&lt; 120 s hard) |
| Jobs per invocation | **3** (bounded) |
| Partial failure | One failed job must not stop the batch |
| Quality / volume | Respect `EDITORIAL_CAPACITY` (40/day) and quality gates |

Constants: `GENERATION_LANE_TARGETS` in
`src/lib/infrastructure/workers/editorial-generate-observability.ts`.

## Incidents raised by the lane

| Code | When |
|---|---|
| `eligible_enter_sla` | Oldest pending &gt; 15 m |
| `queue_age_exceeded` | Oldest pending &gt; 30 m |
| `no_recent_success` | No success in 60 m while backlog exists |
| `no_success_record` | Backlog with no success history |
| `dead_letters` | Dead `editorial_generate` rows exist |
| `cron_unregistered` | Heartbeat id missing from registry |

## Automated verification (local)

| Check | Result |
|---|---|
| Priority / fairness unit tests | See vitest |
| Lane outcome classification | success / degraded / failed |
| Policy: dedicated_lane allowed; legacy scheduled_cron blocked | pass |
| Schedule contract (vercel + qstash + excludeJobTypes) | pass |
| Registered cron includes `editorial-generate` | pass |
| Full suite / typecheck / build | recorded in checkpoint |

## Production verification (post-deploy — not this phase)

1. Confirm Vercel cron + QStash deliver to `/api/cron/editorial-generate`
2. Watch `ops_cron_runs` for `editorial-generate` with `ok=true` / `degraded`
3. Confirm `worker_jobs` pending `editorial_generate` age drops below 30 m
4. Confirm `job_processor` runs no longer claim `editorial_generate`
5. Confirm generation counts rise without violating daily editorial capacity
