# Supabase migrations

Run in order in the SQL editor (or `supabase db push`):

1. `001_news_articles.sql` — core articles table
2. `002_ingestion_pipeline.sql` — ingestion logs, AI columns
3. `003_rss_source_health.sql` — RSS health tracking
4. `004_article_slug.sql` — SEO slugs for `/story/[slug]` (required before production indexing)
5. `005_news_articles_public_read.sql` — **required** if homepage is empty but ingestion succeeds (anon RLS read)
6. `006_news_ai_queue.sql` — async AI enrichment queue for `/api/process-ai`

After `004`, re-run ingestion so existing rows receive `slug` values.

If `/api/fetch-news` inserts rows but the homepage is empty, run `005` — ingestion uses the service role (bypasses RLS); the homepage uses the anon key.
