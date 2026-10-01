-- Migration 085: structured cron run records
--
-- ops_cron_runs only stored (job, ok, duration_ms, degraded, workers, error). The counters
-- recordCronRun() was already handed (entityCount, metadata: generated / published /
-- rejected / skipReasonCounts / candidatePool, queue depth ...) were dropped, so
-- "why did editorial generation publish nothing?" could not be answered from the database
-- (verified: the last worker_job_runs row with skip reasons is from 2026-09-21).
--
-- Every scheduled/manual run now records: started_at, run_id, trigger, processed /
-- skipped / failed counts and a metadata jsonb with stage counters and reason counts.

alter table public.ops_cron_runs
  add column if not exists started_at timestamptz,
  add column if not exists run_id     text,
  add column if not exists trigger    text,
  add column if not exists processed  integer,
  add column if not exists skipped    integer,
  add column if not exists failed     integer,
  add column if not exists metadata   jsonb;

create index if not exists ops_cron_runs_job_created_idx
  on public.ops_cron_runs (job, created_at desc);

create index if not exists ops_cron_runs_created_idx
  on public.ops_cron_runs (created_at desc);

comment on column public.ops_cron_runs.trigger is
  'scheduler (pg_cron) | manual (admin run-now) | github | vercel | unknown';
comment on column public.ops_cron_runs.metadata is
  'Stage counters and reason counts for this run (fetched/inserted/duplicates/rejected/generated/published/skipReasonCounts/queueDepth ...).';
