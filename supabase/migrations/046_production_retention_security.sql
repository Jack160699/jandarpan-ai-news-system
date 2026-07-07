-- 046: Automated data retention, RPC hardening, and RLS policy consolidation
-- Safe to re-run. Does not repeat prior manual cleanup — only enforces ongoing retention.

-- ═══════════════════════════════════════════════════════════════════════════════
-- 1. Enhanced retention RPC (service_role only)
-- ═══════════════════════════════════════════════════════════════════════════════

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

  -- Events with no published article and no recent activity
  delete from public.news_events e
  where e.updated_at < now() - interval '14 days'
    and not exists (
      select 1
      from public.generated_articles g
      where g.event_id = e.id
        and g.published_at is not null
    );
  get diagnostics v_stale_events = row_count;

  -- Soft-archive old published stories (reader still has /archive routes)
  update public.generated_articles
  set
    workflow_status = 'archived',
    editorial_status = coalesce(editorial_status, 'archived')
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

comment on function public.cleanup_old_data() is
  'Production retention — prune pipeline tables and soft-archive old published articles.';

revoke all on function public.cleanup_old_data() from public;
revoke all on function public.cleanup_old_data() from anon;
revoke all on function public.cleanup_old_data() from authenticated;
grant execute on function public.cleanup_old_data() to service_role;

-- Lock down other privileged RPCs from anonymous/public execution
revoke all on function public.claim_editorial_image_batch(integer) from public, anon, authenticated;
grant execute on function public.claim_editorial_image_batch(integer) to service_role;

revoke all on function public.get_schema_health() from public, anon, authenticated;
grant execute on function public.get_schema_health() to service_role;

revoke all on function public.reload_postgrest_schema() from public, anon, authenticated;
grant execute on function public.reload_postgrest_schema() to service_role;

-- Security helpers: authenticated + service_role only (not anon)
revoke all on function public.security_is_super_admin(uuid) from public, anon;
revoke all on function public.security_user_has_tenant(uuid) from public, anon;
revoke all on function public.security_user_tenant_ids() from public, anon;
grant execute on function public.security_is_super_admin(uuid) to authenticated, service_role;
grant execute on function public.security_user_has_tenant(uuid) to authenticated, service_role;
grant execute on function public.security_user_tenant_ids() to authenticated, service_role;

-- ═══════════════════════════════════════════════════════════════════════════════
-- 2. RLS: explicit deny-by-default policies for internal tables
-- ═══════════════════════════════════════════════════════════════════════════════

drop policy if exists "Deny anon ai queue" on public.news_ai_queue;
create policy "Deny anon ai queue"
  on public.news_ai_queue
  as restrictive
  for all
  to anon
  using (false)
  with check (false);

drop policy if exists "Deny authenticated ai queue" on public.news_ai_queue;
create policy "Deny authenticated ai queue"
  on public.news_ai_queue
  as restrictive
  for all
  to authenticated
  using (false)
  with check (false);

drop policy if exists "Deny anon tenants" on public.tenants;
create policy "Deny anon tenants"
  on public.tenants
  as restrictive
  for all
  to anon
  using (false)
  with check (false);

drop policy if exists "Deny authenticated tenants" on public.tenants;
create policy "Deny authenticated tenants"
  on public.tenants
  as restrictive
  for all
  to authenticated
  using (false)
  with check (false);

drop policy if exists "Service role tenants" on public.tenants;
create policy "Service role tenants"
  on public.tenants
  for all
  to service_role
  using (true)
  with check (true);

-- ═══════════════════════════════════════════════════════════════════════════════
-- 3. Consolidate duplicate platform read policies (performance)
-- ═══════════════════════════════════════════════════════════════════════════════

drop policy if exists "Public read platform articles" on public.platform_articles;
drop policy if exists "Public read platform breaking news" on public.platform_breaking_news;
drop policy if exists "Public read platform districts" on public.platform_districts;
drop policy if exists "Public read platform topics" on public.platform_topics;

-- ═══════════════════════════════════════════════════════════════════════════════
-- 4. Retention + homepage query indexes
-- ═══════════════════════════════════════════════════════════════════════════════

create index if not exists idx_generated_articles_archive_candidate
  on public.generated_articles (published_at)
  where published_at is not null
    and coalesce(workflow_status, 'published') = 'published'
    and coalesce(homepage_pin, false) = false;

create index if not exists idx_intelligence_snapshots_built_at
  on public.intelligence_snapshots (built_at desc);

create index if not exists idx_worker_jobs_retention
  on public.worker_jobs (status, completed_at)
  where status in ('completed', 'failed', 'dead');

create index if not exists idx_news_signals_retention
  on public.news_signals (created_at)
  where created_at is not null;

-- Fix search_path on flagged functions
alter function public.match_intelligence_embeddings(vector, integer, text, uuid)
  set search_path = public;

alter function public.set_tenant_memberships_updated_at()
  set search_path = public;

alter function public.claim_editorial_image_batch(integer)
  set search_path = public;
