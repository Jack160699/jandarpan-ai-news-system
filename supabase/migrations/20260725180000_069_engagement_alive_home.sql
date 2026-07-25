-- 069 engagement Phase 1 — follows, story read state, daily briefing cache
-- Forward-only. Client localStorage remains primary for guests; DB syncs for auth users.
-- Minimal PII: no browsing graphs beyond article/event id + timestamp.

create table if not exists public.reader_follows (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  target_type text not null
    check (target_type in ('district', 'topic', 'category', 'story', 'event')),
  target_id text not null,
  created_at timestamptz not null default now(),
  constraint reader_follows_unique unique (user_id, target_type, target_id),
  constraint reader_follows_target_id_len check (char_length(target_id) between 1 and 160)
);

comment on table public.reader_follows is
  'Authenticated reader follows for districts, topics, categories, stories, and events';

create index if not exists idx_reader_follows_user
  on public.reader_follows (user_id, created_at desc);

create index if not exists idx_reader_follows_target
  on public.reader_follows (target_type, target_id);

alter table public.reader_follows enable row level security;

drop policy if exists "reader_follows_select_own" on public.reader_follows;
create policy "reader_follows_select_own"
  on public.reader_follows for select to authenticated
  using (auth.uid() = user_id);

drop policy if exists "reader_follows_insert_own" on public.reader_follows;
create policy "reader_follows_insert_own"
  on public.reader_follows for insert to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "reader_follows_delete_own" on public.reader_follows;
create policy "reader_follows_delete_own"
  on public.reader_follows for delete to authenticated
  using (auth.uid() = user_id);

drop policy if exists "reader_follows_service_role" on public.reader_follows;
create policy "reader_follows_service_role"
  on public.reader_follows for all to service_role
  using (true) with check (true);

-- Minimal story/event read cursor for “what changed since last visit”
create table if not exists public.reader_story_state (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  article_id text not null,
  event_id text,
  last_read_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint reader_story_state_unique unique (user_id, article_id),
  constraint reader_story_state_article_len check (char_length(article_id) between 1 and 160)
);

comment on table public.reader_story_state is
  'Minimal reading cursor: article id, optional event id, last read timestamp';

create index if not exists idx_reader_story_state_user_event
  on public.reader_story_state (user_id, event_id)
  where event_id is not null;

create index if not exists idx_reader_story_state_user_read
  on public.reader_story_state (user_id, last_read_at desc);

alter table public.reader_story_state enable row level security;

drop policy if exists "reader_story_state_select_own" on public.reader_story_state;
create policy "reader_story_state_select_own"
  on public.reader_story_state for select to authenticated
  using (auth.uid() = user_id);

drop policy if exists "reader_story_state_upsert_own" on public.reader_story_state;
create policy "reader_story_state_insert_own"
  on public.reader_story_state for insert to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "reader_story_state_update_own" on public.reader_story_state;
create policy "reader_story_state_update_own"
  on public.reader_story_state for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "reader_story_state_service_role" on public.reader_story_state;
create policy "reader_story_state_service_role"
  on public.reader_story_state for all to service_role
  using (true) with check (true);

-- Precomputed daily briefing cache (no AI at request time)
create table if not exists public.daily_briefings (
  id uuid primary key default gen_random_uuid(),
  briefing_date date not null,
  district_slug text not null default 'statewide',
  daypart text not null
    check (daypart in ('morning', 'midday', 'evening', 'night')),
  locale text not null default 'hi',
  title text not null,
  subtitle text,
  item_slugs text[] not null default '{}',
  payload jsonb not null default '{}'::jsonb,
  generated_at timestamptz not null default now(),
  constraint daily_briefings_unique unique (briefing_date, district_slug, daypart, locale)
);

comment on table public.daily_briefings is
  'Cached आज का दर्पण payloads; refreshed by cron/background jobs only';

create index if not exists idx_daily_briefings_lookup
  on public.daily_briefings (briefing_date desc, district_slug, daypart);

alter table public.daily_briefings enable row level security;

-- Public read of briefing cache (no private user data)
drop policy if exists "daily_briefings_public_read" on public.daily_briefings;
create policy "daily_briefings_public_read"
  on public.daily_briefings for select to anon, authenticated
  using (true);

drop policy if exists "daily_briefings_service_write" on public.daily_briefings;
create policy "daily_briefings_service_write"
  on public.daily_briefings for all to service_role
  using (true) with check (true);

-- Lightweight story hub index for developing event clusters
create table if not exists public.story_hubs (
  event_id text primary key,
  slug text,
  title text not null,
  title_hi text,
  district_slug text,
  status text not null default 'developing'
    check (status in ('developing', 'resolved', 'archived')),
  update_count integer not null default 0,
  latest_article_id text,
  latest_at timestamptz,
  why_it_matters text,
  key_facts jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

comment on table public.story_hubs is
  'Developing-story hubs keyed by news_events id; UI may also derive from coverage cluster';

create index if not exists idx_story_hubs_district_latest
  on public.story_hubs (district_slug, latest_at desc nulls last)
  where status = 'developing';

alter table public.story_hubs enable row level security;

drop policy if exists "story_hubs_public_read" on public.story_hubs;
create policy "story_hubs_public_read"
  on public.story_hubs for select to anon, authenticated
  using (true);

drop policy if exists "story_hubs_service_write" on public.story_hubs;
create policy "story_hubs_service_write"
  on public.story_hubs for all to service_role
  using (true) with check (true);
