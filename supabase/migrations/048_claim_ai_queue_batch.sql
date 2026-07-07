-- Atomic batch claim for news_ai_queue (FOR UPDATE SKIP LOCKED)
-- Superseded by 049_ai_queue_processing_started_at.sql (processing_started_at + configurable stale reclaim).
-- Kept for migration history on fresh installs that run 048 before 049.

drop function if exists public.claim_ai_queue_batch(integer);

create or replace function public.claim_ai_queue_batch(claim_limit int default 10)
returns table (article_id bigint)
language plpgsql
security definer
set search_path = public
as $$
declare
  stale_threshold interval := interval '10 minutes';
begin
  -- Reclaim stale processing jobs (matches claimAiQueueBatch JS behavior)
  update public.news_ai_queue
  set status = 'pending'
  where status = 'processing'
    and created_at < now() - stale_threshold;

  return query
  with candidates as (
    select q.id
    from public.news_ai_queue q
    where q.status = 'pending'
    order by q.created_at asc
    limit claim_limit
    for update skip locked
  )
  update public.news_ai_queue q
  set status = 'processing'
  from candidates c
  where q.id = c.id
  returning q.article_id;
end;
$$;

comment on function public.claim_ai_queue_batch(integer) is
  'Atomically claim pending AI enrichment jobs; oldest first, skip locked rows.';

revoke all on function public.claim_ai_queue_batch(integer) from public, anon, authenticated;
grant execute on function public.claim_ai_queue_batch(integer) to service_role;
