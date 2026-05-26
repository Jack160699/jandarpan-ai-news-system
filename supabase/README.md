# Supabase migrations

Run in order in the SQL editor (or `supabase db push`):

1. `001_news_articles.sql` — core articles table
2. `002_ingestion_pipeline.sql` — ingestion logs, AI columns
3. `003_rss_source_health.sql` — RSS health tracking
4. `004_article_slug.sql` — SEO slugs for `/story/[slug]` (required before production indexing)
5. `005_news_articles_public_read.sql` — **required** if homepage is empty but ingestion succeeds (anon RLS read)
6. `006_news_ai_queue.sql` — async AI enrichment queue for `/api/process-ai`
7. `007_ai_newsroom_layers.sql` — `news_signals`, `news_events`, `generated_articles`
8. `008_event_clustering_metadata.sql` — `clustering_metadata` on `news_events`
9. `009_generated_article_editorial_metadata.sql` — `editorial_metadata` on `generated_articles`
10. `010_editorial_image_queue.sql` — async hero image generation queue
11. `011_editorial_control.sql` — approve/reject, homepage pins on generated_articles

After migration 010, create a **public** Storage bucket `editorial-images` in Supabase Dashboard.

After `004`, re-run ingestion so existing rows receive `slug` values.

If `/api/fetch-news` inserts rows but the homepage is empty, run `005` — ingestion uses the service role (bypasses RLS); the homepage uses the anon key.

## Schema stabilization (034+)

Production drift (missing ingestion tables, `embedding_json`, stale PostgREST cache) is fixed by:

- `034_production_schema_stabilization.sql` — idempotent reconcile + `get_schema_health()`
- Docs: `supabase/docs/SCHEMA_DIFF_REPORT.md`, `SUPABASE_DEPLOYMENT_034.md`

```bash
npx supabase db push --linked --yes
npm run schema:verify
```

Admin dashboard: `/admin/schema` (super_admin). See `PRODUCTION_SAFETY_CHECKLIST.md`.
