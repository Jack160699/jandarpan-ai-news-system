# Supabase-hosted scheduler (pg_cron + pg_net)

## Why

Production scheduling was GitHub Actions `schedule:` crons (nominally every 30 min) plus Vercel Hobby crons
(once a day at most). Measured over 24h on 2026-09-29 the pipeline ran in bursts every 3–7 hours:
`fetch-news` 14 runs, `editorial-generate` 9, `cluster` 9 — against 144 / 288 / 144 expected at the required
10 / 5 / 10-minute cadence. GitHub drops and delays scheduled runs on low-activity repositories, and Vercel
Hobby refuses sub-daily crons, so neither can carry this workload.

`pg_cron` gives a real clock inside the database we already depend on; `pg_net` calls the **same
authenticated cron routes** the workflows used. No pipeline code moved.

## Moving parts

| Piece | Where |
|---|---|
| Job list (single source of truth) | `src/lib/infrastructure/cron/scheduler-manifest.ts` |
| Generated SQL registering every job | `supabase/migrations/20260930020000_083_supabase_scheduler.sql` (between the `GENERATED JOBS` markers) |
| Regenerate after editing the manifest | `pnpm exec tsx scripts/generate-scheduler-migration.ts` (a test fails if they drift) |
| Dispatcher | `public.jd_invoke_cron(job, path, method, timeout_ms)` — reads Vault, fires one async HTTP request, logs it |
| Credentials | Vault: `jd_cron_secret`, `jd_app_base_url`; Vercel: `CRON_SCHEDULER_SECRET` |
| Overlap protection | `worker_run_leases` (`acquire_run_lease` / `release_run_lease`), held by `runWorkerEndpoint`, released on completion |
| Run records | `ops_cron_runs` (job, ok, duration_ms, processed/skipped/failed, metadata, trigger, run_id) |
| Dashboard | `/admin/overview` → “Scheduled jobs”, “System health” |

`CRON_SCHEDULER_SECRET` is accepted for the `ingest`, `pipeline` and `ops` capabilities and **never** for `admin`
routes. It is independent of `CRON_SECRET`, so it can be rotated without touching GitHub or QStash.

## Cadence (UTC)

| Job | Cron | Job | Cron |
|---|---|---|---|
| fetch-news | `*/10` | orchestrate | `6-59/15` |
| cluster | `3-59/10` | cron-jobs (worker queue) | `4-59/15` |
| editorial-generate | `1-59/5` | process-ai (legacy enrichment) | `8-59/15` |
| audio-generate | `9-59/10` | translation-backfill | `10-59/15` |
| edition-publish | `2 * * * *` | workers-health | `*/5` |
| district-coverage | `20 * * * *` | provider-quota-snapshot | `25 * * * *` |
| verified-rates | `30 0,1,3,7,13 * * *` | newsroom-daily-report | `30 20 * * *` |
| cleanup | `30 21 * * *` | | |

Editorial generation is triggered every 5 minutes but the lease serialises it: a run that is still going makes the next
tick a cheap no-op (`skipped: overlap_lock`), so effective behaviour is “continuous”.

## Enable (operator, one time)

1. Apply migrations 081–088 (`pnpm supabase:push`). `083` creates the extensions, the dispatcher and all 16 schedules.
   Until the secrets exist every dispatch is logged as `vault_secrets_missing` and **nothing is called** — safe.
2. `pnpm exec tsx scripts/setup-supabase-scheduler.ts` (plan) then `… --apply`. It generates a fresh secret, stores it on
   Vercel as `CRON_SCHEDULER_SECRET` (sensitive) and in Vault, and never prints or writes it to disk.
3. **Redeploy production** so the env var is live.
4. Verify:

```sql
-- jobs registered
select jobname, schedule, active from cron.job where jobname like 'jd-%' order by jobname;

-- dispatches in the last hour, with HTTP outcome (pg_net keeps responses ~6h)
select * from public.scheduler_dispatch_summary(1);

-- durable run history written by the routes themselves
select job, count(*) runs, count(*) filter (where ok) ok, max(created_at) last_run
  from public.ops_cron_runs where created_at > now() - interval '1 hour' group by job order by job;

-- pg_cron's own log
select jobid, status, return_message, start_time from cron.job_run_details order by start_time desc limit 20;
```

Healthy after 30 minutes: `fetch-news` ≈ 3 runs, `editorial-generate` ≈ 6 (some `skipped`), `workers-health` ≈ 6,
`http_non_2xx = 0`, and the admin dashboard “Cron / scheduler” cell is green.

5. After 30+ minutes of healthy runs the GitHub Actions `schedule:` triggers (`ingest.yml`, `workers.yml`,
   `editorial.yml`, `drain.yml`) can be reduced to `workflow_dispatch` only. They are safe to leave: duplicates are
   absorbed by the leases.

## Roll back

```sql
select cron.unschedule(jobid) from cron.job where jobname like 'jd-%';   -- stop all scheduled dispatches
```
The routes and the GitHub workflows are unchanged, so the previous (throttled) behaviour resumes immediately.

## Rotate the secret

Re-run `scripts/setup-supabase-scheduler.ts --apply`, redeploy. Nothing else references the value.
