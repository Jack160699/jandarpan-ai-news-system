-- Safer stale reclaim for news_ai_queue: track when processing actually started.
-- Reclaim is based on processing_started_at (not enqueue created_at) so long-pending
-- jobs are not reset while a worker is legitimately enriching them.

alter table public.news_ai_queue
  add column if not exists processing_started_at timestamptz;

create index if not exists news_ai_queue_processing_started_idx
  on public.news_ai_queue (processing_started_at)
  where status = 'processing';

drop function if exists public.claim_ai_queue_batch(integer);

create or replace function public.claim_ai_queue_batch(
  claim_limit int default 10,
  stale_reclaim_minutes int default 10
)
returns table (article_id bigint)
language plpgsql
security definer
set search_path = public
as $$
declare
  stale_threshold interval;
begin
  stale_threshold := make_interval(mins => greatest(stale_reclaim_minutes, 1));

  -- Reclaim only jobs whose *processing* started longer ago than the threshold.
  -- Legacy rows without processing_started_at fall back to created_at.
  update public.news_ai_queue
  set status = 'pending',
      processing_started_at = null
  where status = 'processing'
    and (
      (processing_started_at is not null and processing_started_at < now() - stale_threshold)
      or (processing_started_at is null and created_at < now() - stale_threshold)
    );

  -- FOR UPDATE SKIP LOCKED is required: without row locks, concurrent workers can
  -- SELECT the same pending rows and both UPDATE them to processing (duplicate work).
  -- SKIP LOCKED lets other workers take the next available rows instead of blocking.
  return query
  with candidates as (
    select q.id, q.created_at
    from public.news_ai_queue q
    where q.status = 'pending'
    order by q.created_at asc
    limit claim_limit
    for update skip locked
  ),
  claimed as (
    update public.news_ai_queue q
    set status = 'processing',
        processing_started_at = now()
    from candidates c
    where q.id = c.id
    returning q.article_id, q.created_at
  )
  select claimed.article_id
  from claimed
  order by claimed.created_at asc;
end;
$$;

comment on function public.claim_ai_queue_batch(integer, integer) is
  'Atomically claim pending AI enrichment jobs (oldest first, FOR UPDATE SKIP LOCKED).';

revoke all on function public.claim_ai_queue_batch(integer, integer) from public, anon, authenticated;
grant execute on function public.claim_ai_queue_batch(integer, integer) to service_role;
