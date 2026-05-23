-- Regional intelligence: geo tags for signals, events, and published articles

alter table news_signals
  add column if not exists geo_metadata jsonb not null default '{}'::jsonb;

alter table news_events
  add column if not exists geo_metadata jsonb not null default '{}'::jsonb;

alter table generated_articles
  add column if not exists geo_metadata jsonb not null default '{}'::jsonb;

create index if not exists idx_news_signals_geo_district
  on news_signals ((geo_metadata->>'primary_district'));

create index if not exists idx_generated_articles_geo_district
  on generated_articles ((geo_metadata->>'primary_district'));

comment on column news_signals.geo_metadata is 'Hyperlocal geo tags: state, districts[], primary_district, confidence';
comment on column news_events.geo_metadata is 'Aggregated geo tags from clustered signals';
comment on column generated_articles.geo_metadata is 'Editorial geo tags for district routing and personalization';
