-- Migration 082: pipeline foundation — run leases + AI queue state machine
--
-- 1. worker_run_leases: real overlap protection. acquireWorkerRunLock() in
--    run-guard.ts was hard-bypassed (`return true; // bypass lock`) because the
--    Redis window lock never released, so a 10-minute cadence would have let
--    concurrent editorial runs generate the same events twice.
--
-- 2. news_ai_queue: proper states, attempts, backoff, leases, dead-letter.
--    Verified 2026-09-29: 6,194 pending, 5,529 (89%) older than 48h, nothing
--    draining it since 2026-09-19, claim function took OLDEST first and the retry
--    "backoff" lived in the error text where the claim function ignored it.

-- ============================================================
-- PART 1: run leases
-- ============================================================

create table if not exists public.worker_run_leases (
  lease_key    text primary key,
  owner        text not null,
  acquired_at  timestamptz not null default now(),
  heartbeat_at timestamptz not null default now(),
  expires_at   timestamptz not null,
  run_count    bigint not null default 0
);

alter table public.worker_run_leases enable row level security;

create or replace function public.acquire_run_lease(
  p_key text,
  p_owner text,
  p_ttl_seconds integer
) returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_acquired boolean;
begin
  insert into public.worker_run_leases as l (lease_key, owner, acquired_at, heartbeat_at, expires_at, run_count)
  values (p_key, p_owner, now(), now(), now() + make_interval(secs => greatest(p_ttl_seconds, 5)), 1)
  on conflict (lease_key) do update
     set owner        = excluded.owner,
         acquired_at  = now(),
         heartbeat_at = now(),
         expires_at   = excluded.expires_at,
         run_count    = l.run_count + 1
   where l.expires_at < now()
  returning true into v_acquired;

  return coalesce(v_acquired, false);
end;
$$;

create or replace function public.release_run_lease(
  p_key text,
  p_owner text
) returns void
language sql
security definer
set search_path = public
as $$
  update public.worker_run_leases
     set expires_at = now(), heartbeat_at = now()
   where lease_key = p_key and owner = p_owner;
$$;

revoke all on function public.acquire_run_lease(text, text, integer) from public, anon, authenticated;
revoke all on function public.release_run_lease(text, text) from public, anon, authenticated;
grant execute on function public.acquire_run_lease(text, text, integer) to service_role;
grant execute on function public.release_run_lease(text, text) to service_role;

-- ============================================================
-- PART 2: news_ai_queue state machine
-- ============================================================

alter table public.news_ai_queue
  add column if not exists attempts         integer     not null default 0,
  add column if not exists next_attempt_at  timestamptz,
  add column if not exists lease_owner      text,
  add column if not exists lease_expires_at timestamptz,
  add column if not exists failure_class    text,
  add column if not exists reject_reason    text,
  add column if not exists updated_at       timestamptz not null default now();

alter table public.news_ai_queue drop constraint if exists news_ai_queue_status_check;
alter table public.news_ai_queue
  add constraint news_ai_queue_status_check check (status = any (array[
    'pending', 'processing', 'completed', 'failed',
    'dead', 'quarantined',
    'rejected_stale', 'rejected_duplicate', 'rejected_geo', 'rejected_quality'
  ]));

-- Claim path: freshest pending first, honouring backoff.
create index if not exists news_ai_queue_claim_idx
  on public.news_ai_queue (next_attempt_at nulls first, created_at desc)
  where status = 'pending';

create index if not exists news_ai_queue_terminal_idx
  on public.news_ai_queue (status, updated_at desc)
  where status <> 'pending';

-- Exponential backoff in seconds: 60, 120, 240 ... capped at 1h.
create or replace function public.ai_queue_backoff_seconds(p_attempts integer)
returns integer
language sql
immutable
as $$
  select least(3600, 60 * power(2, greatest(p_attempts - 1, 0))::integer)
$$;

-- Bounded stale sweep: anything pending whose source article is older than the
-- freshness window can never become a fresh story — reject it, do not spend AI on it.
create or replace function public.sweep_stale_ai_queue(
  p_stale_hours integer default 48,
  p_limit integer default 2000
) returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer;
begin
  with stale as (
    select q.id
      from public.news_ai_queue q
      join public.news_articles a on a.id = q.article_id
     where q.status = 'pending'
       and coalesce(a.published_at, q.created_at) < now() - make_interval(hours => p_stale_hours)
     limit p_limit
     for update of q skip locked
  )
  update public.news_ai_queue q
     set status = 'rejected_stale',
         reject_reason = 'source_older_than_' || p_stale_hours || 'h',
         processing_started_at = null,
         updated_at = now()
    from stale
   where q.id = stale.id;

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

-- Replaces the oldest-first claim. Same signature, so process.ts is unchanged.
create or replace function public.claim_ai_queue_batch(
  claim_limit integer default 10,
  stale_reclaim_minutes integer default 10
) returns table(article_id bigint)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_stale interval := make_interval(mins => greatest(stale_reclaim_minutes, 1));
  v_max_attempts constant integer := 5;
begin
  -- Chip away at the stale backlog on every claim.
  perform public.sweep_stale_ai_queue(48, 2000);

  -- Expired leases: retry with backoff, or dead-letter after v_max_attempts.
  update public.news_ai_queue q
     set status = case when q.attempts >= v_max_attempts then 'dead' else 'pending' end,
         failure_class = coalesce(q.failure_class, 'lease_expired'),
         next_attempt_at = case
           when q.attempts >= v_max_attempts then null
           else now() + make_interval(secs => public.ai_queue_backoff_seconds(q.attempts))
         end,
         processing_started_at = null,
         lease_owner = null,
         lease_expires_at = null,
         updated_at = now()
   where q.status = 'processing'
     and (
       (q.processing_started_at is not null and q.processing_started_at < now() - v_stale)
       or (q.processing_started_at is null and q.created_at < now() - v_stale)
     );

  return query
  with candidates as (
    select q.id, coalesce(a.published_at, q.created_at) as fresh_at
      from public.news_ai_queue q
      join public.news_articles a on a.id = q.article_id
     where q.status = 'pending'
       and (q.next_attempt_at is null or q.next_attempt_at <= now())
       and coalesce(a.published_at, q.created_at) >= now() - interval '48 hours'
     order by coalesce(a.published_at, q.created_at) desc
     limit claim_limit
     for update of q skip locked
  ),
  claimed as (
    update public.news_ai_queue q
       set status = 'processing',
           processing_started_at = now(),
           lease_expires_at = now() + v_stale,
           attempts = q.attempts + 1,
           updated_at = now()
      from candidates c
     where q.id = c.id
    returning q.article_id, c.fresh_at
  )
  select claimed.article_id from claimed order by claimed.fresh_at desc;
end;
$$;

comment on column public.news_ai_queue.status is
  'pending|processing|completed|failed|dead|quarantined|rejected_stale|rejected_duplicate|rejected_geo|rejected_quality. Terminal: completed, dead, rejected_*. quarantined = needs evaluation (e.g. unknown geography).';
