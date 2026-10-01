-- Migration 090: heavy pipeline moves from Vercel to Supabase Edge Functions (scheduler side)
--
-- WHAT THIS DOES
--   1. jd_invoke_edge(): the dispatcher for Edge workers. Same guarantees as jd_invoke_cron (089):
--        kill switch (scheduler_control.enabled, default FALSE)  ->  lease pre-check (worker_run_leases)  ->
--        credentials from Vault  ->  one async pg_net POST to <jd_edge_base_url>/<function>  ->  dispatch log.
--      Every call sends `x-jd-trigger: scheduler`, so the worker ALSO re-checks the kill switch itself.
--   2. Unschedules the Vercel HTTP dispatches that moved (fetch-news, cluster, editorial-generate, translation-backfill).
--   3. Registers the Edge dispatches (generated from src/lib/infrastructure/cron/scheduler-manifest.ts):
--        fetch-worker x6 shards every 10 min | cluster-worker every 10 min | editorial-worker every 5 min (ONE story
--        per wake) | translation-worker every 30 min.
--
-- NOTHING IS ENABLED BY THIS MIGRATION: scheduler_control.enabled stays as it is (false until the operator flips it), and
-- the Vault entries below must exist before any dispatch can happen:
--   select vault.create_secret('https://<project-ref>.supabase.co/functions/v1', 'jd_edge_base_url');
--   select vault.create_secret('<EDGE worker secret>',                            'jd_edge_worker_secret');
-- Until then every dispatch is logged as `vault_secrets_missing` and nothing is called.
--
-- ROLLBACK: select public.jd_set_scheduler_enabled(false);   (all dispatch stops immediately)

create or replace function public.jd_invoke_edge(
  p_job text,
  p_function text,
  p_body jsonb,
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
  v_path    text := '/functions/v1/' || p_function;
begin
  -- Kill switch: silent no-op (no log row, no secret read, no network).
  if not public.jd_scheduler_enabled() then
    return null;
  end if;

  -- Overlap pre-check: the previous run of this unit still holds its lease -> do not even invoke the function.
  if p_lease_key is not null and exists (
    select 1 from public.worker_run_leases l
    where l.lease_key = p_lease_key and l.expires_at > now()
  ) then
    insert into public.scheduler_dispatch_log (job_id, path, skipped)
    values (p_job, v_path, 'lease_held');
    return null;
  end if;

  select decrypted_secret into v_secret from vault.decrypted_secrets where name = 'jd_edge_worker_secret' limit 1;
  select decrypted_secret into v_base   from vault.decrypted_secrets where name = 'jd_edge_base_url' limit 1;

  if v_secret is null or v_base is null then
    insert into public.scheduler_dispatch_log (job_id, path, error)
    values (p_job, v_path, 'vault_secrets_missing');
    return null;
  end if;

  select net.http_post(
    url := rtrim(v_base, '/') || '/' || p_function,
    body := coalesce(p_body, '{}'::jsonb),
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || v_secret,
      'Content-Type', 'application/json',
      'x-jd-trigger', 'scheduler',
      'User-Agent', 'jandarpan-supabase-scheduler/3'
    ),
    timeout_milliseconds := p_timeout_ms
  ) into v_request;

  insert into public.scheduler_dispatch_log (job_id, path, request_id)
  values (p_job, v_path, v_request);
  return v_request;
exception when others then
  insert into public.scheduler_dispatch_log (job_id, path, error)
  values (p_job, v_path, left(sqlerrm, 500));
  return null;
end;
$$;

revoke all on function public.jd_invoke_edge(text, text, jsonb, integer, text) from public, anon, authenticated;
grant execute on function public.jd_invoke_edge(text, text, jsonb, integer, text) to postgres, service_role;

-- BEGIN GENERATED JOBS (scripts/generate-scheduler-migration.ts)
select cron.unschedule(jobid) from cron.job where jobname = 'jd-process-ai';
select cron.unschedule(jobid) from cron.job where jobname = 'jd-workers-health';
select cron.unschedule(jobid) from cron.job where jobname = 'jd-cleanup';
select cron.unschedule(jobid) from cron.job where jobname = 'jd-scheduler-log-cleanup';
select cron.unschedule(jobid) from cron.job where jobname = 'jd-fetch-news';
select cron.unschedule(jobid) from cron.job where jobname = 'jd-cluster';
select cron.unschedule(jobid) from cron.job where jobname = 'jd-editorial-generate';
select cron.unschedule(jobid) from cron.job where jobname = 'jd-translation-backfill';
select cron.unschedule(jobid) from cron.job where jobname = 'jd-audio-generate';
select cron.unschedule(jobid) from cron.job where jobname = 'jd-orchestrate';
select cron.schedule('jd-orchestrate', '6-59/15 * * * *', $job$ select public.jd_invoke_cron('orchestrate', '/api/cron/orchestrate', 'POST', 120000, 'orchestrate'); $job$);
select cron.unschedule(jobid) from cron.job where jobname = 'jd-cron-jobs';
select cron.schedule('jd-cron-jobs', '4-59/30 * * * *', $job$ select public.jd_invoke_cron('cron-jobs', '/api/cron/jobs', 'POST', 290000, 'cron_jobs'); $job$);
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
select cron.unschedule(jobid) from cron.job where jobname = 'jd-edge-fetch-news-0';
select cron.schedule('jd-edge-fetch-news-0', '0-59/10 * * * *', $job$ select public.jd_invoke_edge('fetch-news', 'fetch-worker', '{"shard":0,"shards":10}'::jsonb, 150000, 'edge-fetch-10-0'); $job$);
select cron.unschedule(jobid) from cron.job where jobname = 'jd-edge-fetch-news-1';
select cron.schedule('jd-edge-fetch-news-1', '1-59/10 * * * *', $job$ select public.jd_invoke_edge('fetch-news', 'fetch-worker', '{"shard":1,"shards":10}'::jsonb, 150000, 'edge-fetch-10-1'); $job$);
select cron.unschedule(jobid) from cron.job where jobname = 'jd-edge-fetch-news-2';
select cron.schedule('jd-edge-fetch-news-2', '2-59/10 * * * *', $job$ select public.jd_invoke_edge('fetch-news', 'fetch-worker', '{"shard":2,"shards":10}'::jsonb, 150000, 'edge-fetch-10-2'); $job$);
select cron.unschedule(jobid) from cron.job where jobname = 'jd-edge-fetch-news-3';
select cron.schedule('jd-edge-fetch-news-3', '3-59/10 * * * *', $job$ select public.jd_invoke_edge('fetch-news', 'fetch-worker', '{"shard":3,"shards":10}'::jsonb, 150000, 'edge-fetch-10-3'); $job$);
select cron.unschedule(jobid) from cron.job where jobname = 'jd-edge-fetch-news-4';
select cron.schedule('jd-edge-fetch-news-4', '4-59/10 * * * *', $job$ select public.jd_invoke_edge('fetch-news', 'fetch-worker', '{"shard":4,"shards":10}'::jsonb, 150000, 'edge-fetch-10-4'); $job$);
select cron.unschedule(jobid) from cron.job where jobname = 'jd-edge-fetch-news-5';
select cron.schedule('jd-edge-fetch-news-5', '5-59/10 * * * *', $job$ select public.jd_invoke_edge('fetch-news', 'fetch-worker', '{"shard":5,"shards":10}'::jsonb, 150000, 'edge-fetch-10-5'); $job$);
select cron.unschedule(jobid) from cron.job where jobname = 'jd-edge-fetch-news-6';
select cron.schedule('jd-edge-fetch-news-6', '6-59/10 * * * *', $job$ select public.jd_invoke_edge('fetch-news', 'fetch-worker', '{"shard":6,"shards":10}'::jsonb, 150000, 'edge-fetch-10-6'); $job$);
select cron.unschedule(jobid) from cron.job where jobname = 'jd-edge-fetch-news-7';
select cron.schedule('jd-edge-fetch-news-7', '7-59/10 * * * *', $job$ select public.jd_invoke_edge('fetch-news', 'fetch-worker', '{"shard":7,"shards":10}'::jsonb, 150000, 'edge-fetch-10-7'); $job$);
select cron.unschedule(jobid) from cron.job where jobname = 'jd-edge-fetch-news-8';
select cron.schedule('jd-edge-fetch-news-8', '8-59/10 * * * *', $job$ select public.jd_invoke_edge('fetch-news', 'fetch-worker', '{"shard":8,"shards":10}'::jsonb, 150000, 'edge-fetch-10-8'); $job$);
select cron.unschedule(jobid) from cron.job where jobname = 'jd-edge-fetch-news-9';
select cron.schedule('jd-edge-fetch-news-9', '9-59/10 * * * *', $job$ select public.jd_invoke_edge('fetch-news', 'fetch-worker', '{"shard":9,"shards":10}'::jsonb, 150000, 'edge-fetch-10-9'); $job$);
select cron.unschedule(jobid) from cron.job where jobname = 'jd-edge-cluster';
select cron.schedule('jd-edge-cluster', '7-59/10 * * * *', $job$ select public.jd_invoke_edge('cluster', 'cluster-worker', '{}'::jsonb, 150000, 'edge-cluster'); $job$);
select cron.unschedule(jobid) from cron.job where jobname = 'jd-edge-editorial-generate';
select cron.schedule('jd-edge-editorial-generate', '2-59/5 * * * *', $job$ select public.jd_invoke_edge('editorial-generate', 'editorial-worker', '{}'::jsonb, 150000, 'editorial-generate'); $job$);
select cron.unschedule(jobid) from cron.job where jobname = 'jd-edge-translation';
select cron.schedule('jd-edge-translation', '10-59/30 * * * *', $job$ select public.jd_invoke_edge('translation', 'translation-worker', '{}'::jsonb, 150000, 'edge-translation'); $job$);
select cron.unschedule(jobid) from cron.job where jobname = 'jd-prune-scheduler-logs';
select cron.schedule('jd-prune-scheduler-logs', '40 21 * * *', $job$ select public.jd_prune_scheduler_logs(); $job$);
select cron.unschedule(jobid) from cron.job where jobname = 'jd-prune-storage';
select cron.schedule('jd-prune-storage', '50 21 * * *', $job$ select public.jd_prune_storage(); $job$);
-- END GENERATED JOBS
