-- 047: Fix cleanup_old_data for optional tables (openai_prompt_cache may be absent)

drop function if exists public.cleanup_old_data();

create or replace function public.cleanup_old_data()
returns jsonb
language plpgsql
security definer
set search_path = public
as $function$
declare
  v_signals int := 0;
  v_ingestion_logs int := 0;
  v_worker_job_runs int := 0;
  v_queue_archive int := 0;
  v_snapshots int := 0;
  v_worker_jobs int := 0;
  v_ai_queue int := 0;
  v_image_queue int := 0;
  v_prompt_cache int := 0;
  v_cron_runs int := 0;
  v_error_events int := 0;
  v_event_bus int := 0;
  v_stale_events int := 0;
  v_archived_articles int := 0;
  v_signals_days int := coalesce(nullif(current_setting('app.retention_signals_days', true), '')::int, 7);
  v_snapshots_days int := coalesce(nullif(current_setting('app.retention_snapshots_days', true), '')::int, 30);
  v_article_archive_days int := coalesce(nullif(current_setting('app.retention_article_archive_days', true), '')::int, 90);
begin
  delete from public.news_signals
  where created_at < now() - make_interval(days => v_signals_days);
  get diagnostics v_signals = row_count;

  delete from public.ingestion_logs
  where created_at < now() - interval '14 days';
  get diagnostics v_ingestion_logs = row_count;

  delete from public.worker_job_runs
  where created_at < now() - interval '14 days';
  get diagnostics v_worker_job_runs = row_count;

  delete from public.queue_cleanup_archive
  where archived_at < now() - interval '30 days';
  get diagnostics v_queue_archive = row_count;

  delete from public.intelligence_snapshots
  where built_at < now() - make_interval(days => v_snapshots_days);
  get diagnostics v_snapshots = row_count;

  delete from public.worker_jobs
  where status in ('completed', 'failed', 'dead')
    and coalesce(completed_at, updated_at, created_at) < now() - interval '14 days';
  get diagnostics v_worker_jobs = row_count;

  delete from public.news_ai_queue
  where status in ('completed', 'failed')
    and coalesce(processed_at, created_at) < now() - interval '7 days';
  get diagnostics v_ai_queue = row_count;

  delete from public.editorial_image_queue
  where status in ('completed', 'failed', 'skipped')
    and coalesce(processed_at, created_at) < now() - interval '14 days';
  get diagnostics v_image_queue = row_count;

  if to_regclass('public.openai_prompt_cache') is not null then
    execute 'delete from public.openai_prompt_cache where expires_at < now()';
    get diagnostics v_prompt_cache = row_count;
  end if;

  delete from public.ops_cron_runs
  where created_at < now() - interval '30 days';
  get diagnostics v_cron_runs = row_count;

  delete from public.ops_error_events
  where created_at < now() - interval '30 days';
  get diagnostics v_error_events = row_count;

  delete from public.event_bus_messages
  where created_at < now() - interval '7 days';
  get diagnostics v_event_bus = row_count;

  delete from public.news_events e
  where e.updated_at < now() - interval '14 days'
    and not exists (
      select 1
      from public.generated_articles g
      where g.event_id = e.id
        and g.published_at is not null
    );
  get diagnostics v_stale_events = row_count;

  update public.generated_articles
  set
    workflow_status = 'archived',
    editorial_status = 'archived'
  where published_at is not null
    and published_at < now() - make_interval(days => v_article_archive_days)
    and coalesce(workflow_status, 'published') = 'published'
    and coalesce(homepage_pin, false) = false;
  get diagnostics v_archived_articles = row_count;

  return jsonb_build_object(
    'news_signals', v_signals,
    'ingestion_logs', v_ingestion_logs,
    'worker_job_runs', v_worker_job_runs,
    'queue_cleanup_archive', v_queue_archive,
    'intelligence_snapshots', v_snapshots,
    'worker_jobs', v_worker_jobs,
    'news_ai_queue', v_ai_queue,
    'editorial_image_queue', v_image_queue,
    'openai_prompt_cache', v_prompt_cache,
    'ops_cron_runs', v_cron_runs,
    'ops_error_events', v_error_events,
    'event_bus_messages', v_event_bus,
    'stale_news_events', v_stale_events,
    'archived_generated_articles', v_archived_articles,
    'ran_at', now()
  );
end;
$function$;

revoke all on function public.cleanup_old_data() from public, anon, authenticated;
grant execute on function public.cleanup_old_data() to service_role;
