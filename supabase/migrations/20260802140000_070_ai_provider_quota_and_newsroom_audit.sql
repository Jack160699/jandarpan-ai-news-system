-- 070: multi-provider AI usage/quota observability + Daily Newsroom Audit Report
-- Forward-only; no destructive drops. Idempotency idiom matches 066
-- (create table/index if not exists; do $$ ... if not exists (select 1 from
-- pg_policies ...) then create policy ... end if; end $$; for RLS).

-- ---------------------------------------------------------------------------
-- Multi-provider AI usage log (gemini/groq/cloudflare/openrouter/openai).
-- Column list mirrors src/lib/observability/ai-usage/record.ts's insert()
-- exactly. The legacy openai_usage_events table (041) is left untouched.
-- ---------------------------------------------------------------------------

create table if not exists public.ai_provider_usage_events (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  provider text not null,
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
  quota_consumed integer,
  quota_remaining integer,
  fallback_reason text,
  prompt_hash text,
  prompt_chars integer,
  completion_chars integer,
  metadata jsonb not null default '{}'::jsonb
);

create index if not exists ai_provider_usage_events_created_at_idx
  on public.ai_provider_usage_events (created_at desc);

create index if not exists ai_provider_usage_events_provider_created_idx
  on public.ai_provider_usage_events (provider, created_at desc);

create index if not exists ai_provider_usage_events_model_created_idx
  on public.ai_provider_usage_events (model, created_at desc);

create index if not exists ai_provider_usage_events_article_created_idx
  on public.ai_provider_usage_events (article_id, created_at desc)
  where article_id is not null;

create index if not exists ai_provider_usage_events_operation_created_idx
  on public.ai_provider_usage_events (operation, created_at desc);

-- ---------------------------------------------------------------------------
-- Provider quota snapshots (read-only peeks, see quota.ts::peekQuota)
-- ---------------------------------------------------------------------------

create table if not exists public.provider_quota_snapshots (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  scope text not null check (scope in ('rpm', 'tpm', 'rpd', 'tpd')),
  window_start timestamptz not null,
  quota_limit integer not null,
  quota_used integer not null,
  quota_remaining integer not null,
  created_at timestamptz not null default now()
);

create index if not exists provider_quota_snapshots_provider_scope_created_idx
  on public.provider_quota_snapshots (provider, scope, created_at desc);

-- ---------------------------------------------------------------------------
-- Daily Newsroom Audit Report — one row per IST calendar day
-- ---------------------------------------------------------------------------

create table if not exists public.daily_newsroom_reports (
  id uuid primary key default gen_random_uuid(),
  report_date date not null unique,
  status text not null default 'draft' check (status in ('draft', 'final')),
  generated_at timestamptz not null default now(),
  deterministic_metrics jsonb not null default '{}'::jsonb,
  ai_analysis jsonb,
  ai_provider text,
  ai_model text,
  ai_status text check (ai_status in ('pending', 'completed', 'unavailable', 'failed')),
  build_sha text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists daily_newsroom_reports_report_date_idx
  on public.daily_newsroom_reports (report_date desc);

create table if not exists public.daily_newsroom_report_metrics (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references public.daily_newsroom_reports (id) on delete cascade,
  category text not null,
  metric_key text not null,
  metric_value jsonb not null,
  unit text,
  evidence jsonb default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists daily_newsroom_report_metrics_report_category_idx
  on public.daily_newsroom_report_metrics (report_id, category);

create table if not exists public.daily_newsroom_report_findings (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references public.daily_newsroom_reports (id) on delete cascade,
  severity text not null check (severity in ('informational', 'success', 'warning', 'critical')),
  category text not null,
  title text not null,
  observed_fact text,
  ai_interpretation text,
  evidence jsonb default '{}'::jsonb,
  confidence text check (confidence in ('low', 'medium', 'high')),
  source text not null check (source in ('deterministic', 'ai')),
  created_at timestamptz not null default now()
);

create index if not exists daily_newsroom_report_findings_report_idx
  on public.daily_newsroom_report_findings (report_id, severity);

create table if not exists public.daily_newsroom_report_actions (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references public.daily_newsroom_reports (id) on delete cascade,
  finding_id uuid references public.daily_newsroom_report_findings (id) on delete set null,
  action text not null,
  expected_impact text,
  owner_subsystem text,
  urgency text check (urgency in ('low', 'medium', 'high', 'critical')),
  automation_eligible boolean not null default false,
  status text not null default 'recommended'
    check (status in ('recommended', 'approved', 'automated', 'done', 'rejected')),
  idempotency_key text,
  executed_at timestamptz,
  executed_by text,
  created_at timestamptz not null default now()
);

create index if not exists daily_newsroom_report_actions_report_idx
  on public.daily_newsroom_report_actions (report_id, status);

create unique index if not exists daily_newsroom_report_actions_idempotency_key_uidx
  on public.daily_newsroom_report_actions (idempotency_key)
  where idempotency_key is not null;

create table if not exists public.daily_newsroom_notifications (
  id uuid primary key default gen_random_uuid(),
  report_id uuid references public.daily_newsroom_reports (id) on delete set null,
  incident_key text not null,
  title text not null,
  message text not null,
  severity text not null check (severity in ('informational', 'success', 'warning', 'critical')),
  category text not null,
  evidence jsonb default '{}'::jsonb,
  action_url text,
  owner text,
  created_at timestamptz not null default now(),
  acknowledged_at timestamptz,
  acknowledged_by text,
  resolved_at timestamptz,
  resolution_note text
);

create index if not exists daily_newsroom_notifications_created_idx
  on public.daily_newsroom_notifications (created_at desc);

-- One open (unresolved) notification per incident key at a time — re-firing
-- the same incident updates/acks the existing row instead of duplicating.
create unique index if not exists daily_newsroom_notifications_open_incident_uidx
  on public.daily_newsroom_notifications (incident_key)
  where resolved_at is null;

create table if not exists public.content_quality_samples (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references public.daily_newsroom_reports (id) on delete cascade,
  article_id text,
  sample_type text not null,
  score numeric,
  details jsonb default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists content_quality_samples_report_idx
  on public.content_quality_samples (report_id);

-- ---------------------------------------------------------------------------
-- Cloudflare BGE-M3 embeddings mirror of intelligence_embeddings (028).
-- NOTE: 1024 dims per Cloudflare BGE-M3 (@cf/baai/bge-m3). The parallel
-- embeddings workstream's CLOUDFLARE_EMBEDDING_DIMENSIONS constant
-- (src/lib/ai/providers/cloudflare-embeddings.ts) did not exist yet at the
-- time this migration was written — cross-check that constant against 1024
-- before relying on this table for production similarity search.
-- ---------------------------------------------------------------------------

create extension if not exists vector;

create table if not exists public.intelligence_embeddings_cf (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references public.newsroom_tenants (id) on delete cascade,
  entity_type text not null check (entity_type in ('signal', 'article', 'event')),
  entity_id uuid not null,
  content_hash text not null,
  model text not null default 'cloudflare-bge-m3',
  embedding vector(1024),
  embedding_json jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (entity_type, entity_id)
);

create index if not exists idx_intelligence_embeddings_cf_tenant
  on public.intelligence_embeddings_cf (tenant_id, entity_type);

create index if not exists idx_intelligence_embeddings_cf_hash
  on public.intelligence_embeddings_cf (content_hash);

create index if not exists idx_intelligence_embeddings_cf_vector
  on public.intelligence_embeddings_cf
  using ivfflat (embedding vector_cosine_ops)
  with (lists = 50);

create or replace function public.match_intelligence_embeddings_cf(
  query_embedding vector(1024),
  match_count int default 10,
  filter_entity_type text default null,
  filter_tenant_id uuid default null
)
returns table (
  entity_type text,
  entity_id uuid,
  similarity float,
  metadata jsonb
)
language sql
stable
set search_path = public, pg_temp
as $$
  select
    e.entity_type,
    e.entity_id,
    1 - (e.embedding <=> query_embedding) as similarity,
    e.metadata
  from public.intelligence_embeddings_cf e
  where e.embedding is not null
    and (filter_entity_type is null or e.entity_type = filter_entity_type)
    and (filter_tenant_id is null or e.tenant_id = filter_tenant_id)
  order by e.embedding <=> query_embedding
  limit match_count;
$$;

comment on table public.intelligence_embeddings_cf is
  'Cloudflare BGE-M3 (1024-dim) embeddings mirror of intelligence_embeddings; verify dim against cloudflare-embeddings.ts once that workstream lands.';

-- ---------------------------------------------------------------------------
-- Additive column: fact pack populated by a separate workstream
-- ---------------------------------------------------------------------------

alter table public.news_events add column if not exists fact_pack jsonb;

-- ---------------------------------------------------------------------------
-- RLS — service_role only (no client-side RLS), matching 066's idiom
-- ---------------------------------------------------------------------------

alter table public.ai_provider_usage_events enable row level security;
alter table public.provider_quota_snapshots enable row level security;
alter table public.daily_newsroom_reports enable row level security;
alter table public.daily_newsroom_report_metrics enable row level security;
alter table public.daily_newsroom_report_findings enable row level security;
alter table public.daily_newsroom_report_actions enable row level security;
alter table public.daily_newsroom_notifications enable row level security;
alter table public.content_quality_samples enable row level security;
alter table public.intelligence_embeddings_cf enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'ai_provider_usage_events'
      and policyname = 'Service role ai provider usage events'
  ) then
    create policy "Service role ai provider usage events"
      on public.ai_provider_usage_events
      for all
      to service_role
      using (true)
      with check (true);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'provider_quota_snapshots'
      and policyname = 'Service role provider quota snapshots'
  ) then
    create policy "Service role provider quota snapshots"
      on public.provider_quota_snapshots
      for all
      to service_role
      using (true)
      with check (true);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'daily_newsroom_reports'
      and policyname = 'Service role daily newsroom reports'
  ) then
    create policy "Service role daily newsroom reports"
      on public.daily_newsroom_reports
      for all
      to service_role
      using (true)
      with check (true);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'daily_newsroom_report_metrics'
      and policyname = 'Service role daily newsroom report metrics'
  ) then
    create policy "Service role daily newsroom report metrics"
      on public.daily_newsroom_report_metrics
      for all
      to service_role
      using (true)
      with check (true);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'daily_newsroom_report_findings'
      and policyname = 'Service role daily newsroom report findings'
  ) then
    create policy "Service role daily newsroom report findings"
      on public.daily_newsroom_report_findings
      for all
      to service_role
      using (true)
      with check (true);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'daily_newsroom_report_actions'
      and policyname = 'Service role daily newsroom report actions'
  ) then
    create policy "Service role daily newsroom report actions"
      on public.daily_newsroom_report_actions
      for all
      to service_role
      using (true)
      with check (true);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'daily_newsroom_notifications'
      and policyname = 'Service role daily newsroom notifications'
  ) then
    create policy "Service role daily newsroom notifications"
      on public.daily_newsroom_notifications
      for all
      to service_role
      using (true)
      with check (true);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'content_quality_samples'
      and policyname = 'Service role content quality samples'
  ) then
    create policy "Service role content quality samples"
      on public.content_quality_samples
      for all
      to service_role
      using (true)
      with check (true);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'intelligence_embeddings_cf'
      and policyname = 'Service role intelligence embeddings cf'
  ) then
    create policy "Service role intelligence embeddings cf"
      on public.intelligence_embeddings_cf
      for all
      to service_role
      using (true)
      with check (true);
  end if;
end $$;

comment on table public.ai_provider_usage_events is
  'Multi-provider AI usage log (gemini/groq/cloudflare/openrouter/openai); see src/lib/observability/ai-usage/record.ts.';
comment on table public.provider_quota_snapshots is
  'Hourly read-only peeks of free-tier provider quota state (rpm/tpm/rpd/tpd).';
comment on table public.daily_newsroom_reports is
  'Daily Newsroom Audit Report: one row per IST calendar day, deterministic metrics + AI executive summary.';
comment on table public.daily_newsroom_report_metrics is
  'Normalized per-metric rows for a daily_newsroom_reports row.';
comment on table public.daily_newsroom_report_findings is
  'Deterministic and AI-sourced findings for a daily_newsroom_reports row.';
comment on table public.daily_newsroom_report_actions is
  'Recommended/automated remediation actions tied to a report or finding.';
comment on table public.daily_newsroom_notifications is
  'Deduped operator-facing notifications raised from warning/critical findings.';
comment on table public.content_quality_samples is
  'Per-article content quality samples collected for a daily report.';
