-- Phase 14 — Autonomous SEO Optimization Engine

create table if not exists public.seo_actions (
  id uuid primary key default gen_random_uuid(),
  external_key text not null,
  action_type text not null,
  article_id uuid not null,
  article_slug text not null,
  field_key text not null,
  current_value text,
  suggested_value text not null,
  reason text not null,
  confidence numeric not null default 0.5,
  expected_impact text not null default '',
  rollback_strategy text not null default 'snapshot_restore',
  status text not null default 'pending'
    check (status in ('pending', 'executing', 'succeeded', 'failed', 'rolled_back', 'skipped')),
  policy_status text not null default 'allowed'
    check (policy_status in ('allowed', 'rejected')),
  execution_history_id uuid,
  retries integer not null default 0,
  error_message text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  executed_at timestamptz
);

create unique index if not exists seo_actions_external_key
  on public.seo_actions (external_key);

create index if not exists seo_actions_status_idx
  on public.seo_actions (status, created_at desc);

create index if not exists seo_actions_article_idx
  on public.seo_actions (article_id, created_at desc);

create table if not exists public.seo_action_results (
  id uuid primary key default gen_random_uuid(),
  action_id uuid not null references public.seo_actions (id) on delete cascade,
  metric_type text not null
    check (metric_type in ('ctr', 'impressions', 'ranking', 'position', 'internal_links', 'schema_coverage')),
  baseline_value numeric,
  current_value numeric,
  delta numeric,
  measured_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists seo_action_results_action_idx
  on public.seo_action_results (action_id, measured_at desc);

create table if not exists public.seo_learning (
  id uuid primary key default gen_random_uuid(),
  action_type text not null,
  field_key text not null,
  source text not null default 'autonomous',
  outcome_score numeric not null default 0,
  sample_count integer not null default 0,
  avg_confidence numeric not null default 0.5,
  metadata jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create unique index if not exists seo_learning_type_field_source
  on public.seo_learning (action_type, field_key, source);

create table if not exists public.seo_policy_log (
  id uuid primary key default gen_random_uuid(),
  action_id uuid references public.seo_actions (id) on delete set null,
  field_key text not null,
  decision text not null check (decision in ('allowed', 'rejected')),
  reason text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists seo_policy_log_created_idx
  on public.seo_policy_log (created_at desc);

alter table public.seo_actions enable row level security;
alter table public.seo_action_results enable row level security;
alter table public.seo_learning enable row level security;
alter table public.seo_policy_log enable row level security;

create policy "seo_actions_service_role"
  on public.seo_actions for all
  using (auth.role() = 'service_role') with check (auth.role() = 'service_role');

create policy "seo_action_results_service_role"
  on public.seo_action_results for all
  using (auth.role() = 'service_role') with check (auth.role() = 'service_role');

create policy "seo_learning_service_role"
  on public.seo_learning for all
  using (auth.role() = 'service_role') with check (auth.role() = 'service_role');

create policy "seo_policy_log_service_role"
  on public.seo_policy_log for all
  using (auth.role() = 'service_role') with check (auth.role() = 'service_role');

comment on table public.seo_actions is 'Autonomous SEO actions (Phase 14)';
comment on table public.seo_action_results is 'Post-deployment measurement for autonomous actions';
comment on table public.seo_learning is 'Confidence learning from action outcomes';
comment on table public.seo_policy_log is 'Policy engine audit trail';
