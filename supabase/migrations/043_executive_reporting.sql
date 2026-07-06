-- Executive CFO reporting — additive tables only

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

create policy "executive_reports_service_role"
  on public.executive_report_snapshots
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

create policy "executive_alerts_service_role"
  on public.executive_alert_events
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');
