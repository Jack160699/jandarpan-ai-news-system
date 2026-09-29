-- Migration 083: Supabase-hosted scheduler (pg_cron + pg_net)
--
-- WHY: production scheduling was GitHub Actions `schedule:` crons (nominally every
-- 30 min, actually ~5 runs/day because GitHub throttles/drops scheduled runs) plus
-- Vercel Hobby crons (max once per day). The pipeline ran in bursts every 3-7 hours.
-- pg_cron gives a real minute-level clock inside the database we already depend on,
-- and pg_net calls the SAME authenticated cron routes the workflows used, so no
-- pipeline code changes are needed to move scheduling.
--
-- PREREQUISITES (one-time, done by an operator — see docs/SUPABASE_SCHEDULER.md):
--   select vault.create_secret('<CRON_SCHEDULER_SECRET value>', 'jd_cron_secret');
--   select vault.create_secret('https://www.jandarpan.news',      'jd_app_base_url');
-- and the same secret set as CRON_SCHEDULER_SECRET on Vercel. Until both exist,
-- every dispatch is logged as `vault_secrets_missing` and nothing is called.
--
-- Job definitions live in src/lib/infrastructure/cron/scheduler-manifest.ts; the
-- block between the markers below is generated from it.

create extension if not exists pg_cron with schema pg_catalog;
create extension if not exists pg_net with schema extensions;

create table if not exists public.scheduler_dispatch_log (
  id            bigserial primary key,
  job_id        text not null,
  path          text not null,
  request_id    bigint,
  dispatched_at timestamptz not null default now(),
  error         text
);

create index if not exists scheduler_dispatch_log_job_idx
  on public.scheduler_dispatch_log (job_id, dispatched_at desc);

alter table public.scheduler_dispatch_log enable row level security;

-- Dispatcher: reads credentials from Vault, fires one async HTTP request, logs it.
create or replace function public.jd_invoke_cron(
  p_job text,
  p_path text,
  p_method text default 'POST',
  p_timeout_ms integer default 60000
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
    'User-Agent', 'jandarpan-supabase-scheduler/1'
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

revoke all on function public.jd_invoke_cron(text, text, text, integer) from public, anon, authenticated;
grant execute on function public.jd_invoke_cron(text, text, text, integer) to postgres, service_role;

-- Dashboard view: per-job dispatch health (pg_net keeps responses ~6h, so status
-- counts cover that window; durable run history is ops_cron_runs).
create or replace function public.scheduler_dispatch_summary(p_hours integer default 24)
returns table (
  job_id text,
  dispatched bigint,
  last_dispatched_at timestamptz,
  http_2xx bigint,
  http_non_2xx bigint,
  timed_out bigint,
  dispatch_errors bigint,
  last_error text
)
language sql
security definer
set search_path = public, net
as $$
  select
    d.job_id,
    count(*) as dispatched,
    max(d.dispatched_at) as last_dispatched_at,
    count(*) filter (where r.status_code between 200 and 299) as http_2xx,
    count(*) filter (where r.status_code is not null and not (r.status_code between 200 and 299)) as http_non_2xx,
    count(*) filter (where r.timed_out) as timed_out,
    count(*) filter (where d.error is not null) as dispatch_errors,
    (array_agg(coalesce(d.error, r.error_msg) order by d.dispatched_at desc)
       filter (where coalesce(d.error, r.error_msg) is not null))[1] as last_error
  from public.scheduler_dispatch_log d
  left join net._http_response r on r.id = d.request_id
  where d.dispatched_at > now() - make_interval(hours => greatest(p_hours, 1))
  group by d.job_id
$$;

revoke all on function public.scheduler_dispatch_summary(integer) from public, anon, authenticated;
grant execute on function public.scheduler_dispatch_summary(integer) to service_role;

-- Housekeeping for the dispatch log itself.
select cron.unschedule(jobid) from cron.job where jobname = 'jd-scheduler-log-cleanup';
select cron.schedule(
  'jd-scheduler-log-cleanup',
  '40 21 * * *',
  $job$ delete from public.scheduler_dispatch_log where dispatched_at < now() - interval '3 days'; $job$
);

-- BEGIN GENERATED JOBS (scripts/generate-scheduler-migration.ts)
select cron.unschedule(jobid) from cron.job where jobname = 'jd-fetch-news';
select cron.schedule('jd-fetch-news', '*/10 * * * *', $job$ select public.jd_invoke_cron('fetch-news', '/api/fetch-news', 'POST', 290000); $job$);
select cron.unschedule(jobid) from cron.job where jobname = 'jd-cluster';
select cron.schedule('jd-cluster', '3-59/10 * * * *', $job$ select public.jd_invoke_cron('cluster', '/api/cron/cluster', 'POST', 290000); $job$);
select cron.unschedule(jobid) from cron.job where jobname = 'jd-editorial-generate';
select cron.schedule('jd-editorial-generate', '1-59/5 * * * *', $job$ select public.jd_invoke_cron('editorial-generate', '/api/cron/editorial-generate', 'POST', 290000); $job$);
select cron.unschedule(jobid) from cron.job where jobname = 'jd-orchestrate';
select cron.schedule('jd-orchestrate', '6-59/15 * * * *', $job$ select public.jd_invoke_cron('orchestrate', '/api/cron/orchestrate', 'POST', 120000); $job$);
select cron.unschedule(jobid) from cron.job where jobname = 'jd-cron-jobs';
select cron.schedule('jd-cron-jobs', '4-59/15 * * * *', $job$ select public.jd_invoke_cron('cron-jobs', '/api/cron/jobs', 'POST', 290000); $job$);
select cron.unschedule(jobid) from cron.job where jobname = 'jd-process-ai';
select cron.schedule('jd-process-ai', '8-59/15 * * * *', $job$ select public.jd_invoke_cron('process-ai', '/api/process-ai', 'POST', 60000); $job$);
select cron.unschedule(jobid) from cron.job where jobname = 'jd-audio-generate';
select cron.schedule('jd-audio-generate', '9-59/10 * * * *', $job$ select public.jd_invoke_cron('audio-generate', '/api/cron/audio-generate', 'POST', 290000); $job$);
select cron.unschedule(jobid) from cron.job where jobname = 'jd-translation-backfill';
select cron.schedule('jd-translation-backfill', '10-59/15 * * * *', $job$ select public.jd_invoke_cron('translation-backfill', '/api/cron/translation-backfill', 'POST', 290000); $job$);
select cron.unschedule(jobid) from cron.job where jobname = 'jd-edition-publish';
select cron.schedule('jd-edition-publish', '2 * * * *', $job$ select public.jd_invoke_cron('edition-publish', '/api/cron/edition-publish', 'POST', 60000); $job$);
select cron.unschedule(jobid) from cron.job where jobname = 'jd-workers-health';
select cron.schedule('jd-workers-health', '*/5 * * * *', $job$ select public.jd_invoke_cron('workers-health', '/api/cron/workers/health', 'GET', 30000); $job$);
select cron.unschedule(jobid) from cron.job where jobname = 'jd-district-coverage';
select cron.schedule('jd-district-coverage', '20 * * * *', $job$ select public.jd_invoke_cron('district-coverage', '/api/cron/district-coverage', 'POST', 60000); $job$);
select cron.unschedule(jobid) from cron.job where jobname = 'jd-provider-quota-snapshot';
select cron.schedule('jd-provider-quota-snapshot', '25 * * * *', $job$ select public.jd_invoke_cron('provider-quota-snapshot', '/api/cron/provider-quota-snapshot', 'POST', 30000); $job$);
select cron.unschedule(jobid) from cron.job where jobname = 'jd-verified-rates';
select cron.schedule('jd-verified-rates', '30 0,1,3,7,13 * * *', $job$ select public.jd_invoke_cron('verified-rates', '/api/cron/verified-rates', 'POST', 60000); $job$);
select cron.unschedule(jobid) from cron.job where jobname = 'jd-newsroom-daily-report';
select cron.schedule('jd-newsroom-daily-report', '30 20 * * *', $job$ select public.jd_invoke_cron('newsroom-daily-report', '/api/cron/newsroom-daily-report', 'POST', 60000); $job$);
select cron.unschedule(jobid) from cron.job where jobname = 'jd-cleanup';
select cron.schedule('jd-cleanup', '30 21 * * *', $job$ select public.jd_invoke_cron('cleanup', '/api/cron/cleanup', 'POST', 120000); $job$);
-- END GENERATED JOBS
