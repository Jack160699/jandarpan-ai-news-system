-- Phase 1: Live news ingestion table
-- Run in Supabase SQL Editor or via CLI

create table if not exists public.news_articles (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  content text,
  image_url text,
  source text,
  author text,
  category text not null,
  article_url text not null unique,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists news_articles_category_idx
  on public.news_articles (category);

create index if not exists news_articles_published_at_idx
  on public.news_articles (published_at desc nulls last);

create index if not exists news_articles_created_at_idx
  on public.news_articles (created_at desc);

-- Optional: enable RLS with public read for anon key
alter table public.news_articles enable row level security;

create policy "Public read news articles"
  on public.news_articles
  for select
  to anon, authenticated
  using (true);

create policy "Service role full access"
  on public.news_articles
  for all
  to service_role
  using (true)
  with check (true);
