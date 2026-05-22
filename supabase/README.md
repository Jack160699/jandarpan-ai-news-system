# Supabase migrations

Run in order in the SQL editor (or `supabase db push`):

1. `001_news_articles.sql` — core articles table
2. `002_ingestion_pipeline.sql` — ingestion logs, AI columns
3. `003_rss_source_health.sql` — RSS health tracking
4. `004_article_slug.sql` — SEO slugs for `/story/[slug]` (required before production indexing)

After `004`, re-run ingestion so existing rows receive `slug` values.
