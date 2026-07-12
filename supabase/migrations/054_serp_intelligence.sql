-- Phase 11C — SERP Intelligence & Ranking Tracker

create table if not exists public.serp_keywords (
  id uuid primary key default gen_random_uuid(),
  keyword text not null,
  group_name text not null default 'General',
  language text not null default 'hi',
  region text not null default 'in',
  enabled boolean not null default true,
  is_custom boolean not null default false,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists serp_keywords_keyword_key
  on public.serp_keywords (keyword);

create index if not exists serp_keywords_group_enabled_idx
  on public.serp_keywords (group_name, enabled);

create table if not exists public.serp_snapshots (
  id uuid primary key default gen_random_uuid(),
  keyword_id uuid not null references public.serp_keywords (id) on delete cascade,
  captured_at timestamptz not null default now(),
  provider text not null default 'unknown',
  organic_results jsonb not null default '[]'::jsonb,
  serp_features jsonb not null default '{}'::jsonb,
  raw_metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists serp_snapshots_keyword_captured_idx
  on public.serp_snapshots (keyword_id, captured_at desc);

create table if not exists public.serp_rankings (
  id uuid primary key default gen_random_uuid(),
  keyword_id uuid not null references public.serp_keywords (id) on delete cascade,
  snapshot_id uuid references public.serp_snapshots (id) on delete set null,
  url text not null,
  domain text not null,
  title text,
  snippet text,
  site text,
  publish_date timestamptz,
  position integer not null check (position >= 1 and position <= 100),
  previous_position integer,
  position_delta integer,
  is_jandarpan boolean not null default false,
  competitor_key text,
  first_seen timestamptz not null default now(),
  last_seen timestamptz not null default now(),
  best_rank integer,
  worst_rank integer,
  ranking_history jsonb not null default '[]'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists serp_rankings_keyword_url_key
  on public.serp_rankings (keyword_id, url);

create index if not exists serp_rankings_jandarpan_idx
  on public.serp_rankings (is_jandarpan, position, last_seen desc);

create index if not exists serp_rankings_keyword_position_idx
  on public.serp_rankings (keyword_id, position);

create table if not exists public.serp_movements (
  id uuid primary key default gen_random_uuid(),
  keyword_id uuid not null references public.serp_keywords (id) on delete cascade,
  ranking_id uuid references public.serp_rankings (id) on delete set null,
  url text not null,
  domain text not null,
  movement_type text not null
    check (movement_type in (
      'new_ranking',
      'dropped_ranking',
      'improved_ranking',
      'lost_ranking',
      'unchanged'
    )),
  previous_position integer,
  current_position integer,
  position_delta integer,
  is_jandarpan boolean not null default false,
  detected_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists serp_movements_detected_idx
  on public.serp_movements (detected_at desc, movement_type);

create index if not exists serp_movements_keyword_idx
  on public.serp_movements (keyword_id, detected_at desc);

create table if not exists public.serp_opportunities (
  id uuid primary key default gen_random_uuid(),
  keyword_id uuid not null references public.serp_keywords (id) on delete cascade,
  opportunity_type text not null
    check (opportunity_type in (
      'striking_distance',
      'weak_competitor_content',
      'ctr_opportunity',
      'missing_faq',
      'missing_internal_links',
      'missing_schema',
      'high_search_opportunity',
      'serp_feature_gap'
    )),
  action_type text
    check (action_type is null or action_type in (
      'improve_title',
      'improve_meta',
      'expand_article',
      'create_faq',
      'add_images',
      'improve_internal_links',
      'publish_supporting_article',
      'create_topic_page'
    )),
  priority text not null default 'medium'
    check (priority in ('high', 'medium', 'low')),
  title text not null,
  reason text not null,
  current_position integer,
  jandarpan_url text,
  scores jsonb not null default '{}'::jsonb,
  status text not null default 'open'
    check (status in ('open', 'dismissed', 'acted')),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists serp_opportunities_status_priority_idx
  on public.serp_opportunities (status, priority, created_at desc);

create index if not exists serp_opportunities_keyword_idx
  on public.serp_opportunities (keyword_id, created_at desc);

-- Seed default keyword groups (Phase 11C)
insert into public.serp_keywords (keyword, group_name, language, region, enabled, is_custom)
select v.keyword, v.group_name, 'hi', 'in', true, false
from (
  values
    ('छत्तीसगढ़ समाचार', 'Chhattisgarh News'),
    ('छत्तीसगढ़ न्यूज़', 'Chhattisgarh News'),
    ('Chhattisgarh news', 'Chhattisgarh News'),
    ('रायपुर समाचार', 'Raipur News'),
    ('Raipur news', 'Raipur News'),
    ('कोरबा समाचार', 'Korba News'),
    ('Korba news', 'Korba News'),
    ('बिलासपुर समाचार', 'Bilaspur News'),
    ('Bilaspur news', 'Bilaspur News'),
    ('बस्तर समाचार', 'Bastar News'),
    ('Bastar news', 'Bastar News'),
    ('कांकेर समाचार', 'Kanker News'),
    ('Kanker news', 'Kanker News'),
    ('दुर्ग समाचार', 'Durg News'),
    ('Durg news', 'Durg News'),
    ('छत्तीसगढ़ राजनीति', 'Politics'),
    ('Chhattisgarh politics', 'Politics'),
    ('छत्तीसगढ़ अपराध', 'Crime'),
    ('Chhattisgarh crime', 'Crime'),
    ('छत्तीसगढ़ मौसम', 'Weather'),
    ('Chhattisgarh weather', 'Weather'),
    ('सरकारी योजना छत्तीसगढ़', 'Government Schemes'),
    ('छत्तीसगढ़ शिक्षा', 'Education'),
    ('Chhattisgarh education', 'Education'),
    ('छत्तीसगढ़ नौकरी', 'Jobs'),
    ('Chhattisgarh jobs', 'Jobs'),
    ('छत्तीसगढ़ खेल', 'Sports'),
    ('Chhattisgarh sports', 'Sports'),
    ('छत्तीसगढ़ व्यापार', 'Business'),
    ('Chhattisgarh business', 'Business'),
    ('छत्तीसगढ़ तकनीक', 'Technology'),
    ('Chhattisgarh technology', 'Technology'),
    ('बॉलीवुड समाचार', 'Entertainment'),
    ('Bollywood news Hindi', 'Entertainment')
) as v(keyword, group_name)
where not exists (
  select 1 from public.serp_keywords sk where lower(sk.keyword) = lower(v.keyword)
);

alter table public.serp_keywords enable row level security;
alter table public.serp_snapshots enable row level security;
alter table public.serp_rankings enable row level security;
alter table public.serp_movements enable row level security;
alter table public.serp_opportunities enable row level security;

create policy "serp_keywords_service_role"
  on public.serp_keywords for all
  using (auth.role() = 'service_role') with check (auth.role() = 'service_role');

create policy "serp_snapshots_service_role"
  on public.serp_snapshots for all
  using (auth.role() = 'service_role') with check (auth.role() = 'service_role');

create policy "serp_rankings_service_role"
  on public.serp_rankings for all
  using (auth.role() = 'service_role') with check (auth.role() = 'service_role');

create policy "serp_movements_service_role"
  on public.serp_movements for all
  using (auth.role() = 'service_role') with check (auth.role() = 'service_role');

create policy "serp_opportunities_service_role"
  on public.serp_opportunities for all
  using (auth.role() = 'service_role') with check (auth.role() = 'service_role');

comment on table public.serp_keywords is 'Configurable SERP keyword groups for ranking tracker (Phase 11C)';
comment on table public.serp_snapshots is 'Full SERP snapshots per keyword crawl';
comment on table public.serp_rankings is 'Current and historical ranking state per keyword+URL';
comment on table public.serp_movements is 'Rank change events (new, improved, dropped, lost)';
comment on table public.serp_opportunities is 'SEO opportunities and AI action recommendations from SERP analysis';
