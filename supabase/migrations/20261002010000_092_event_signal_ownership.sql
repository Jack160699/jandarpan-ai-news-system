-- Migration 092: a news signal belongs to AT MOST ONE news event (deterministic clustering).
--
-- ROOT CAUSE this fixes: the clusterer decided which signals were "already clustered" by reading
-- news_events.signal_ids through the REST API with no ORDER/LIMIT. PostgREST caps that at max_rows (1000) while ~2,900
-- events fall in the 72h window, so ~46% of signals looked unclustered on every run and were re-clustered into NEW
-- events (some 13x in 4h) -- a positive feedback loop. In production: 7,282 events referenced only 4,757 distinct
-- signals, and 2,699 events were pure duplicates of an earlier event.
--
-- THE FIX has three parts, all additive and idempotent:
--   1. news_event_signal_claims: signal_id PRIMARY KEY -> event_id. The database, not an API page, is the authority on
--      "which signal is already in an event". A BEFORE INSERT/UPDATE trigger on news_events claims every signal an event
--      lists; a signal already owned by another event is stripped from the writer's array, and an INSERT left with no
--      signals is skipped. So the same signal can never create a second event, even under concurrent workers.
--   2. jd_unclustered_signals(): a bounded, index-backed anti-join returning only signals that have no claim, with exact
--      columns (no select *, no unbounded list, no dependence on any API row cap).
--   3. Reversible remediation of the EXISTING duplicates: events that own no signals (and have no article) are marked
--      coverage_status='superseded' with the previous status and owner recorded in clustering_metadata. Nothing is deleted.
--      Editorial candidate selection and the active-event matcher ignore 'superseded' events.

-- ---------------------------------------------------------------------------------------------------------------------
-- 1. Ownership table
-- ---------------------------------------------------------------------------------------------------------------------
create table if not exists public.news_event_signal_claims (
  signal_id uuid primary key references public.news_signals(id) on delete cascade,
  event_id  uuid not null,
  claimed_at timestamptz not null default now()
);

create index if not exists news_event_signal_claims_event_idx on public.news_event_signal_claims (event_id);

alter table public.news_event_signal_claims enable row level security;
-- service role only (no policies): the clusterer runs with the service key.

comment on table public.news_event_signal_claims is
  'Authoritative signal -> event ownership. PRIMARY KEY(signal_id) guarantees a signal is in at most one news_events row.';

-- ---------------------------------------------------------------------------------------------------------------------
-- 2. Backfill: ONE owner per signal. Preference: an event that already has a generated article, then one with a
--    candidate-attempt history (so existing backoff/dead-letter state stays attached), then the earliest created.
-- ---------------------------------------------------------------------------------------------------------------------
insert into public.news_event_signal_claims (signal_id, event_id)
select distinct on (sid) sid, e.id
  from public.news_events e
 cross join lateral unnest(e.signal_ids) as sid
  join public.news_signals s on s.id = sid
 order by sid,
          (exists (select 1 from public.generated_articles g where g.event_id = e.id)) desc,
          (exists (select 1 from public.editorial_candidate_attempts a where a.event_id = e.id)) desc,
          e.created_at asc,
          e.id asc
on conflict (signal_id) do nothing;

-- ---------------------------------------------------------------------------------------------------------------------
-- 3. Trigger: claim on insert / signal_ids change; strip signals owned by another event; skip empty inserts
-- ---------------------------------------------------------------------------------------------------------------------
create or replace function public.jd_claim_event_signals()
returns trigger
language plpgsql
as $$
declare
  requested uuid[];
  lost uuid[];
begin
  if new.signal_ids is null or coalesce(array_length(new.signal_ids, 1), 0) = 0 then
    return new;
  end if;

  if tg_op = 'UPDATE' then
    -- only signals this event did not already list need claiming
    select coalesce(array_agg(x), '{}') into requested
      from unnest(new.signal_ids) as x
     where not (x = any (coalesce(old.signal_ids, '{}')));
  else
    requested := new.signal_ids;
  end if;

  if coalesce(array_length(requested, 1), 0) = 0 then
    return new;
  end if;

  -- Claim every EXISTING signal not yet owned (PK conflict => already owned by someone; concurrent claimers serialize on it).
  insert into public.news_event_signal_claims (signal_id, event_id)
  select s.id, new.id
    from public.news_signals s
   where s.id = any (requested)
  on conflict (signal_id) do nothing;

  -- Signals now owned by a DIFFERENT event are removed from this event's list.
  select coalesce(array_agg(c.signal_id), '{}') into lost
    from public.news_event_signal_claims c
   where c.signal_id = any (requested)
     and c.event_id <> new.id;

  if coalesce(array_length(lost, 1), 0) > 0 then
    new.signal_ids := array(select x from unnest(new.signal_ids) as x where not (x = any (lost)));
    new.source_count := greatest(coalesce(array_length(new.signal_ids, 1), 0), 0);
    if tg_op = 'INSERT' and coalesce(array_length(new.signal_ids, 1), 0) = 0 then
      return null; -- every signal already belongs to an existing event: do not create a duplicate event
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists jd_claim_event_signals_trg on public.news_events;
create trigger jd_claim_event_signals_trg
  before insert or update of signal_ids on public.news_events
  for each row execute function public.jd_claim_event_signals();

create or replace function public.jd_release_event_signals()
returns trigger
language plpgsql
as $$
begin
  delete from public.news_event_signal_claims where event_id = old.id;
  return old;
end;
$$;

drop trigger if exists jd_release_event_signals_trg on public.news_events;
create trigger jd_release_event_signals_trg
  after delete on public.news_events
  for each row execute function public.jd_release_event_signals();

-- ---------------------------------------------------------------------------------------------------------------------
-- 4. Bounded, exact-column "unclustered signals" query (replaces the capped REST read of news_events.signal_ids)
-- ---------------------------------------------------------------------------------------------------------------------
create or replace function public.jd_unclustered_signals(p_since timestamptz, p_limit integer default 120)
returns table (
  id uuid,
  source text,
  provider text,
  title text,
  raw_content text,
  article_url text,
  published_at timestamptz,
  category text,
  region text,
  language text,
  geo_metadata jsonb,
  created_at timestamptz
)
language sql
stable
as $$
  select s.id, s.source, s.provider, s.title, s.raw_content, s.article_url, s.published_at,
         s.category, s.region, s.language, s.geo_metadata, s.created_at
    from public.news_signals s
   where (s.published_at >= p_since or (s.published_at is null and s.created_at >= p_since))
     and not exists (select 1 from public.news_event_signal_claims c where c.signal_id = s.id)
   order by s.published_at desc nulls last, s.id
   limit greatest(1, least(coalesce(p_limit, 120), 500));
$$;

revoke all on function public.jd_unclustered_signals(timestamptz, integer) from public, anon, authenticated;
grant execute on function public.jd_unclustered_signals(timestamptz, integer) to service_role;

-- ---------------------------------------------------------------------------------------------------------------------
-- 5. Reversible remediation of the existing duplicates (no deletes)
--    An event that owns NO signal after the backfill and has no generated article is a pure duplicate of its owner.
--    Reverse with:  update news_events set coverage_status = clustering_metadata->>'superseded_prev_status'
--                    where coverage_status = 'superseded' and clustering_metadata ? 'superseded_prev_status';
-- ---------------------------------------------------------------------------------------------------------------------
with owner_of as (
  select e.id as event_id,
         (select c.event_id
            from unnest(e.signal_ids) as sid
            join public.news_event_signal_claims c on c.signal_id = sid
           order by c.claimed_at asc
           limit 1) as owner_event_id
    from public.news_events e
   where coalesce(array_length(e.signal_ids, 1), 0) > 0
     and coalesce(e.coverage_status, 'active') = 'active'
     and not exists (select 1 from public.news_event_signal_claims c where c.event_id = e.id)
     and not exists (select 1 from public.generated_articles g where g.event_id = e.id)
)
update public.news_events e
   set coverage_status = 'superseded',
       clustering_metadata = coalesce(e.clustering_metadata, '{}'::jsonb) || jsonb_build_object(
         'superseded_prev_status', 'active',
         'superseded_by', o.owner_event_id,
         'superseded_reason', 'duplicate_signal_ownership_092',
         'superseded_at', now()
       )
  from owner_of o
 where e.id = o.event_id
   and o.owner_event_id is not null;
