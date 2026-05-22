-- Async AI enrichment queue (decoupled from /api/fetch-news)

create table if not exists public.news_ai_queue (
  id uuid primary key default gen_random_uuid(),
  article_id uuid not null references public.news_articles (id) on delete cascade,
  status text not null default 'pending'
    check (status in ('pending', 'processing', 'completed', 'failed')),
  created_at timestamptz not null default now(),
  processed_at timestamptz,
  error text
);

create index if not exists news_ai_queue_status_created_idx
  on public.news_ai_queue (status, created_at);

create unique index if not exists news_ai_queue_article_id_unique
  on public.news_ai_queue (article_id);

alter table public.news_ai_queue enable row level security;

drop policy if exists "Service role ai queue" on public.news_ai_queue;

create policy "Service role ai queue"
  on public.news_ai_queue
  for all
  to service_role
  using (true)
  with check (true);
