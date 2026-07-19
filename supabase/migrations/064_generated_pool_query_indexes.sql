-- Phase 6 — generated-pool / sitemap / health query indexes (additive, idempotent).
-- Justified by hot paths that hit PostgreSQL 57014 under full-row scans.
-- Forward-only, non-destructive. No CONCURRENTLY (migration transactions).

-- Public homepage / sitemap / Google News pool:
--   WHERE published_at IS NOT NULL
--     AND editorial_status IN ('approved','published','live')
--   ORDER BY published_at DESC
-- Existing (editorial_status, published_at) helps equality filters; this partial
-- index matches the multi-status + ORDER BY pattern used by fetchGeneratedArticlePool.
create index if not exists idx_generated_articles_public_published_at
  on public.generated_articles (published_at desc nulls last)
  where published_at is not null
    and editorial_status in ('approved', 'published', 'live');

comment on index public.idx_generated_articles_public_published_at is
  'Phase 6: public pool / sitemap / google-news ordered by published_at.';

-- Desk / health pending head-counts:
--   WHERE editorial_status = 'pending' (ORDER BY created_at when listing)
create index if not exists idx_generated_articles_pending_created_at
  on public.generated_articles (created_at desc)
  where editorial_status = 'pending';

comment on index public.idx_generated_articles_pending_created_at is
  'Phase 6: pending desk / health pendingCount probes.';

-- Google News 48h window: published_at >= cutoff with public statuses.
-- Covered by idx_generated_articles_public_published_at (range + order).
-- Worker claim / queue indexes already present in 006 / 036 / 062 — not duplicated.
