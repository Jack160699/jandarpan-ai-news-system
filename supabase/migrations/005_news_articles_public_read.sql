-- Ensure homepage anon reads work (idempotent — safe to re-run)

alter table public.news_articles enable row level security;

drop policy if exists "Public read news articles" on public.news_articles;

create policy "Public read news articles"
  on public.news_articles
  for select
  to anon, authenticated
  using (true);
