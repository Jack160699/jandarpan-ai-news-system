-- Phase 11A — Competitor Intelligence Engine (read-only SEO/content tracking)

create table if not exists public.competitor_sources (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  homepage text not null,
  feed_url text,
  language text not null default 'hi',
  region text not null default 'india',
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists competitor_sources_name_key
  on public.competitor_sources (lower(name));

create table if not exists public.competitor_articles (
  id uuid primary key default gen_random_uuid(),
  source_id uuid not null references public.competitor_sources (id) on delete cascade,
  url text not null,
  title text not null,
  description text,
  category text,
  district text,
  language text,
  author text,
  published_at timestamptz,
  fetched_at timestamptz not null default now(),
  image text,
  word_count integer,
  headings jsonb not null default '[]'::jsonb,
  canonical text,
  schema_detected jsonb not null default '{}'::jsonb,
  open_graph jsonb not null default '{}'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists competitor_articles_url_key
  on public.competitor_articles (url);

create index if not exists competitor_articles_source_id_idx
  on public.competitor_articles (source_id, published_at desc nulls last);

create index if not exists competitor_articles_fetched_at_idx
  on public.competitor_articles (fetched_at desc);

create index if not exists competitor_articles_published_at_idx
  on public.competitor_articles (published_at desc nulls last);

create table if not exists public.competitor_runs (
  id uuid primary key default gen_random_uuid(),
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  status text not null default 'running'
    check (status in ('running', 'completed', 'failed', 'skipped')),
  articles_found integer not null default 0,
  articles_saved integer not null default 0,
  errors jsonb not null default '[]'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists competitor_runs_started_at_idx
  on public.competitor_runs (started_at desc);

alter table public.competitor_sources enable row level security;
alter table public.competitor_articles enable row level security;
alter table public.competitor_runs enable row level security;

create policy "competitor_sources_service_role"
  on public.competitor_sources
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

create policy "competitor_articles_service_role"
  on public.competitor_articles
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

create policy "competitor_runs_service_role"
  on public.competitor_runs
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

-- Seed default competitors (feed URLs are best-effort RSS endpoints; editable in DB)
insert into public.competitor_sources (name, homepage, feed_url, language, region, enabled)
select v.name, v.homepage, v.feed_url, v.language, v.region, v.enabled
from (
  values
    ('Dainik Bhaskar', 'https://www.bhaskar.com', 'https://www.bhaskar.com/rss-feed/272/', 'hi', 'india', true),
    ('Patrika', 'https://www.patrika.com', 'https://www.patrika.com/rss/top-news.xml', 'hi', 'india', true),
    ('Haribhoomi', 'https://www.haribhoomi.com', 'https://www.haribhoomi.com/feed/', 'hi', 'chhattisgarh', true),
    ('News18 Hindi', 'https://hindi.news18.com', 'https://hindi.news18.com/rss/topstory.xml', 'hi', 'india', true),
    ('Amar Ujala', 'https://www.amarujala.com', 'https://www.amarujala.com/rss/india-news.xml', 'hi', 'india', true),
    ('Jagran', 'https://www.jagran.com', 'https://www.jagran.com/rss/news/national.xml', 'hi', 'india', true),
    ('TV9 Bharatvarsh', 'https://www.tv9hindi.com', 'https://www.tv9hindi.com/rss', 'hi', 'india', true),
    ('Aaj Tak', 'https://www.aajtak.in', 'https://www.aajtak.in/rssfeeds/?id=home', 'hi', 'india', true)
) as v(name, homepage, feed_url, language, region, enabled)
where not exists (
  select 1
  from public.competitor_sources s
  where lower(s.name) = lower(v.name)
);

comment on table public.competitor_sources is 'Configurable competitor news sources for SEO intelligence (Phase 11A)';
comment on table public.competitor_articles is 'Collected competitor article intelligence — deduped by URL';
comment on table public.competitor_runs is 'Crawl run audit log for competitor intelligence collector';
