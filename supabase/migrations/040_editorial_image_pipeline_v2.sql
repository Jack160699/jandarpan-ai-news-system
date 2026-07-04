-- Editorial image pipeline v2 — queue improvements, generation history, metrics

-- Queue enhancements
alter table public.editorial_image_queue
  add column if not exists scheduled_at timestamptz,
  add column if not exists custom_prompt text,
  add column if not exists approval_status text not null default 'auto'
    check (approval_status in ('auto', 'pending_review', 'approved', 'rejected')),
  add column if not exists processing_started_at timestamptz,
  add column if not exists priority int not null default 0,
  add column if not exists generation_history jsonb not null default '[]'::jsonb;

create index if not exists editorial_image_queue_scheduled_idx
  on public.editorial_image_queue (status, scheduled_at nulls first, created_at)
  where status = 'pending';

create index if not exists editorial_image_queue_processing_stale_idx
  on public.editorial_image_queue (processing_started_at)
  where status = 'processing';

-- Generation attempt history (one row per attempt)
create table if not exists public.editorial_image_generations (
  id uuid primary key default gen_random_uuid(),
  queue_id uuid references public.editorial_image_queue (id) on delete cascade,
  generated_article_id uuid not null references public.generated_articles (id) on delete cascade,
  attempt_number int not null default 1,
  provider text not null default 'openai',
  model text,
  prompt text not null,
  prompt_hash text,
  status text not null check (status in ('started', 'completed', 'rejected', 'failed')),
  quality_score numeric(4,3),
  quality_flags text[],
  hero_image_url text,
  og_image_url text,
  visual_hash text,
  latency_ms int,
  error text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists editorial_image_generations_article_idx
  on public.editorial_image_generations (generated_article_id, created_at desc);

create index if not exists editorial_image_generations_queue_idx
  on public.editorial_image_generations (queue_id, attempt_number);

-- Daily rollup metrics
create table if not exists public.editorial_image_metrics_daily (
  day date primary key,
  total_jobs int not null default 0,
  completed int not null default 0,
  failed int not null default 0,
  retried int not null default 0,
  ai_generated int not null default 0,
  fallback_used int not null default 0,
  avg_latency_ms int,
  avg_quality_score numeric(4,3),
  provider_errors int not null default 0,
  quality_rejections int not null default 0,
  updated_at timestamptz not null default now()
);

alter table public.editorial_image_generations enable row level security;
alter table public.editorial_image_metrics_daily enable row level security;

drop policy if exists "Service role editorial image generations" on public.editorial_image_generations;
create policy "Service role editorial image generations"
  on public.editorial_image_generations
  for all to service_role using (true) with check (true);

drop policy if exists "Service role editorial image metrics" on public.editorial_image_metrics_daily;
create policy "Service role editorial image metrics"
  on public.editorial_image_metrics_daily
  for all to service_role using (true) with check (true);

-- Atomic batch claim with stale processing reclaim
create or replace function public.claim_editorial_image_batch(claim_limit int default 5)
returns setof public.editorial_image_queue
language plpgsql
security definer
as $$
declare
  stale_threshold interval := interval '10 minutes';
begin
  -- Reclaim stale processing jobs
  update public.editorial_image_queue
  set status = 'pending',
      processing_started_at = null,
      error = coalesce(error, '') || ' [reclaimed stale processing]'
  where status = 'processing'
    and processing_started_at is not null
    and processing_started_at < now() - stale_threshold;

  return query
  with candidates as (
    select q.id
    from public.editorial_image_queue q
    where q.status = 'pending'
      and (q.scheduled_at is null or q.scheduled_at <= now())
    order by q.priority desc, q.created_at asc
    limit claim_limit
    for update skip locked
  )
  update public.editorial_image_queue q
  set status = 'processing',
      processing_started_at = now()
  from candidates c
  where q.id = c.id
  returning q.*;
end;
$$;

grant execute on function public.claim_editorial_image_batch(int) to service_role;
