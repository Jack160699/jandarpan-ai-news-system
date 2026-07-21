-- Verified market rates: observations, verification runs, immutable daily snapshots.
-- History is append-only for accepted daily points; never invent backfill.

create table if not exists public.verified_rate_sources (
  id text primary key,
  family text not null,
  display_name text not null,
  category_group text not null check (category_group in ('fuel', 'bullion')),
  eligibility text not null default 'blocked'
    check (eligibility in ('eligible', 'blocked', 'placeholder')),
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists public.verified_rate_verification_runs (
  id uuid primary key default gen_random_uuid(),
  category text not null,
  geo_scope text not null check (geo_scope in ('city', 'state', 'country')),
  city_slug text,
  state_code text not null default 'CG',
  country_code text not null default 'IN',
  purity text,
  unit text not null,
  tax_basis text not null,
  status text not null
    check (status in ('accepted', 'conflict', 'stale', 'unavailable', 'error', 'blocked')),
  consensus_method text,
  source_count integer not null default 0 check (source_count >= 0),
  participating_families integer not null default 0 check (participating_families >= 0),
  price_numeric numeric(18, 6),
  currency text not null default 'INR',
  spread numeric(18, 6),
  confidence numeric(5, 4),
  anomaly_status text not null default 'none'
    check (anomaly_status in ('none', 'flagged', 'rejected')),
  source_reported_at timestamptz,
  generated_at timestamptz not null default now(),
  effective_date date not null,
  valid_until timestamptz,
  session_label text,
  error_code text,
  redacted_notes text,
  created_at timestamptz not null default now()
);

create index if not exists idx_vr_runs_cat_geo_date
  on public.verified_rate_verification_runs (category, geo_scope, city_slug, effective_date desc);

create index if not exists idx_vr_runs_generated
  on public.verified_rate_verification_runs (generated_at desc);

create table if not exists public.verified_rate_observations (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references public.verified_rate_verification_runs(id) on delete cascade,
  source_id text not null references public.verified_rate_sources(id),
  price_numeric numeric(18, 6) not null check (price_numeric > 0),
  currency text not null default 'INR',
  unit text not null,
  purity text,
  tax_basis text not null,
  source_reported_at timestamptz,
  observed_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists idx_vr_obs_run on public.verified_rate_observations (run_id);

-- One accepted graph point per day/category/geography/purity/unit/tax_basis/session policy key.
create table if not exists public.verified_rate_daily_snapshots (
  id uuid primary key default gen_random_uuid(),
  category text not null,
  geo_scope text not null check (geo_scope in ('city', 'state', 'country')),
  city_slug text,
  state_code text not null default 'CG',
  country_code text not null default 'IN',
  purity text,
  unit text not null,
  tax_basis text not null,
  price_numeric numeric(18, 6) not null check (price_numeric > 0),
  currency text not null default 'INR',
  source_count integer not null default 0 check (source_count >= 0),
  participating_families integer not null default 0 check (participating_families >= 0),
  consensus_method text not null,
  spread numeric(18, 6),
  confidence numeric(5, 4),
  source_reported_at timestamptz,
  generated_at timestamptz not null,
  effective_date date not null,
  valid_until timestamptz,
  status text not null default 'accepted'
    check (status in ('accepted', 'superseded')),
  anomaly_status text not null default 'none'
    check (anomaly_status in ('none', 'flagged', 'rejected')),
  session_label text,
  accepted_run_id uuid references public.verified_rate_verification_runs(id),
  record_key text not null,
  created_at timestamptz not null default now(),
  unique (record_key)
);

create index if not exists idx_vr_snap_cat_geo_date
  on public.verified_rate_daily_snapshots (category, geo_scope, city_slug, effective_date desc)
  where status = 'accepted';

create index if not exists idx_vr_snap_recent
  on public.verified_rate_daily_snapshots (effective_date desc, category);

create index if not exists idx_vr_snap_latest
  on public.verified_rate_daily_snapshots (category, city_slug, purity, effective_date desc);

create index if not exists idx_vr_snap_range_7
  on public.verified_rate_daily_snapshots (category, effective_date)
  where status = 'accepted';

create index if not exists idx_vr_snap_sitemap
  on public.verified_rate_daily_snapshots (category, city_slug, generated_at desc)
  where status = 'accepted';

comment on table public.verified_rate_daily_snapshots is
  'Immutable accepted daily graph points. New verification on same day updates via supersede policy; never invent missing days.';

alter table public.verified_rate_sources enable row level security;
alter table public.verified_rate_verification_runs enable row level security;
alter table public.verified_rate_observations enable row level security;
alter table public.verified_rate_daily_snapshots enable row level security;

drop policy if exists "vr_sources_service_role" on public.verified_rate_sources;
create policy "vr_sources_service_role"
  on public.verified_rate_sources for all
  using (auth.role() = 'service_role') with check (auth.role() = 'service_role');

drop policy if exists "vr_runs_service_role" on public.verified_rate_verification_runs;
create policy "vr_runs_service_role"
  on public.verified_rate_verification_runs for all
  using (auth.role() = 'service_role') with check (auth.role() = 'service_role');

drop policy if exists "vr_obs_service_role" on public.verified_rate_observations;
create policy "vr_obs_service_role"
  on public.verified_rate_observations for all
  using (auth.role() = 'service_role') with check (auth.role() = 'service_role');

drop policy if exists "vr_snap_service_role" on public.verified_rate_daily_snapshots;
create policy "vr_snap_service_role"
  on public.verified_rate_daily_snapshots for all
  using (auth.role() = 'service_role') with check (auth.role() = 'service_role');

revoke all on public.verified_rate_sources from anon, authenticated;
revoke all on public.verified_rate_verification_runs from anon, authenticated;
revoke all on public.verified_rate_observations from anon, authenticated;
revoke all on public.verified_rate_daily_snapshots from anon, authenticated;
grant all on public.verified_rate_sources to service_role;
grant all on public.verified_rate_verification_runs to service_role;
grant all on public.verified_rate_observations to service_role;
grant all on public.verified_rate_daily_snapshots to service_role;

insert into public.verified_rate_sources (id, family, display_name, category_group, eligibility, notes)
values
  ('fuel_ulip_hpcl', 'omc_ulip', 'HPCL via ULIP', 'fuel', 'blocked', 'Requires ULIP access + display rights'),
  ('bullion_ibja', 'ibja', 'IBJA Rates API', 'bullion', 'blocked', 'Requires ACCESS_TOKEN + written display consent')
on conflict (id) do nothing;
