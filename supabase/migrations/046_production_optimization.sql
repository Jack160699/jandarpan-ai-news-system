-- Production optimization: indexes, retention RPCs, duplicate index cleanup

-- ---------------------------------------------------------------------------
-- Query performance indexes
-- ---------------------------------------------------------------------------

create index if not exists idx_news_signals_tenant_created
  on public.news_signals (tenant_id, created_at desc);

create index if not exists idx_generated_articles_public_pool
  on public.generated_articles (published_at desc nulls last)
  where published_at is not null
    and editorial_status in ('approved', 'published', 'live')
    and coalesce(workflow_status, 'published') <> 'archived';

create index if not exists idx_event_bus_delivered_cleanup
  on public.event_bus_messages (created_at)
  where status in ('delivered', 'failed');

create index if not exists idx_worker_job_runs_created
  on public.worker_job_runs (created_at);

-- Remove duplicate unique index (039 supersedes 006 name)
drop index if exists public.news_ai_queue_article_id_unique;

-- ---------------------------------------------------------------------------
-- Retention helpers (service_role only)
-- ---------------------------------------------------------------------------

create or replace function public.purge_stale_news_signals(
  retention_days int default 30,
  batch_limit int default 500
)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  deleted_count int;
begin
  with stale as (
    select ns.id
    from public.news_signals ns
    where ns.created_at < now() - make_interval(days => retention_days)
      and not exists (
        select 1
        from public.news_events ne
        where ns.id = any (ne.signal_ids)
      )
    order by ns.created_at asc
    limit batch_limit
  )
  delete from public.news_signals ns
  using stale
  where ns.id = stale.id;

  get diagnostics deleted_count = row_count;
  return deleted_count;
end;
$$;

create or replace function public.trim_source_reputation_history(
  max_entries int default 24
)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  updated_count int := 0;
  r record;
begin
  for r in
    select id, history
    from public.source_reputation_memory
    where jsonb_array_length(coalesce(history, '[]'::jsonb)) > max_entries
  loop
    update public.source_reputation_memory
    set
      history = coalesce(
        (
          select jsonb_agg(elem order by ord)
          from (
            select elem, ord
            from jsonb_array_elements(r.history) with ordinality as t(elem, ord)
            order by ord
            limit max_entries
          ) sub
        ),
        '[]'::jsonb
      ),
      updated_at = now()
    where id = r.id;
    updated_count := updated_count + 1;
  end loop;
  return updated_count;
end;
$$;

revoke all on function public.purge_stale_news_signals(int, int) from public;
revoke all on function public.trim_source_reputation_history(int) from public;
grant execute on function public.purge_stale_news_signals(int, int) to service_role;
grant execute on function public.trim_source_reputation_history(int) to service_role;
