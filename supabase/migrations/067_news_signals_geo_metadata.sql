-- 067: Restore canonical news_signals.geo_metadata (missing despite migration 014 intent)
-- Forward-only. Non-destructive. Preserves ingestion_metadata.geo for compatibility.

-- Canonical geo classification column used by Stage 1 district pipeline.
alter table public.news_signals
  add column if not exists geo_metadata jsonb;

comment on column public.news_signals.geo_metadata is
  'Canonical district classification: primary_district, districts[], kind/state, confidence, matched terms. Backfilled from ingestion_metadata.geo when present.';

-- Expression indexes for coverage / gap-first lookups (nullable-safe).
create index if not exists idx_news_signals_geo_primary_district
  on public.news_signals ((geo_metadata->>'primary_district'));

create index if not exists idx_news_signals_geo_kind
  on public.news_signals ((coalesce(geo_metadata->>'kind', geo_metadata->>'state')));

create index if not exists idx_news_signals_geo_confidence
  on public.news_signals (((geo_metadata->>'confidence')::float8))
  where geo_metadata ? 'confidence';

-- Backfill from legacy ingestion_metadata.geo only where canonical column is empty.
-- All known Production rows currently carry a geo object in ingestion_metadata.
update public.news_signals
set geo_metadata = ingestion_metadata->'geo'
where geo_metadata is null
  and jsonb_typeof(ingestion_metadata->'geo') = 'object';
