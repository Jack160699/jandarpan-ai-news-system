-- API provider health (GNews, NewsData) — retries, scoring, auto-disable

create table if not exists public.api_provider_health (
  provider_id text primary key,
  last_success timestamptz,
  last_failure timestamptz,
  failure_count int not null default 0,
  consecutive_failures int not null default 0,
  disabled_until timestamptz,
  health_score int not null default 100,
  avg_latency_ms int not null default 0,
  last_article_count int not null default 0,
  updated_at timestamptz not null default now()
);

create index if not exists api_provider_health_disabled_idx
  on public.api_provider_health (disabled_until);

alter table public.api_provider_health enable row level security;

create policy "Service role api provider health"
  on public.api_provider_health
  for all
  to service_role
  using (true)
  with check (true);
