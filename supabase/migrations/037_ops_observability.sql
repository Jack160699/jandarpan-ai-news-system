-- Jan Darpan OS — ops observability tables (error tracking, cron runs)

create table if not exists public.ops_error_events (
  id text primary key,
  severity text not null check (severity in ('low', 'medium', 'high', 'critical')),
  source text not null,
  message text not null,
  request_id text,
  route text,
  worker text,
  metadata jsonb default '{}'::jsonb,
  resolved boolean default false,
  created_at timestamptz not null default now()
);

create index if not exists ops_error_events_created_at_idx
  on public.ops_error_events (created_at desc);

create index if not exists ops_error_events_severity_idx
  on public.ops_error_events (severity, created_at desc);

create table if not exists public.ops_cron_runs (
  id uuid primary key default gen_random_uuid(),
  job text not null,
  ok boolean not null default false,
  duration_ms integer,
  degraded boolean default false,
  workers jsonb default '[]'::jsonb,
  error text,
  created_at timestamptz not null default now()
);

create index if not exists ops_cron_runs_job_created_idx
  on public.ops_cron_runs (job, created_at desc);

alter table public.ops_error_events enable row level security;
alter table public.ops_cron_runs enable row level security;

-- Service role only (admin APIs use service role)
create policy "ops_errors_service_role"
  on public.ops_error_events
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

create policy "ops_cron_service_role"
  on public.ops_cron_runs
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');
