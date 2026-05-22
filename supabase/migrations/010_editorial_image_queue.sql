-- Async editorial hero image generation queue

create table if not exists public.editorial_image_queue (
  id uuid primary key default gen_random_uuid(),
  generated_article_id uuid not null references public.generated_articles (id) on delete cascade,
  status text not null default 'pending'
    check (status in ('pending', 'processing', 'completed', 'failed')),
  attempts int not null default 0,
  max_attempts int not null default 3,
  prompt_hash text,
  hero_image_url text,
  og_image_url text,
  image_source text,
  error text,
  created_at timestamptz not null default now(),
  processed_at timestamptz
);

create unique index if not exists editorial_image_queue_article_unique
  on public.editorial_image_queue (generated_article_id);

create index if not exists editorial_image_queue_status_created_idx
  on public.editorial_image_queue (status, created_at);

create index if not exists editorial_image_queue_prompt_hash_idx
  on public.editorial_image_queue (prompt_hash)
  where prompt_hash is not null and status = 'completed';

alter table public.editorial_image_queue enable row level security;

drop policy if exists "Service role editorial image queue" on public.editorial_image_queue;
create policy "Service role editorial image queue"
  on public.editorial_image_queue
  for all
  to service_role
  using (true) with check (true);
