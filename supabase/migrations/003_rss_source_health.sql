-- RSS source health tracking (skip dead feeds across cron runs)

create table if not exists public.rss_source_health (
  source_id text primary key,
  name text not null,
  last_success timestamptz,
  last_failure timestamptz,
  failure_count int not null default 0,
  consecutive_failures int not null default 0,
  disabled_until timestamptz,
  updated_at timestamptz not null default now()
);

create index if not exists rss_source_health_disabled_idx
  on public.rss_source_health (disabled_until);

alter table public.rss_source_health enable row level security;

create policy "Service role rss health"
  on public.rss_source_health
  for all
  to service_role
  using (true)
  with check (true);
