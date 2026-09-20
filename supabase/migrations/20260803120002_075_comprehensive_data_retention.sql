-- Migration: 075_comprehensive_data_retention
-- Description: Implement tiered data retention policy to aggressively clean operational data and archive low-value historical articles.

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
  v_deleted_vectors int := 0;
  v_deleted_vectors_cf int := 0;
  v_archived_events int := 0;
  v_transient_articles_deleted int := 0;
  v_signals_days int := coalesce(nullif(current_setting('app.retention_signals_days', true), '')::int, 7);
  v_snapshots_days int := coalesce(nullif(current_setting('app.retention_snapshots_days', true), '')::int, 30);
  v_article_archive_days int := coalesce(nullif(current_setting('app.retention_article_archive_days', true), '')::int, 90);
  v_raw_news_articles int := 0;
  v_competitor_articles int := 0;
  v_openai_usage int := 0;
  v_ai_provider_usage int := 0;
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

  -- Transient articles sweeper:
  -- 120 days old, not a homepage pin, and not evergreen/high_priority/manual_keep
  create temp table if not exists transient_articles_to_delete (id uuid, event_id uuid) on commit drop;
  
  insert into transient_articles_to_delete (id, event_id)
  select id, event_id from public.generated_articles
  where published_at < now() - interval '120 days'
    and coalesce(homepage_pin, false) = false
    and not (tags && array['evergreen', 'high_priority', 'manual_keep']);

  -- Delete associated vectors
  delete from public.intelligence_embeddings 
  where entity_type = 'article' 
    and entity_id in (select id from transient_articles_to_delete);
  get diagnostics v_deleted_vectors = row_count;

  if to_regclass('public.intelligence_embeddings_cf') is not null then
    execute 'delete from public.intelligence_embeddings_cf where entity_type = ''article'' and entity_id in (select id from transient_articles_to_delete)';
    get diagnostics v_deleted_vectors_cf = row_count;
  end if;

  -- Preserve news_events but mark them archived if they belong to these articles
  update public.news_events
  set coverage_status = 'archived'
  where id in (select event_id from transient_articles_to_delete where event_id is not null)
    and coalesce(coverage_status, '') != 'archived';
  get diagnostics v_archived_events = row_count;

  -- Delete the articles
  delete from public.generated_articles
  where id in (select id from transient_articles_to_delete);
  get diagnostics v_transient_articles_deleted = row_count;


  -- Original stale events cleanup (kept for events that never resulted in a published article)
  delete from public.news_events e
  where e.updated_at < now() - interval '14 days'
    and not exists (
      select 1
      from public.generated_articles g
      where g.event_id = e.id
        and g.published_at is not null
    )
    and coalesce(coverage_status, '') != 'archived';
  get diagnostics v_stale_events = row_count;

  -- Archive published articles older than 90 days that weren't deleted by the 120-day sweep
  update public.generated_articles
  set
    workflow_status = 'archived',
    editorial_status = 'archived'
  where published_at is not null
    and published_at < now() - make_interval(days => v_article_archive_days)
    and coalesce(workflow_status, 'published') = 'published'
    and coalesce(homepage_pin, false) = false;
  get diagnostics v_archived_articles = row_count;


  -- New targets to drop DB size below 500 MB
  delete from public.news_articles
  where created_at < now() - interval '14 days';
  get diagnostics v_raw_news_articles = row_count;

  delete from public.competitor_articles
  where created_at < now() - interval '7 days';
  get diagnostics v_competitor_articles = row_count;

  delete from public.openai_usage_events
  where created_at < now() - interval '30 days';
  get diagnostics v_openai_usage = row_count;
  
  if to_regclass('public.ai_provider_usage_events') is not null then
    execute 'delete from public.ai_provider_usage_events where created_at < now() - interval ''30 days''';
    get diagnostics v_ai_provider_usage = row_count;
  end if;

  return jsonb_build_object(
    'news_articles_deleted', v_raw_news_articles,
    'competitor_articles_deleted', v_competitor_articles,
    'openai_usage_deleted', v_openai_usage,
    'ai_provider_usage_deleted', v_ai_provider_usage,
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
    'transient_articles_deleted', v_transient_articles_deleted,
    'vectors_deleted', v_deleted_vectors,
    'vectors_cf_deleted', v_deleted_vectors_cf,
    'news_events_archived', v_archived_events,
    'archived_generated_articles', v_archived_articles,
    'ran_at', now()
  );
end;
$function$;

revoke all on function public.cleanup_old_data() from public, anon, authenticated;
grant execute on function public.cleanup_old_data() to service_role;
