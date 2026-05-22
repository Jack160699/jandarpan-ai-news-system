-- SEO story slugs for /story/[slug] routes

alter table public.news_articles
  add column if not exists slug text;

create unique index if not exists news_articles_slug_unique_idx
  on public.news_articles (slug)
  where slug is not null;

create index if not exists news_articles_slug_lookup_idx
  on public.news_articles (slug);
