-- Phase 11D — Google Search Console Intelligence Engine

create table if not exists public.gsc_daily_metrics (
  id uuid primary key default gen_random_uuid(),
  metric_date date not null,
  clicks integer not null default 0,
  impressions integer not null default 0,
  ctr numeric not null default 0,
  position numeric not null default 0,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists gsc_daily_metrics_date_key
  on public.gsc_daily_metrics (metric_date);

create index if not exists gsc_daily_metrics_date_desc_idx
  on public.gsc_daily_metrics (metric_date desc);

create table if not exists public.gsc_queries (
  id uuid primary key default gen_random_uuid(),
  query text not null,
  clicks integer not null default 0,
  impressions integer not null default 0,
  ctr numeric not null default 0,
  position numeric not null default 0,
  previous_position numeric,
  position_delta numeric,
  trend text not null default 'stable'
    check (trend in ('rising', 'stable', 'declining')),
  district text,
  category text,
  generated_article_id uuid,
  generated_article_slug text,
  topic text,
  period_start date,
  period_end date,
  last_seen timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists gsc_queries_query_key
  on public.gsc_queries (query);

create index if not exists gsc_queries_clicks_idx
  on public.gsc_queries (clicks desc, impressions desc);

create index if not exists gsc_queries_district_idx
  on public.gsc_queries (district, clicks desc);

create table if not exists public.gsc_pages (
  id uuid primary key default gen_random_uuid(),
  page_url text not null,
  clicks integer not null default 0,
  impressions integer not null default 0,
  ctr numeric not null default 0,
  position numeric not null default 0,
  indexed_status text not null default 'unknown'
    check (indexed_status in ('indexed', 'unknown', 'excluded', 'error')),
  last_seen timestamptz not null default now(),
  generated_article_id uuid,
  generated_article_slug text,
  district text,
  category text,
  period_start date,
  period_end date,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists gsc_pages_url_key
  on public.gsc_pages (page_url);

create index if not exists gsc_pages_clicks_idx
  on public.gsc_pages (clicks desc, impressions desc);

create table if not exists public.gsc_index_health (
  id uuid primary key default gen_random_uuid(),
  captured_at timestamptz not null default now(),
  indexed_pages integer not null default 0,
  excluded_pages integer not null default 0,
  errors integer not null default 0,
  warnings integer not null default 0,
  sitemap_health text not null default 'unknown'
    check (sitemap_health in ('healthy', 'warning', 'error', 'unknown')),
  news_sitemap_health text not null default 'unknown'
    check (news_sitemap_health in ('healthy', 'warning', 'error', 'unknown')),
  canonical_issues integer not null default 0,
  robots_issues integer not null default 0,
  raw_metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists gsc_index_health_captured_idx
  on public.gsc_index_health (captured_at desc);

create table if not exists public.gsc_recommendations (
  id uuid primary key default gen_random_uuid(),
  recommendation_type text not null
    check (recommendation_type in (
      'ctr_opportunity',
      'position_opportunity',
      'title_improvement',
      'meta_improvement',
      'expand_article',
      'add_faq',
      'improve_schema',
      'improve_internal_links',
      'index_issue'
    )),
  priority text not null default 'medium'
    check (priority in ('high', 'medium', 'low')),
  title text not null,
  reason text not null,
  query text,
  page_url text,
  scores jsonb not null default '{}'::jsonb,
  status text not null default 'open'
    check (status in ('open', 'dismissed', 'acted')),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists gsc_recommendations_status_priority_idx
  on public.gsc_recommendations (status, priority, created_at desc);

alter table public.gsc_daily_metrics enable row level security;
alter table public.gsc_queries enable row level security;
alter table public.gsc_pages enable row level security;
alter table public.gsc_index_health enable row level security;
alter table public.gsc_recommendations enable row level security;

create policy "gsc_daily_metrics_service_role"
  on public.gsc_daily_metrics for all
  using (auth.role() = 'service_role') with check (auth.role() = 'service_role');

create policy "gsc_queries_service_role"
  on public.gsc_queries for all
  using (auth.role() = 'service_role') with check (auth.role() = 'service_role');

create policy "gsc_pages_service_role"
  on public.gsc_pages for all
  using (auth.role() = 'service_role') with check (auth.role() = 'service_role');

create policy "gsc_index_health_service_role"
  on public.gsc_index_health for all
  using (auth.role() = 'service_role') with check (auth.role() = 'service_role');

create policy "gsc_recommendations_service_role"
  on public.gsc_recommendations for all
  using (auth.role() = 'service_role') with check (auth.role() = 'service_role');

comment on table public.gsc_daily_metrics is 'Site-wide GSC daily performance (Phase 11D)';
comment on table public.gsc_queries is 'Top search queries with trends and article links';
comment on table public.gsc_pages is 'Page-level GSC performance';
comment on table public.gsc_index_health is 'Index coverage and sitemap health snapshots';
comment on table public.gsc_recommendations is 'CTR and position opportunity recommendations';
