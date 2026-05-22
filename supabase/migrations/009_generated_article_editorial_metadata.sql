-- Editorial generation metadata (confidence, attribution, quality checks)

alter table public.generated_articles
  add column if not exists editorial_metadata jsonb not null default '{}'::jsonb;

create index if not exists generated_articles_editorial_metadata_idx
  on public.generated_articles using gin (editorial_metadata);
