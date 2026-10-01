-- Migration 094: persist the body fingerprint so the editorial worker stops re-downloading article bodies.
--
-- loadExistingStoryIndex() read the 500 most recent generated_articles INCLUDING article_body on every editorial wake
-- (every 5 minutes) just to compute fingerprintBody() of each. The fingerprint is deterministic, so it is stored once
-- (lazily backfilled by the worker with the SAME application hash, so dedupe behaviour is unchanged) and only the
-- fingerprints are read afterwards. Nullable, additive; articles are untouched.

alter table public.generated_articles add column if not exists body_fingerprint text;

comment on column public.generated_articles.body_fingerprint is
  'fingerprintBody(article_body): 24 hex chars of sha256 over the markdown-stripped lowercase body. Backfilled lazily by the editorial worker.';
