-- 050: Forward repair — recreate observability tables missing despite 041–043 history.
-- Idempotent. Does NOT modify schema_migrations or drop existing objects.
-- See engineering-audit/04-migration-reconciliation.md

-- ─── 041 openai_usage_observability (repair) ───

create table if not exists public.openai_usage_events (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  worker text,
  operation text not null,
  cron_job text,
  article_id text,
  event_id text,
  tenant_id text,
  model text not null,
  endpoint text not null,
  input_tokens integer not null default 0,
  output_tokens integer not null default 0,
  cached_tokens integer not null default 0,
  estimated_cost_usd numeric(14, 8) not null default 0,
  latency_ms integer,
  retry_count integer not null default 0,
  success boolean not null default true,
  prompt_hash text,
  prompt_chars integer,
  completion_chars integer,
  metadata jsonb not null default '{}'::jsonb
);

create index if not exists openai_usage_events_created_at_idx
  on public.openai_usage_events (created_at desc);

create index if not exists openai_usage_events_worker_created_idx
  on public.openai_usage_events (worker, created_at desc);

create index if not exists openai_usage_events_model_created_idx
  on public.openai_usage_events (model, created_at desc);

create index if not exists openai_usage_events_article_created_idx
  on public.openai_usage_events (article_id, created_at desc)
  where article_id is not null;

create index if not exists openai_usage_events_operation_created_idx
  on public.openai_usage_events (operation, created_at desc);

create index if not exists openai_usage_events_prompt_hash_idx
  on public.openai_usage_events (prompt_hash, created_at desc)
  where prompt_hash is not null;

alter table public.openai_usage_events enable row level security;

drop policy if exists "openai_usage_service_role" on public.openai_usage_events;
create policy "openai_usage_service_role"
  on public.openai_usage_events
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

-- ─── 042 openai_prompt_cache (repair) ───

create table if not exists public.openai_prompt_cache (
  id uuid primary key default gen_random_uuid(),
  prompt_hash text not null,
  operation text not null,
  worker text not null,
  cache_version text not null default '1',
  article_id text,
  event_id text,
  model text not null,
  result_json jsonb not null,
  input_tokens integer not null default 0,
  output_tokens integer not null default 0,
  estimated_cost_usd numeric(14, 8) not null default 0,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '7 days')
);

create unique index if not exists openai_prompt_cache_lookup_idx
  on public.openai_prompt_cache (prompt_hash, operation, worker, cache_version, article_id, event_id) nulls not distinct;

create index if not exists openai_prompt_cache_expires_idx
  on public.openai_prompt_cache (expires_at);

alter table public.openai_prompt_cache enable row level security;

drop policy if exists "openai_prompt_cache_service_role" on public.openai_prompt_cache;
create policy "openai_prompt_cache_service_role"
  on public.openai_prompt_cache
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

-- ─── 043 executive_reporting (repair) ───

create table if not exists public.executive_report_snapshots (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  period text not null check (period in ('daily', 'weekly', 'monthly', 'quarterly')),
  format text not null check (format in ('pdf', 'csv', 'json')),
  exchange_rate numeric(10, 4),
  payload jsonb not null default '{}'::jsonb
);

create index if not exists executive_report_snapshots_created_at_idx
  on public.executive_report_snapshots (created_at desc);

create table if not exists public.executive_alert_events (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  alert_type text not null,
  severity text not null check (severity in ('critical', 'warning', 'info')),
  message text not null,
  payload jsonb not null default '{}'::jsonb,
  acknowledged_at timestamptz,
  notified_email boolean not null default false
);

create index if not exists executive_alert_events_created_at_idx
  on public.executive_alert_events (created_at desc);

create index if not exists executive_alert_events_type_idx
  on public.executive_alert_events (alert_type, created_at desc);

alter table public.executive_report_snapshots enable row level security;
alter table public.executive_alert_events enable row level security;

drop policy if exists "executive_reports_service_role" on public.executive_report_snapshots;
create policy "executive_reports_service_role"
  on public.executive_report_snapshots
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

drop policy if exists "executive_alerts_service_role" on public.executive_alert_events;
create policy "executive_alerts_service_role"
  on public.executive_alert_events
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

-- Reconciliation marker (schema_registry from 034)
insert into public.schema_registry (key, value, updated_at)
values (
  'migration_reconciliation_observability',
  '050_repair_observability_schema',
  now()
)
on conflict (key) do update
  set value = excluded.value,
      updated_at = excluded.updated_at;
