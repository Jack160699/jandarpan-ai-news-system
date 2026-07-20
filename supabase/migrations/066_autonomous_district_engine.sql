-- Autonomous District Editorial Engine foundation tables
-- Forward-only; no destructive drops.
-- Shadow rollout does not increase publish volume; tables support planning/ledger only.

-- Per-district daily coverage vs target
create table if not exists public.district_coverage_daily (
  id uuid primary key default gen_random_uuid(),
  district_slug text not null,
  day date not null,
  target integer not null default 0,
  published integer not null default 0,
  deficit integer not null default 0,
  tier text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint district_coverage_daily_tier_chk check (
    tier in ('high', 'medium', 'low')
  ),
  constraint district_coverage_daily_district_day_uidx unique (district_slug, day)
);

create index if not exists district_coverage_daily_district_idx
  on public.district_coverage_daily (district_slug);

create index if not exists district_coverage_daily_day_idx
  on public.district_coverage_daily (day);

-- Global GNews quota ledger (intentional global — provider quota is account-wide)
create table if not exists public.gnews_quota_ledger (
  day date primary key,
  requests_used integer not null default 0,
  requests_limit integer not null default 100,
  reserve_remaining integer not null default 0,
  metadata jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create index if not exists gnews_quota_ledger_day_idx
  on public.gnews_quota_ledger (day);

-- Singleton autonomous rollout state
create table if not exists public.autonomous_rollout_state (
  id integer primary key default 1,
  stage text not null default 'shadow',
  updated_at timestamptz not null default now(),
  reason text null,
  metadata jsonb not null default '{}'::jsonb,
  constraint autonomous_rollout_state_singleton_chk check (id = 1),
  constraint autonomous_rollout_state_stage_chk check (
    stage in ('shadow', 'stage_1', 'stage_2', 'stage_3')
  )
);

insert into public.autonomous_rollout_state (id, stage, reason)
values (1, 'shadow', 'foundation default — plan only, no publish volume increase')
on conflict (id) do nothing;

-- Per-article claim evidence ledger
create table if not exists public.article_evidence_ledger (
  article_id uuid primary key,
  ledger jsonb not null default '{"claims":[]}'::jsonb,
  updated_at timestamptz not null default now()
);

create index if not exists article_evidence_ledger_updated_idx
  on public.article_evidence_ledger (updated_at);

-- RLS: service role full; authenticated read (admin pattern, 065-style)
alter table public.district_coverage_daily enable row level security;
alter table public.gnews_quota_ledger enable row level security;
alter table public.autonomous_rollout_state enable row level security;
alter table public.article_evidence_ledger enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'district_coverage_daily'
      and policyname = 'Service role district coverage daily'
  ) then
    create policy "Service role district coverage daily"
      on public.district_coverage_daily
      for all
      to service_role
      using (true)
      with check (true);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'district_coverage_daily'
      and policyname = 'Authenticated read district coverage daily'
  ) then
    create policy "Authenticated read district coverage daily"
      on public.district_coverage_daily
      for select
      to authenticated
      using (true);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'gnews_quota_ledger'
      and policyname = 'Service role gnews quota ledger'
  ) then
    create policy "Service role gnews quota ledger"
      on public.gnews_quota_ledger
      for all
      to service_role
      using (true)
      with check (true);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'gnews_quota_ledger'
      and policyname = 'Authenticated read gnews quota ledger'
  ) then
    create policy "Authenticated read gnews quota ledger"
      on public.gnews_quota_ledger
      for select
      to authenticated
      using (true);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'autonomous_rollout_state'
      and policyname = 'Service role autonomous rollout state'
  ) then
    create policy "Service role autonomous rollout state"
      on public.autonomous_rollout_state
      for all
      to service_role
      using (true)
      with check (true);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'autonomous_rollout_state'
      and policyname = 'Authenticated read autonomous rollout state'
  ) then
    create policy "Authenticated read autonomous rollout state"
      on public.autonomous_rollout_state
      for select
      to authenticated
      using (true);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'article_evidence_ledger'
      and policyname = 'Service role article evidence ledger'
  ) then
    create policy "Service role article evidence ledger"
      on public.article_evidence_ledger
      for all
      to service_role
      using (true)
      with check (true);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'article_evidence_ledger'
      and policyname = 'Authenticated read article evidence ledger'
  ) then
    create policy "Authenticated read article evidence ledger"
      on public.article_evidence_ledger
      for select
      to authenticated
      using (true);
  end if;
end $$;

comment on table public.district_coverage_daily is
  'Autonomous engine: per-district daily coverage vs target (shadow-safe planning).';
comment on table public.gnews_quota_ledger is
  'Autonomous engine: global GNews daily quota ledger (account-wide).';
comment on table public.autonomous_rollout_state is
  'Autonomous engine: singleton rollout stage (default shadow).';
comment on table public.article_evidence_ledger is
  'Autonomous engine: per-article claim evidence JSON ledger.';
