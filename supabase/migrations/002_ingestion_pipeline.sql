-- Phase 2: Hybrid ingestion pipeline (GNews + NewsData + RSS + AI)

-- Extend news_articles
alter table public.news_articles
  add column if not exists provider text,
  add column if not exists language text,
  add column if not exists region text,
  add column if not exists title_hash text,
  add column if not exists url_hash text,
  add column if not exists ai_summary text,
  add column if not exists ai_headline text,
  add column if not exists ai_processed_at timestamptz;

create index if not exists news_articles_title_hash_idx
  on public.news_articles (title_hash);

create index if not exists news_articles_provider_idx
  on public.news_articles (provider);

create index if not exists news_articles_region_idx
  on public.news_articles (region);

-- Ingestion run logs
create table if not exists public.ingestion_logs (
  id uuid primary key default gen_random_uuid(),
  status text not null default 'success',
  total_fetched int not null default 0,
  total_valid int not null default 0,
  inserted int not null default 0,
  skipped_duplicates int not null default 0,
  failed_validation int not null default 0,
  category_stats jsonb default '{}'::jsonb,
  provider_stats jsonb default '{}'::jsonb,
  provider_errors jsonb default '[]'::jsonb,
  duration_ms int,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists ingestion_logs_created_at_idx
  on public.ingestion_logs (created_at desc);

-- Failed article tracking
create table if not exists public.ingestion_failures (
  id uuid primary key default gen_random_uuid(),
  title text,
  article_url text,
  provider text,
  reason text not null,
  payload jsonb,
  created_at timestamptz not null default now()
);

create index if not exists ingestion_failures_created_at_idx
  on public.ingestion_failures (created_at desc);

alter table public.ingestion_logs enable row level security;
alter table public.ingestion_failures enable row level security;

create policy "Service role ingestion logs"
  on public.ingestion_logs
  for all
  to service_role
  using (true)
  with check (true);

create policy "Service role ingestion failures"
  on public.ingestion_failures
  for all
  to service_role
  using (true)
  with check (true);

-- Admin read via service role only (no public anon access to logs)
