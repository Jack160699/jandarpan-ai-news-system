-- Step 3: per-source ingestion cursor / health state (tenant-safe)
-- Forward-only; no destructive drops.

create table if not exists public.ingestion_source_state (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid null,
  source_key text not null,
  provider_family text not null,
  enabled boolean not null default true,
  health_state text not null default 'unknown',
  parser_type text null,
  last_attempted_at timestamptz null,
  last_successful_at timestamptz null,
  last_new_item_at timestamptz null,
  last_item_timestamp timestamptz null,
  cursor_token text null,
  etag text null,
  last_modified text null,
  consecutive_failures integer not null default 0,
  consecutive_empty_runs integer not null default 0,
  disabled_until timestamptz null,
  quota_exhausted_until timestamptz null,
  rate_limited_until timestamptz null,
  retirement_reason text null,
  last_error_category text null,
  lease_owner text null,
  lease_expires_at timestamptz null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ingestion_source_state_health_chk check (
    health_state in (
      'healthy',
      'warning',
      'quota_exhausted',
      'rate_limited',
      'temporarily_disabled',
      'parser_broken',
      'permanently_retired',
      'unknown'
    )
  )
);

create unique index if not exists ingestion_source_state_tenant_key_uidx
  on public.ingestion_source_state (tenant_id, source_key)
  where tenant_id is not null;

create unique index if not exists ingestion_source_state_global_key_uidx
  on public.ingestion_source_state (source_key)
  where tenant_id is null;

create index if not exists ingestion_source_state_family_idx
  on public.ingestion_source_state (provider_family, health_state);

create index if not exists ingestion_source_state_quota_idx
  on public.ingestion_source_state (quota_exhausted_until)
  where quota_exhausted_until is not null;

create index if not exists ingestion_source_state_disabled_idx
  on public.ingestion_source_state (disabled_until)
  where disabled_until is not null;

alter table public.ingestion_source_state enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'ingestion_source_state'
      and policyname = 'Service role ingestion source state'
  ) then
    create policy "Service role ingestion source state"
      on public.ingestion_source_state
      for all
      to service_role
      using (true)
      with check (true);
  end if;
end $$;

comment on table public.ingestion_source_state is
  'Step 3 incremental ingestion cursors and per-source health (tenant-scoped).';
