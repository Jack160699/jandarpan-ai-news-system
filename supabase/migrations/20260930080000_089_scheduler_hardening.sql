-- Migration 089: scheduler hardening (supersedes the job block + dispatcher of 083; 083 is frozen/applied)
--
-- WHAT THIS DOES
--   1. scheduler_control: a database kill switch. `enabled` DEFAULTS TO FALSE, so applying this migration
--      (or provisioning the Vault secrets later) never starts the pipeline by itself. An operator enables it
--      explicitly:  select public.jd_set_scheduler_enabled(true, 'why');
--   2. jd_invoke_cron (5-arg): honours the kill switch and skips the HTTP call while the job's run lease
--      (worker_run_leases) is still held, so a slow run can never stack duplicates. The old 4-arg signature
--      is kept as a thin wrapper so any stale registration is ALSO governed by the kill switch.
--   3. Retires jd-process-ai, jd-workers-health, jd-cleanup (Vercel-hosted) and jd-scheduler-log-cleanup.
--      Unschedules jd-audio-generate (audio stays off until Google credentials are configured on purpose).
--   4. Re-registers the active jobs (editorial-generate every 10 min, cron-jobs/translation every 30 min)
--      with their lease keys.
--   5. editorial_candidate_attempts + record_editorial_candidate_failure(): persistent failed-candidate
--      tracking with exponential backoff and dead-lettering after 4 attempts.
--   6. Retention, entirely inside Postgres (no Vercel invocation):
--        jd_prune_scheduler_logs()  - cron.job_run_details + scheduler_dispatch_log (always safe, 3 days)
--        jd_prune_storage()         - bounded batch deletes on large operational tables, GATED by
--                                     scheduler_control.prune_enabled (default FALSE). Uses the same 30-day
--                                     windows as migration 077; it never touches generated_articles.
--      Deleting rows makes space reusable but does NOT shrink the reported database size; a one-off
--      VACUUM FULL / pg_repack of the big tables needs separate, explicit approval (see docs).
--
-- ROLLBACK: select public.jd_set_scheduler_enabled(false); (dispatch stops immediately). Objects are additive.

-- ============================================================
-- PART 1: kill switch
-- ============================================================
create table if not exists public.scheduler_control (
  id                smallint primary key default 1 check (id = 1),
  enabled           boolean not null default false,
  prune_enabled     boolean not null default false,
  note              text,
  updated_at        timestamptz not null default now(),
  last_prune_at     timestamptz,
  last_prune_result jsonb
);

insert into public.scheduler_control (id) values (1) on conflict (id) do nothing;
alter table public.scheduler_control enable row level security;

create or replace function public.jd_scheduler_enabled()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((select enabled from public.scheduler_control where id = 1), false)
$$;

create or replace function public.jd_set_scheduler_enabled(p_enabled boolean, p_note text default null)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.scheduler_control (id, enabled, note, updated_at)
  values (1, p_enabled, p_note, now())
  on conflict (id) do update
    set enabled = excluded.enabled,
        note = coalesce(excluded.note, public.scheduler_control.note),
        updated_at = now();
  return p_enabled;
end;
$$;

create or replace function public.jd_set_prune_enabled(p_enabled boolean)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.scheduler_control (id, prune_enabled, updated_at)
  values (1, p_enabled, now())
  on conflict (id) do update set prune_enabled = excluded.prune_enabled, updated_at = now();
  return p_enabled;
end;
$$;

revoke all on function public.jd_scheduler_enabled() from public, anon, authenticated;
revoke all on function public.jd_set_scheduler_enabled(boolean, text) from public, anon, authenticated;
revoke all on function public.jd_set_prune_enabled(boolean) from public, anon, authenticated;
grant execute on function public.jd_scheduler_enabled() to postgres, service_role;
grant execute on function public.jd_set_scheduler_enabled(boolean, text) to postgres, service_role;
grant execute on function public.jd_set_prune_enabled(boolean) to postgres, service_role;

-- ============================================================
-- PART 2: dispatcher with kill switch + lease pre-check
-- ============================================================
alter table public.scheduler_dispatch_log add column if not exists skipped text;

create or replace function public.jd_invoke_cron(
  p_job text,
  p_path text,
  p_method text,
  p_timeout_ms integer,
  p_lease_key text
) returns bigint
language plpgsql
security definer
set search_path = public, extensions, vault
as $$
declare
  v_secret  text;
  v_base    text;
  v_request bigint;
  v_headers jsonb;
begin
  -- Kill switch: silent no-op (no log row, no secret read, no network).
  if not public.jd_scheduler_enabled() then
    return null;
  end if;

  -- Overlap pre-check: the previous run of this job still holds its lease -> do not even call Vercel.
  if p_lease_key is not null and exists (
    select 1 from public.worker_run_leases l
    where l.lease_key = p_lease_key and l.expires_at > now()
  ) then
    insert into public.scheduler_dispatch_log (job_id, path, skipped)
    values (p_job, p_path, 'lease_held');
    return null;
  end if;

  select decrypted_secret into v_secret from vault.decrypted_secrets where name = 'jd_cron_secret' limit 1;
  select decrypted_secret into v_base   from vault.decrypted_secrets where name = 'jd_app_base_url' limit 1;

  if v_secret is null or v_base is null then
    insert into public.scheduler_dispatch_log (job_id, path, error)
    values (p_job, p_path, 'vault_secrets_missing');
    return null;
  end if;

  v_headers := jsonb_build_object(
    'Authorization', 'Bearer ' || v_secret,
    'Content-Type', 'application/json',
    'User-Agent', 'jandarpan-supabase-scheduler/2'
  );

  if upper(p_method) = 'GET' then
    select net.http_get(
      url := rtrim(v_base, '/') || p_path,
      headers := v_headers,
      timeout_milliseconds := p_timeout_ms
    ) into v_request;
  else
    select net.http_post(
      url := rtrim(v_base, '/') || p_path,
      body := '{}'::jsonb,
      headers := v_headers,
      timeout_milliseconds := p_timeout_ms
    ) into v_request;
  end if;

  insert into public.scheduler_dispatch_log (job_id, path, request_id)
  values (p_job, p_path, v_request);
  return v_request;
exception when others then
  insert into public.scheduler_dispatch_log (job_id, path, error)
  values (p_job, p_path, left(sqlerrm, 500));
  return null;
end;
$$;

-- Legacy 4-arg signature (any job still registered by 083) now routes through the same guarded dispatcher.
create or replace function public.jd_invoke_cron(
  p_job text,
  p_path text,
  p_method text default 'POST',
  p_timeout_ms integer default 60000
) returns bigint
language sql
security definer
set search_path = public, extensions, vault
as $$
  select public.jd_invoke_cron(p_job, p_path, p_method, p_timeout_ms, null::text)
$$;

revoke all on function public.jd_invoke_cron(text, text, text, integer, text) from public, anon, authenticated;
revoke all on function public.jd_invoke_cron(text, text, text, integer) from public, anon, authenticated;
grant execute on function public.jd_invoke_cron(text, text, text, integer, text) to postgres, service_role;
grant execute on function public.jd_invoke_cron(text, text, text, integer) to postgres, service_role;

-- ============================================================
-- PART 3: persistent failed-candidate tracking (backoff + dead-letter)
-- ============================================================
create table if not exists public.editorial_candidate_attempts (
  event_id         uuid primary key,
  attempts         integer not null default 0,
  last_reason      text,
  first_failed_at  timestamptz not null default now(),
  last_attempt_at  timestamptz not null default now(),
  next_retry_at    timestamptz,
  dead_lettered_at timestamptz,
  updated_at       timestamptz not null default now()
);

create index if not exists editorial_candidate_attempts_retry_idx
  on public.editorial_candidate_attempts (next_retry_at)
  where dead_lettered_at is null;
create index if not exists editorial_candidate_attempts_updated_idx
  on public.editorial_candidate_attempts (updated_at);

alter table public.editorial_candidate_attempts enable row level security;

-- Atomic: increments attempts, pushes next_retry_at out exponentially (base * 2^(n-1), capped) and
-- dead-letters the event once attempts >= p_max_attempts. A dead-lettered event is never auto-retried.
create or replace function public.record_editorial_candidate_failure(
  p_event_id uuid,
  p_reason text,
  p_max_attempts integer default 4,
  p_base_seconds integer default 900,
  p_max_seconds integer default 43200
) returns table (attempts integer, dead_lettered boolean)
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  insert into public.editorial_candidate_attempts as a
    (event_id, attempts, last_reason, first_failed_at, last_attempt_at, next_retry_at, dead_lettered_at, updated_at)
  values (
    p_event_id, 1, left(p_reason, 500), now(), now(),
    now() + make_interval(secs => least(p_max_seconds, p_base_seconds)::double precision),
    case when 1 >= p_max_attempts then now() end,
    now()
  )
  on conflict (event_id) do update
    set attempts         = a.attempts + 1,
        last_reason      = left(excluded.last_reason, 500),
        last_attempt_at  = now(),
        next_retry_at    = now() + make_interval(
                             secs => least(p_max_seconds::double precision,
                                           p_base_seconds * (2 ^ least(a.attempts, 20)))),
        dead_lettered_at = coalesce(a.dead_lettered_at,
                                    case when a.attempts + 1 >= p_max_attempts then now() end),
        updated_at       = now()
  returning a.attempts, (a.dead_lettered_at is not null);
end;
$$;

revoke all on function public.record_editorial_candidate_failure(uuid, text, integer, integer, integer) from public, anon, authenticated;
grant execute on function public.record_editorial_candidate_failure(uuid, text, integer, integer, integer) to service_role;

-- ============================================================
-- PART 4: retention (database-side; nothing runs on Vercel)
-- ============================================================

-- History of the scheduler itself. Always safe: only deletes log rows older than p_days.
create or replace function public.jd_prune_scheduler_logs(p_days integer default 3)
returns jsonb
language plpgsql
security definer
set search_path = public, cron
as $$
declare
  v_dispatch bigint := 0;
  v_cron_history bigint := 0;
  v_days integer := greatest(coalesce(p_days, 3), 1);
begin
  delete from public.scheduler_dispatch_log
  where dispatched_at < now() - make_interval(days => v_days);
  get diagnostics v_dispatch = row_count;

  if to_regclass('cron.job_run_details') is not null then
    execute format(
      'delete from cron.job_run_details where end_time < now() - make_interval(days => %s)', v_days);
    get diagnostics v_cron_history = row_count;
  end if;

  return jsonb_build_object('dispatch_log', v_dispatch, 'cron_job_run_details', v_cron_history, 'ran_at', now());
end;
$$;

-- Bounded deletes on large OPERATIONAL tables (same windows as 077; generated_articles is never touched).
-- Every table is processed in batches of p_batch rows, at most p_max_batches batches per run, so one run
-- can never hold a long lock or run away. Disabled until scheduler_control.prune_enabled = true.
create or replace function public.jd_prune_storage(
  p_batch integer default 2000,
  p_max_batches integer default 25,
  p_force boolean default false
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_result jsonb := '{}'::jsonb;
  v_spec   record;
  v_batch  integer := greatest(least(coalesce(p_batch, 2000), 10000), 100);
  v_max    integer := greatest(least(coalesce(p_max_batches, 25), 100), 1);
  v_n      bigint;
  v_total  bigint;
  v_loop   integer;
begin
  if not p_force and not coalesce((select prune_enabled from public.scheduler_control where id = 1), false) then
    return jsonb_build_object('skipped', 'prune_disabled');
  end if;

  set local statement_timeout = '120s';

  for v_spec in
    select * from (values
      -- table,                         timestamp column, retention (days), extra predicate
      ('news_articles',                 'created_at',   30, 'true'),
      ('competitor_articles',           'created_at',   30, 'true'),
      ('news_signals',                  'created_at',   30, 'true'),
      ('ingestion_logs',                'created_at',   30, 'true'),
      ('worker_job_runs',               'created_at',   30, 'true'),
      ('queue_cleanup_archive',         'archived_at',  30, 'true'),
      ('worker_jobs',                   'created_at',   30, $p$status in ('completed','failed','dead')$p$),
      ('news_ai_queue',                 'created_at',   30, $p$status in ('completed','failed','dead','rejected_stale','rejected_duplicate','rejected_geo','rejected_quality')$p$),
      ('editorial_image_queue',         'created_at',   30, $p$status in ('completed','failed','skipped')$p$),
      ('ops_cron_runs',                 'created_at',   30, 'true'),
      ('ops_error_events',              'created_at',   30, 'true'),
      ('event_bus_messages',            'created_at',   30, 'true'),
      ('openai_usage_events',           'created_at',   30, 'true'),
      ('ai_provider_usage_events',      'created_at',   30, 'true'),
      ('editorial_candidate_attempts',  'updated_at',   30, 'true')
    ) as t(tbl, ts_col, days, pred)
  loop
    continue when to_regclass('public.' || v_spec.tbl) is null;
    v_total := 0;
    v_loop := 0;
    loop
      execute format(
        'delete from public.%1$I where ctid in (
           select ctid from public.%1$I
           where %2$I < now() - make_interval(days => %3$s) and (%4$s) limit %5$s)',
        v_spec.tbl, v_spec.ts_col, v_spec.days, v_spec.pred, v_batch);
      get diagnostics v_n = row_count;
      v_total := v_total + v_n;
      v_loop := v_loop + 1;
      exit when v_n < v_batch or v_loop >= v_max;
    end loop;
    v_result := v_result || jsonb_build_object(v_spec.tbl, v_total);
  end loop;

  update public.scheduler_control
     set last_prune_at = now(), last_prune_result = v_result, updated_at = now()
   where id = 1;
  return v_result;
end;
$$;

revoke all on function public.jd_prune_scheduler_logs(integer) from public, anon, authenticated;
revoke all on function public.jd_prune_storage(integer, integer, boolean) from public, anon, authenticated;
grant execute on function public.jd_prune_scheduler_logs(integer) to postgres, service_role;
grant execute on function public.jd_prune_storage(integer, integer, boolean) to postgres, service_role;

-- ============================================================
-- PART 5: (re)register jobs  -- generated from scheduler-manifest.ts
-- ============================================================
-- BEGIN GENERATED JOBS (scripts/generate-scheduler-migration.ts)
select cron.unschedule(jobid) from cron.job where jobname = 'jd-process-ai';
select cron.unschedule(jobid) from cron.job where jobname = 'jd-workers-health';
select cron.unschedule(jobid) from cron.job where jobname = 'jd-cleanup';
select cron.unschedule(jobid) from cron.job where jobname = 'jd-scheduler-log-cleanup';
select cron.unschedule(jobid) from cron.job where jobname = 'jd-audio-generate';
select cron.unschedule(jobid) from cron.job where jobname = 'jd-fetch-news';
select cron.schedule('jd-fetch-news', '*/10 * * * *', $job$ select public.jd_invoke_cron('fetch-news', '/api/fetch-news', 'POST', 290000, 'fetch-news'); $job$);
select cron.unschedule(jobid) from cron.job where jobname = 'jd-cluster';
select cron.schedule('jd-cluster', '3-59/10 * * * *', $job$ select public.jd_invoke_cron('cluster', '/api/cron/cluster', 'POST', 290000, 'cluster'); $job$);
select cron.unschedule(jobid) from cron.job where jobname = 'jd-editorial-generate';
select cron.schedule('jd-editorial-generate', '1-59/10 * * * *', $job$ select public.jd_invoke_cron('editorial-generate', '/api/cron/editorial-generate', 'POST', 290000, 'editorial-generate'); $job$);
select cron.unschedule(jobid) from cron.job where jobname = 'jd-orchestrate';
select cron.schedule('jd-orchestrate', '6-59/15 * * * *', $job$ select public.jd_invoke_cron('orchestrate', '/api/cron/orchestrate', 'POST', 120000, 'orchestrate'); $job$);
select cron.unschedule(jobid) from cron.job where jobname = 'jd-cron-jobs';
select cron.schedule('jd-cron-jobs', '4-59/30 * * * *', $job$ select public.jd_invoke_cron('cron-jobs', '/api/cron/jobs', 'POST', 290000, 'cron_jobs'); $job$);
select cron.unschedule(jobid) from cron.job where jobname = 'jd-translation-backfill';
select cron.schedule('jd-translation-backfill', '10-59/30 * * * *', $job$ select public.jd_invoke_cron('translation-backfill', '/api/cron/translation-backfill', 'POST', 290000, 'translation-backfill'); $job$);
select cron.unschedule(jobid) from cron.job where jobname = 'jd-edition-publish';
select cron.schedule('jd-edition-publish', '2 * * * *', $job$ select public.jd_invoke_cron('edition-publish', '/api/cron/edition-publish', 'POST', 60000, 'edition-publish'); $job$);
select cron.unschedule(jobid) from cron.job where jobname = 'jd-district-coverage';
select cron.schedule('jd-district-coverage', '20 * * * *', $job$ select public.jd_invoke_cron('district-coverage', '/api/cron/district-coverage', 'POST', 60000, null); $job$);
select cron.unschedule(jobid) from cron.job where jobname = 'jd-provider-quota-snapshot';
select cron.schedule('jd-provider-quota-snapshot', '25 * * * *', $job$ select public.jd_invoke_cron('provider-quota-snapshot', '/api/cron/provider-quota-snapshot', 'POST', 30000, null); $job$);
select cron.unschedule(jobid) from cron.job where jobname = 'jd-verified-rates';
select cron.schedule('jd-verified-rates', '30 0,1,3,7,13 * * *', $job$ select public.jd_invoke_cron('verified-rates', '/api/cron/verified-rates', 'POST', 60000, null); $job$);
select cron.unschedule(jobid) from cron.job where jobname = 'jd-newsroom-daily-report';
select cron.schedule('jd-newsroom-daily-report', '30 20 * * *', $job$ select public.jd_invoke_cron('newsroom-daily-report', '/api/cron/newsroom-daily-report', 'POST', 60000, null); $job$);
select cron.unschedule(jobid) from cron.job where jobname = 'jd-prune-scheduler-logs';
select cron.schedule('jd-prune-scheduler-logs', '40 21 * * *', $job$ select public.jd_prune_scheduler_logs(); $job$);
select cron.unschedule(jobid) from cron.job where jobname = 'jd-prune-storage';
select cron.schedule('jd-prune-storage', '50 21 * * *', $job$ select public.jd_prune_storage(); $job$);
-- END GENERATED JOBS
