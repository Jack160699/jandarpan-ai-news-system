-- Event clustering metadata for explainable merges

alter table public.news_events
  add column if not exists clustering_metadata jsonb not null default '{}'::jsonb;

create index if not exists news_events_clustering_metadata_idx
  on public.news_events using gin (clustering_metadata);
