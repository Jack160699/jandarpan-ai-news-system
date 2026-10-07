-- Migration 101: publisher revenue-share LEDGER (architecture only; feature-flagged OFF in code)
--
-- No payout is possible and no revenue is invented by this migration. It creates an append-only, double-entry-style ledger so that when
-- revenue sharing is switched on, every rupee is traceable: money moves between buckets (pending -> approved -> payable -> paid) in
-- integer paise, never in floats, and every move is an immutable row. Corrections are new rows (adjustment / reversal), never edits.
--
--   publisher_revenue_accounts   one per contributor (author) with a share rate and a payout-readiness flag
--   publisher_revenue_events     the append-only ledger (the only source of truth for balances)
--   publisher_revenue_daily      a rebuildable per-article/day rollup for dashboards (never a source of truth)
--   publisher_payouts            payout batches (a payout row exists only for money that left `payable`)
--
-- RLS: a contributor may READ their own account and rollup; nobody but service_role can write anything.

create table if not exists public.publisher_revenue_accounts (
  user_id          uuid primary key references auth.users (id) on delete restrict,
  share_bps        integer not null default 0 check (share_bps between 0 and 10000),   -- basis points of attributed revenue; 0 = earns nothing
  status           text not null default 'inactive' check (status in ('inactive', 'active', 'suspended')),
  payout_ready     boolean not null default false,                                      -- set only after payout details are verified outside the app
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create table if not exists public.publisher_revenue_events (
  id                  bigint generated always as identity primary key,
  account_id          uuid not null references public.publisher_revenue_accounts (user_id) on delete restrict,
  article_id          uuid,
  kind                text not null check (kind in ('accrual', 'approval', 'release_payable', 'payout', 'adjustment', 'reversal')),
  from_bucket         text check (from_bucket in ('pending', 'approved', 'payable')),
  to_bucket           text check (to_bucket in ('pending', 'approved', 'payable', 'paid')),
  amount_paise        bigint not null check (amount_paise > 0),
  reverses_event_id   bigint references public.publisher_revenue_events (id),
  payout_id           uuid,
  idempotency_key     text not null,
  reason              text,
  actor_id            uuid,
  actor_kind          text not null check (actor_kind in ('system', 'admin')),
  created_at          timestamptz not null default now(),
  constraint publisher_revenue_events_moves_money check (from_bucket is not null or to_bucket is not null),
  constraint publisher_revenue_events_real_move check (from_bucket is distinct from to_bucket),
  constraint publisher_revenue_events_shape check (
    (kind = 'accrual'         and from_bucket is null      and to_bucket = 'pending') or
    (kind = 'approval'        and from_bucket = 'pending'  and to_bucket = 'approved') or
    (kind = 'release_payable' and from_bucket = 'approved' and to_bucket = 'payable') or
    (kind = 'payout'          and from_bucket = 'payable'  and to_bucket = 'paid') or
    kind in ('adjustment', 'reversal')
  ),
  constraint publisher_revenue_events_adjustment_needs_reason check (kind not in ('adjustment', 'reversal') or (reason is not null and length(btrim(reason)) >= 5)),
  constraint publisher_revenue_events_adjustment_needs_actor check (kind not in ('adjustment', 'reversal', 'approval', 'release_payable', 'payout') or actor_id is not null),
  constraint publisher_revenue_events_reversal_links check ((kind = 'reversal') = (reverses_event_id is not null)),
  constraint publisher_revenue_events_payout_links check ((kind = 'payout') = (payout_id is not null))
);
create unique index if not exists publisher_revenue_events_idem on public.publisher_revenue_events (idempotency_key);
-- an event can be reversed at most once
create unique index if not exists publisher_revenue_events_reversed_once on public.publisher_revenue_events (reverses_event_id) where reverses_event_id is not null;
create index if not exists publisher_revenue_events_account_idx on public.publisher_revenue_events (account_id, created_at desc);
create index if not exists publisher_revenue_events_article_idx on public.publisher_revenue_events (article_id) where article_id is not null;

create table if not exists public.publisher_payouts (
  id               uuid primary key default gen_random_uuid(),
  account_id       uuid not null references public.publisher_revenue_accounts (user_id) on delete restrict,
  amount_paise     bigint not null check (amount_paise > 0),
  status           text not null default 'recorded' check (status in ('recorded', 'settled', 'failed')),
  external_ref     text,
  created_by       uuid not null,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create index if not exists publisher_payouts_account_idx on public.publisher_payouts (account_id, created_at desc);

create table if not exists public.publisher_revenue_daily (
  day              date not null,
  article_id       uuid not null,
  account_id       uuid not null references public.publisher_revenue_accounts (user_id) on delete cascade,
  views            integer not null default 0 check (views >= 0),
  attributed_paise bigint not null default 0 check (attributed_paise >= 0),
  updated_at       timestamptz not null default now(),
  primary key (day, article_id)
);
create index if not exists publisher_revenue_daily_account_idx on public.publisher_revenue_daily (account_id, day desc);

-- ---------------------------------------------------------------------------------------------------------------------
-- Ledger integrity (enforced in the database, not only in code)
-- ---------------------------------------------------------------------------------------------------------------------
drop trigger if exists publisher_revenue_events_append_only on public.publisher_revenue_events;
create trigger publisher_revenue_events_append_only before update or delete on public.publisher_revenue_events
  for each row execute function public.platform_reject_mutation();

-- A bucket can never go negative: money cannot be approved, released or paid out unless it is actually in the source bucket.
create or replace function public.publisher_revenue_no_overdraw()
returns trigger language plpgsql as $$
declare
  bal bigint;
begin
  if new.from_bucket is null then
    return new;
  end if;
  -- serialise concurrent moves on the same account so two parallel payouts cannot both pass the check
  perform pg_advisory_xact_lock(hashtext('publisher_revenue:' || new.account_id::text));
  select coalesce(sum(case when to_bucket = new.from_bucket then amount_paise else 0 end), 0)
       - coalesce(sum(case when from_bucket = new.from_bucket then amount_paise else 0 end), 0)
    into bal
    from public.publisher_revenue_events
   where account_id = new.account_id;
  if bal < new.amount_paise then
    raise exception 'insufficient % balance: have %, need %', new.from_bucket, bal, new.amount_paise using errcode = '23514';
  end if;
  return new;
end;
$$;
drop trigger if exists publisher_revenue_events_no_overdraw on public.publisher_revenue_events;
create trigger publisher_revenue_events_no_overdraw before insert on public.publisher_revenue_events
  for each row execute function public.publisher_revenue_no_overdraw();

-- A payout can only be recorded for an account that is active and payout-ready.
create or replace function public.publisher_revenue_payout_guard()
returns trigger language plpgsql as $$
begin
  if new.kind = 'payout' and not exists (select 1 from public.publisher_revenue_accounts a where a.user_id = new.account_id and a.status = 'active' and a.payout_ready) then
    raise exception 'account is not active and payout-ready' using errcode = '23514';
  end if;
  return new;
end;
$$;
drop trigger if exists publisher_revenue_events_payout_guard on public.publisher_revenue_events;
create trigger publisher_revenue_events_payout_guard before insert on public.publisher_revenue_events
  for each row execute function public.publisher_revenue_payout_guard();

-- Balances are always derived from the ledger.
create or replace view public.publisher_revenue_balances with (security_invoker = true) as
select
  account_id,
  coalesce(sum(case when to_bucket = 'pending' then amount_paise else 0 end) - sum(case when from_bucket = 'pending' then amount_paise else 0 end), 0)::bigint as pending_paise,
  coalesce(sum(case when to_bucket = 'approved' then amount_paise else 0 end) - sum(case when from_bucket = 'approved' then amount_paise else 0 end), 0)::bigint as approved_paise,
  coalesce(sum(case when to_bucket = 'payable' then amount_paise else 0 end) - sum(case when from_bucket = 'payable' then amount_paise else 0 end), 0)::bigint as payable_paise,
  coalesce(sum(case when to_bucket = 'paid' then amount_paise else 0 end), 0)::bigint as paid_paise
from public.publisher_revenue_events
group by account_id;

-- ---------------------------------------------------------------------------------------------------------------------
-- RLS: contributors read their own rows; only the server (service_role) writes.
-- ---------------------------------------------------------------------------------------------------------------------
alter table public.publisher_revenue_accounts enable row level security;
alter table public.publisher_revenue_events enable row level security;
alter table public.publisher_payouts enable row level security;
alter table public.publisher_revenue_daily enable row level security;

drop policy if exists publisher_revenue_accounts_select_own on public.publisher_revenue_accounts;
create policy publisher_revenue_accounts_select_own on public.publisher_revenue_accounts for select to authenticated using (auth.uid() = user_id);

drop policy if exists publisher_revenue_events_select_own on public.publisher_revenue_events;
create policy publisher_revenue_events_select_own on public.publisher_revenue_events for select to authenticated using (auth.uid() = account_id);

drop policy if exists publisher_payouts_select_own on public.publisher_payouts;
create policy publisher_payouts_select_own on public.publisher_payouts for select to authenticated using (auth.uid() = account_id);

drop policy if exists publisher_revenue_daily_select_own on public.publisher_revenue_daily;
create policy publisher_revenue_daily_select_own on public.publisher_revenue_daily for select to authenticated using (auth.uid() = account_id);

revoke all on public.publisher_revenue_accounts, public.publisher_revenue_events, public.publisher_payouts, public.publisher_revenue_daily from anon;
revoke insert, update, delete on public.publisher_revenue_accounts, public.publisher_revenue_events, public.publisher_payouts, public.publisher_revenue_daily from authenticated;
revoke all on public.publisher_revenue_balances from anon;
grant select on public.publisher_revenue_balances to authenticated;
