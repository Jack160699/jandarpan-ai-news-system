-- Enterprise analytics: scheduled report delivery

create table if not exists public.analytics_report_schedules (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.newsroom_tenants(id) on delete cascade,
  created_by uuid references auth.users(id) on delete set null,
  name text not null,
  frequency text not null check (frequency in ('daily', 'weekly', 'monthly')),
  format text not null default 'csv' check (format in ('csv', 'json')),
  window_hours int not null default 168,
  email text,
  enabled boolean not null default true,
  last_run_at timestamptz,
  next_run_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_analytics_schedules_tenant
  on public.analytics_report_schedules (tenant_id, enabled);

alter table public.analytics_report_schedules enable row level security;

drop policy if exists "Service role analytics schedules" on public.analytics_report_schedules;
create policy "Service role analytics schedules"
  on public.analytics_report_schedules for all to service_role using (true) with check (true);

comment on table public.analytics_report_schedules is
  'Scheduled enterprise analytics exports for newsroom admins';
