-- Evolving story coverage — live clusters, update feed, event history

alter table public.news_events
  add column if not exists coverage_slug text,
  add column if not exists coverage_headline text,
  add column if not exists cluster_confidence numeric default 0,
  add column if not exists is_live boolean not null default false,
  add column if not exists coverage_status text not null default 'active';

create unique index if not exists news_events_coverage_slug_unique
  on public.news_events (coverage_slug)
  where coverage_slug is not null;

create index if not exists news_events_is_live_idx
  on public.news_events (is_live, updated_at desc)
  where is_live = true;

create table if not exists public.coverage_updates (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.news_events (id) on delete cascade,
  update_type text not null default 'development',
  headline text not null,
  summary text,
  signal_ids uuid[] not null default '{}',
  source_attribution jsonb not null default '[]'::jsonb,
  cluster_confidence numeric,
  is_breaking boolean not null default false,
  published_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists coverage_updates_event_published_idx
  on public.coverage_updates (event_id, published_at desc);

alter table public.coverage_updates enable row level security;

create policy "Service role coverage_updates"
  on public.coverage_updates
  for all
  to service_role
  using (true)
  with check (true);

create policy "Public read coverage_updates"
  on public.coverage_updates
  for select
  to anon, authenticated
  using (true);

-- Live events readable when flagged live
drop policy if exists "Public read live news_events" on public.news_events;
create policy "Public read live news_events"
  on public.news_events
  for select
  to anon, authenticated
  using (is_live = true);
