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
| Generated SQL registering every job | `supabase/migrations/20260930080000_089_scheduler_hardening.sql` (between the `GENERATED JOBS` markers). `083` is frozen (already applied); 089 supersedes its job block and dispatcher |
| Regenerate after editing the manifest | `pnpm exec tsx scripts/generate-scheduler-migration.ts` (a test fails if they drift) |
| Dispatcher | `public.jd_invoke_cron(job, path, method, timeout_ms, lease_key)` — **kill switch** → **lease pre-check** → reads Vault → one async HTTP request → logs it |
| Kill switch | `scheduler_control.enabled` (**default `false`**). `select public.jd_set_scheduler_enabled(true, 'reason');` / `(false)` |
| Retention | `jd_prune_scheduler_logs()` (daily, always on) and `jd_prune_storage()` (daily, gated by `scheduler_control.prune_enabled`, default `false`) — both pure SQL, nothing runs on Vercel |
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
| cluster | `3-59/10` | cron-jobs (worker queue) | `4-59/30` |
| editorial-generate | `1-59/10` | translation-backfill | `10-59/30` |
| edition-publish | `2 * * * *` | district-coverage | `20 * * * *` |
| provider-quota-snapshot | `25 * * * *` | verified-rates | `30 0,1,3,7,13 * * *` |
| newsroom-daily-report | `30 20 * * *` | prune-scheduler-logs (SQL) | `40 21 * * *` |
| prune-storage (SQL, gated) | `50 21 * * *` | | |

**Removed in 089:** `process-ai` (legacy enrichment, burned AI quota), `workers-health` (covered by the admin snapshot's per-job
health), `cleanup` (Vercel-hosted; replaced by SQL `jd_prune_storage`), `scheduler-log-cleanup` (replaced by
`jd_prune_scheduler_logs`). **`audio-generate` is unscheduled** until Google credentials are configured on purpose
(also requires `AUDIO_GENERATION_ENABLED=true` on the app).

Editorial generation runs every 10 minutes × 4 stories/run (≥ 576 attempts/day of headroom for 100 published). Every job that
could overlap itself carries a lease key; the dispatcher does not even call Vercel while the previous run still holds it
(logged in `scheduler_dispatch_log.skipped = 'lease_held'`), and the route re-checks the lease as the authoritative guard.
Lease TTLs are now 360 s (crash safety only — leases are released as soon as a run ends).

## Retention & the 500 MB Free limit

On 2026-09-30 the database was ~404 MB. `news_articles` 159 MB (70k rows), `competitor_articles` 79 MB, `news_signals` 43 MB,
`news_events` 22 MB. ~90 % of the first three are older than 30 days: `cleanup_old_data()` (migration 077) had never run in
production because its only trigger was the Vercel route. `jd_prune_storage()` applies the **same 30-day windows** as 077 in
bounded batches (2 000 rows × ≤25 batches per table per run), never touches `generated_articles`, and stays off until:

```sql
select public.jd_prune_storage();                 -- returns {"skipped":"prune_disabled"} until enabled
select public.jd_set_prune_enabled(true);         -- operator decision
```

Deleting rows frees space for reuse but does **not** shrink the database size Supabase reports. Reclaiming the ~300 MB needs a
one-off `VACUUM FULL` (or pg_repack) of the big tables — it takes an exclusive lock, so run it in a quiet window and only with
explicit approval.

## Enable (operator, one time)

1. Apply migrations 081–089 (`pnpm supabase:push`). `083` creates the extensions and dispatcher; `089` adds the kill switch
   (**disabled**), retires the removed jobs and re-registers the rest. While `scheduler_control.enabled = false` the dispatcher
   is a silent no-op even if the Vault secrets exist.
2. `pnpm exec tsx scripts/setup-supabase-scheduler.ts` (plan) then `… --apply`. It generates a fresh secret, stores it on
   Vercel as `CRON_SCHEDULER_SECRET` (sensitive) and in Vault, and never prints or writes it to disk.
3. **Redeploy production** so the env var is live.
4. Turn the scheduler on: `select public.jd_set_scheduler_enabled(true, 'go-live <date>');`
5. Verify:

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

Healthy after 30 minutes: `fetch-news` ≈ 3 runs, `editorial-generate` ≈ 3, `http_non_2xx = 0`, and the admin dashboard
“Cron / scheduler” cell is green.

6. After 30+ minutes of healthy runs the GitHub Actions `schedule:` triggers (`ingest.yml`, `workers.yml`,
   `editorial.yml`, `drain.yml`) can be reduced to `workflow_dispatch` only. They are safe to leave: duplicates are
   absorbed by the leases.

## Roll back

```sql
select public.jd_set_scheduler_enabled(false, 'rollback');               -- instant: every dispatch becomes a no-op
select cron.unschedule(jobid) from cron.job where jobname like 'jd-%';   -- (optional) remove the schedules entirely
```
The routes and the GitHub workflows are unchanged, so the previous (throttled) behaviour resumes immediately.

## Rotate the secret

Re-run `scripts/setup-supabase-scheduler.ts --apply`, redeploy. Nothing else references the value.
