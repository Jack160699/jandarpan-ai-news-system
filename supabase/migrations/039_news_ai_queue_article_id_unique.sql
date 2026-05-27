-- Ensure upsert(onConflict: "article_id") has a matching unique index.
create unique index if not exists idx_news_ai_queue_article_id_unique
  on public.news_ai_queue(article_id);
