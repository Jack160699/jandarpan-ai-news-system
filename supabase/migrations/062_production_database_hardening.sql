-- Phase 23C — Production database hardening (additive, idempotent)
-- See engineering-audit/04-migration-reconciliation.md for 033/038/050 history.

-- ---------------------------------------------------------------------------
-- 1. generated_articles — one editorial article per clustered event
-- ---------------------------------------------------------------------------

-- Preserve all rows: duplicate event links are nulled (not deleted).
with ranked as (
  select
    id,
    event_id,
    row_number() over (
      partition by event_id
      order by
        (published_at is not null) desc,
        published_at desc nulls last,
        created_at asc
    ) as rn
  from public.generated_articles
  where event_id is not null
)
update public.generated_articles as g
set event_id = null
from ranked as r
where g.id = r.id
  and r.rn > 1;

drop index if exists public.generated_articles_event_id_unique;

create unique index if not exists generated_articles_event_id_unique
  on public.generated_articles (event_id)
  where event_id is not null;

comment on index public.generated_articles_event_id_unique is
  'Ensures at most one generated article per news event. Historical duplicates are unlinked via event_id = null.';

-- ---------------------------------------------------------------------------
-- 2. coverage_updates — public read only for live events (matches live pages)
-- ---------------------------------------------------------------------------

drop policy if exists "Public read coverage_updates" on public.coverage_updates;

create policy "Public read coverage_updates for live events"
  on public.coverage_updates
  for select
  to anon, authenticated
  using (
    exists (
      select 1
      from public.news_events as e
      where e.id = coverage_updates.event_id
        and e.is_live = true
    )
  );

-- ---------------------------------------------------------------------------
-- 3. Queue / worker indexes for production query paths
-- ---------------------------------------------------------------------------

create index if not exists idx_worker_jobs_type_status_created
  on public.worker_jobs (job_type, status, created_at desc);

-- ---------------------------------------------------------------------------
-- 4. event_bus_messages — stale processing reclaim (DB safety; optional worker use)
-- ---------------------------------------------------------------------------

alter table public.event_bus_messages
  add column if not exists processing_started_at timestamptz;

create index if not exists idx_event_bus_processing_stale
  on public.event_bus_messages (processing_started_at asc)
  where status = 'processing';

create or replace function public.reclaim_stale_event_bus_messages(
  stale_minutes int default 15
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  reclaimed integer;
  threshold interval;
begin
  threshold := make_interval(mins => greatest(stale_minutes, 1));

  update public.event_bus_messages
  set
    status = 'pending',
    processing_started_at = null,
    attempts = attempts + 1,
    last_error = coalesce(last_error, 'stale_processing_reclaimed')
  where status = 'processing'
    and attempts < max_attempts
    and (
      (processing_started_at is not null and processing_started_at < now() - threshold)
      or (processing_started_at is null and created_at < now() - threshold)
    );

  get diagnostics reclaimed = row_count;
  return reclaimed;
end;
$$;

comment on function public.reclaim_stale_event_bus_messages(integer) is
  'Reclaims event bus messages stuck in processing. Service-role only.';

revoke all on function public.reclaim_stale_event_bus_messages(integer)
  from public, anon, authenticated;

grant execute on function public.reclaim_stale_event_bus_messages(integer)
  to service_role;

-- ---------------------------------------------------------------------------
-- 5. Migration reconciliation marker
-- ---------------------------------------------------------------------------

insert into public.schema_registry (key, value, updated_at)
values (
  'migration_reconciliation_phase_23c',
  jsonb_build_object(
    'migration', '062_production_database_hardening',
    'fresh_install_order', '033_enterprise_security then 038_platform_admin_production',
    'repair_migrations', jsonb_build_array('050_repair_observability_schema', '061_serp_quota_rls'),
    'event_id_unique', true,
    'applied_at', now()
  )::text,
  now()
)
on conflict (key) do update
  set value = excluded.value,
      updated_at = excluded.updated_at;
