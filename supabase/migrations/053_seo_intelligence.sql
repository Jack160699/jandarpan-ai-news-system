-- Phase 11B — SEO Intelligence Engine (analysis layer on competitor + generated_articles)

create table if not exists public.seo_keyword_intelligence (
  id uuid primary key default gen_random_uuid(),
  keyword text not null,
  frequency integer not null default 0,
  trend text not null default 'stable'
    check (trend in ('rising', 'stable', 'declining')),
  competitors_using jsonb not null default '[]'::jsonb,
  district text,
  entity_type text not null default 'keyword'
    check (entity_type in ('keyword', 'person', 'location', 'organization', 'scheme')),
  last_seen timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists seo_keyword_intelligence_keyword_key
  on public.seo_keyword_intelligence (keyword);

create index if not exists seo_keyword_intelligence_frequency_idx
  on public.seo_keyword_intelligence (frequency desc, last_seen desc);

create index if not exists seo_keyword_intelligence_district_idx
  on public.seo_keyword_intelligence (district, frequency desc);

create table if not exists public.seo_gap_reports (
  id uuid primary key default gen_random_uuid(),
  competitor_article_id uuid references public.competitor_articles (id) on delete set null,
  generated_article_id uuid,
  generated_article_slug text,
  gap_type text not null
    check (gap_type in (
      'missing_story',
      'similar_story',
      'duplicate_topic',
      'missing_district',
      'missing_category',
      'missing_keyword',
      'missing_faq'
    )),
  gap_score numeric not null default 0,
  priority text not null default 'medium'
    check (priority in ('high', 'medium', 'low')),
  reason text not null,
  district text,
  category text,
  keyword text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists seo_gap_reports_priority_idx
  on public.seo_gap_reports (priority, gap_score desc, created_at desc);

create index if not exists seo_gap_reports_type_idx
  on public.seo_gap_reports (gap_type, created_at desc);

create table if not exists public.seo_trending_topics (
  id uuid primary key default gen_random_uuid(),
  topic text not null,
  cluster_key text not null,
  trend text not null default 'trending'
    check (trend in ('breaking', 'trending', 'growing', 'declining')),
  article_count integer not null default 0,
  competitor_count integer not null default 0,
  district text,
  keywords jsonb not null default '[]'::jsonb,
  score numeric not null default 0,
  last_seen timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists seo_trending_topics_cluster_key
  on public.seo_trending_topics (cluster_key);

create index if not exists seo_trending_topics_score_idx
  on public.seo_trending_topics (score desc, last_seen desc);

create table if not exists public.seo_recommendations (
  id uuid primary key default gen_random_uuid(),
  type text not null
    check (type in (
      'publish_story',
      'update_article',
      'improve_title',
      'add_faq',
      'improve_internal_links',
      'high_priority_district',
      'trending_keyword'
    )),
  priority text not null default 'medium'
    check (priority in ('high', 'medium', 'low')),
  title text not null,
  reason text not null,
  district text,
  keyword text,
  article_slug text,
  competitor_article_id uuid references public.competitor_articles (id) on delete set null,
  scores jsonb not null default '{}'::jsonb,
  status text not null default 'open'
    check (status in ('open', 'dismissed', 'acted')),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists seo_recommendations_status_priority_idx
  on public.seo_recommendations (status, priority, created_at desc);

create index if not exists seo_recommendations_type_idx
  on public.seo_recommendations (type, created_at desc);

alter table public.seo_keyword_intelligence enable row level security;
alter table public.seo_gap_reports enable row level security;
alter table public.seo_trending_topics enable row level security;
alter table public.seo_recommendations enable row level security;

create policy "seo_keyword_intelligence_service_role"
  on public.seo_keyword_intelligence for all
  using (auth.role() = 'service_role') with check (auth.role() = 'service_role');

create policy "seo_gap_reports_service_role"
  on public.seo_gap_reports for all
  using (auth.role() = 'service_role') with check (auth.role() = 'service_role');

create policy "seo_trending_topics_service_role"
  on public.seo_trending_topics for all
  using (auth.role() = 'service_role') with check (auth.role() = 'service_role');

create policy "seo_recommendations_service_role"
  on public.seo_recommendations for all
  using (auth.role() = 'service_role') with check (auth.role() = 'service_role');

comment on table public.seo_keyword_intelligence is 'Aggregated keyword/entity intelligence from competitor headlines (Phase 11B)';
comment on table public.seo_gap_reports is 'Content gap analysis — competitor vs Jandarpan';
comment on table public.seo_trending_topics is 'Clustered trending/breaking topic intelligence';
comment on table public.seo_recommendations is 'Actionable editor SEO recommendations';
