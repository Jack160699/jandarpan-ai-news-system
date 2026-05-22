-- AI-native newsroom layers: signals → events → generated articles

-- 1. Raw ingestion (never public)
create table if not exists public.news_signals (
  id uuid primary key default gen_random_uuid(),
  source text,
  provider text not null,
  title text not null,
  raw_content text,
  article_url text not null,
  image_url text,
  published_at timestamptz,
  category text not null default 'world',
  region text,
  language text,
  ingestion_metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create unique index if not exists news_signals_article_url_unique
  on public.news_signals (article_url);

create index if not exists news_signals_published_at_idx
  on public.news_signals (published_at desc nulls last);

create index if not exists news_signals_provider_idx
  on public.news_signals (provider);

create index if not exists news_signals_region_category_idx
  on public.news_signals (region, category);

create index if not exists news_signals_created_at_idx
  on public.news_signals (created_at desc);

-- 2. AI-clustered events (internal editorial layer)
create table if not exists public.news_events (
  id uuid primary key default gen_random_uuid(),
  canonical_title text not null,
  event_summary text,
  region text,
  category text,
  urgency_score numeric not null default 0,
  source_count int not null default 1,
  signal_ids uuid[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists news_events_urgency_idx
  on public.news_events (urgency_score desc, updated_at desc);

create index if not exists news_events_region_category_idx
  on public.news_events (region, category);

create index if not exists news_events_signal_ids_gin
  on public.news_events using gin (signal_ids);

-- 3. Published AI-generated articles (public-facing)
create table if not exists public.generated_articles (
  id uuid primary key default gen_random_uuid(),
  event_id uuid references public.news_events (id) on delete set null,
  slug text not null,
  headline text not null,
  summary text,
  article_body text,
  hero_image_url text,
  seo_title text,
  seo_description text,
  reading_time text,
  language text default 'hi',
  tags text[] not null default '{}',
  published_at timestamptz,
  created_at timestamptz not null default now()
);

create unique index if not exists generated_articles_slug_unique
  on public.generated_articles (slug);

create index if not exists generated_articles_published_at_idx
  on public.generated_articles (published_at desc nulls last);

create index if not exists generated_articles_event_id_idx
  on public.generated_articles (event_id);

create index if not exists generated_articles_region_language_idx
  on public.generated_articles (language, published_at desc);

-- RLS: signals + events = service role only; generated = public read
alter table public.news_signals enable row level security;
alter table public.news_events enable row level security;
alter table public.generated_articles enable row level security;

drop policy if exists "Service role news_signals" on public.news_signals;
create policy "Service role news_signals"
  on public.news_signals for all to service_role
  using (true) with check (true);

drop policy if exists "Service role news_events" on public.news_events;
create policy "Service role news_events"
  on public.news_events for all to service_role
  using (true) with check (true);

drop policy if exists "Public read generated articles" on public.generated_articles;
create policy "Public read generated articles"
  on public.generated_articles for select to anon, authenticated
  using (true);

drop policy if exists "Service role generated articles" on public.generated_articles;
create policy "Service role generated articles"
  on public.generated_articles for all to service_role
  using (true) with check (true);
