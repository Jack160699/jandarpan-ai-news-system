-- Migration: 080_production_critical_fixes
-- Date: 2026-09-28
-- Fixes applied to production Supabase:
--
--   1. news_signals.article_url index overflow (btree v4 max 2704 bytes).
--      Replace direct btree unique index on raw URL with md5 fingerprint column.
--      Full URL preserved in article_url. Dedup key is md5(trim(lower(url))).
--
--   2. news_articles.article_url unique constraint overflow (same issue).
--      Same md5 fingerprint strategy.
--
--   3. generated_articles composite covering index for homepage pool query
--      (editorial_status IN (...) ORDER BY published_at DESC).
--      Idempotent — already exists from migration 064, re-applied for safety.
--
-- Note: evening editorial run (18:00 IST = 12:30 UTC) is handled by
-- GitHub Actions editorial.yml workflow. pg_cron not used here.

-- ============================================================
-- PART 1: Fix news_signals article_url index overflow
-- ============================================================

-- 1a. Add url_fingerprint column: md5 of normalized URL (always 32 hex chars)
ALTER TABLE public.news_signals
  ADD COLUMN IF NOT EXISTS url_fingerprint text
    GENERATED ALWAYS AS (md5(trim(lower(article_url)))) STORED;

-- 1b. Unique index on the fingerprint
CREATE UNIQUE INDEX IF NOT EXISTS news_signals_url_fingerprint_unique
  ON public.news_signals (url_fingerprint);

-- 1c. Drop the old btree unique index on raw URL
DROP INDEX IF EXISTS public.news_signals_article_url_unique;

-- 1d. Keep a non-unique prefix index (500 chars) for partial-match lookups
CREATE INDEX IF NOT EXISTS news_signals_article_url_prefix_idx
  ON public.news_signals (left(article_url, 500));

COMMENT ON COLUMN public.news_signals.url_fingerprint IS
  'md5(trim(lower(article_url))) — deterministic 32-char dedup key. Unique-indexed here instead of raw URL to avoid btree row-size overflow (btree v4 max 2704 bytes).';

-- ============================================================
-- PART 2: Fix news_articles article_url btree overflow
-- ============================================================

-- 2a. Add url_fingerprint to news_articles
ALTER TABLE public.news_articles
  ADD COLUMN IF NOT EXISTS url_fingerprint text
    GENERATED ALWAYS AS (md5(trim(lower(article_url)))) STORED;

-- 2b. Unique index on fingerprint
CREATE UNIQUE INDEX IF NOT EXISTS news_articles_url_fingerprint_unique
  ON public.news_articles (url_fingerprint);

-- 2c. Drop old unique constraint (constraint name = news_articles_article_url_key per pg convention)
ALTER TABLE public.news_articles
  DROP CONSTRAINT IF EXISTS news_articles_article_url_key;

-- 2d. Prefix index for lookups
CREATE INDEX IF NOT EXISTS news_articles_article_url_prefix_idx
  ON public.news_articles (left(article_url, 500));

COMMENT ON COLUMN public.news_articles.url_fingerprint IS
  'md5(trim(lower(article_url))) — dedup fingerprint, avoids btree row-size limit.';

-- ============================================================
-- PART 3: generated_articles covering index for homepage pool
-- ============================================================

-- Partial index used by fetchGeneratedArticlePool (homepage/sitemap paths)
CREATE INDEX IF NOT EXISTS idx_generated_articles_public_published_at
  ON public.generated_articles (published_at DESC NULLS LAST)
  WHERE published_at IS NOT NULL
    AND editorial_status IN ('approved', 'published', 'live');

-- Composite index: editorial_status IN (...) + ORDER BY published_at DESC
CREATE INDEX IF NOT EXISTS idx_generated_articles_status_published
  ON public.generated_articles (editorial_status, published_at DESC NULLS LAST)
  WHERE published_at IS NOT NULL;

COMMENT ON INDEX public.idx_generated_articles_status_published IS
  'Migration 080: covers generated_pool_homepage query (editorial_status IN filter + ORDER BY published_at DESC).';
