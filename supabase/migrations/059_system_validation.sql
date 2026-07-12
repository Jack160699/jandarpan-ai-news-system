-- Phase 15 — System Validation, Health & Release Manager

create table if not exists public.system_validation_runs (
  id uuid primary key default gen_random_uuid(),
  run_type text not null default 'full'
    check (run_type in ('full', 'quick', 'pre_deploy')),
  status text not null default 'running'
    check (status in ('running', 'completed', 'failed', 'partial')),
  overall_score numeric not null default 0,
  overall_grade text not null default 'F'
    check (overall_grade in ('A', 'B', 'C', 'D', 'F')),
  health_scores jsonb not null default '{}'::jsonb,
  summary jsonb not null default '{}'::jsonb,
  production_ready boolean not null default false,
  triggered_by text,
  duration_ms integer,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create index if not exists system_validation_runs_created_idx
  on public.system_validation_runs (created_at desc);

create table if not exists public.system_validation_results (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references public.system_validation_runs (id) on delete cascade,
  module_id text not null,
  category text not null,
  status text not null
    check (status in ('pass', 'warn', 'fail', 'skip')),
  message text,
  details jsonb not null default '{}'::jsonb,
  latency_ms integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists system_validation_results_run_idx
  on public.system_validation_results (run_id, category, module_id);

create table if not exists public.system_recovery_actions (
  id uuid primary key default gen_random_uuid(),
  run_id uuid references public.system_validation_runs (id) on delete set null,
  action_type text not null
    check (action_type in (
      'retry_cron',
      'clear_cache',
      'regenerate_sitemap',
      'reload_schema',
      'revalidate_paths',
      'log_only'
    )),
  target text,
  status text not null default 'attempted'
    check (status in ('attempted', 'succeeded', 'failed', 'skipped')),
  message text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists system_recovery_actions_run_idx
  on public.system_recovery_actions (run_id, created_at desc);

alter table public.system_validation_runs enable row level security;
alter table public.system_validation_results enable row level security;
alter table public.system_recovery_actions enable row level security;

create policy "system_validation_runs_service_role"
  on public.system_validation_runs for all
  using (auth.role() = 'service_role') with check (auth.role() = 'service_role');

create policy "system_validation_results_service_role"
  on public.system_validation_results for all
  using (auth.role() = 'service_role') with check (auth.role() = 'service_role');

create policy "system_recovery_actions_service_role"
  on public.system_recovery_actions for all
  using (auth.role() = 'service_role') with check (auth.role() = 'service_role');

comment on table public.system_validation_runs is 'Phase 15 validation run history';
comment on table public.system_validation_results is 'Per-module validation results';
comment on table public.system_recovery_actions is 'Self-healing recovery action log';
