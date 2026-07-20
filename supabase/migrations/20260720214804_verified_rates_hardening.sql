-- Harden verified-rates tables: revoke public grants, provider health, snapshot immutability.

revoke all on public.verified_rate_sources from anon, authenticated, public;
revoke all on public.verified_rate_verification_runs from anon, authenticated, public;
revoke all on public.verified_rate_observations from anon, authenticated, public;
revoke all on public.verified_rate_daily_snapshots from anon, authenticated, public;

grant all on public.verified_rate_sources to service_role;
grant all on public.verified_rate_verification_runs to service_role;
grant all on public.verified_rate_observations to service_role;
grant all on public.verified_rate_daily_snapshots to service_role;

create table if not exists public.verified_rate_provider_health (
  source_id text primary key references public.verified_rate_sources(id) on delete cascade,
  last_attempt_at timestamptz,
  last_success_at timestamptz,
  last_error_code text,
  consecutive_failures integer not null default 0 check (consecutive_failures >= 0),
  circuit_open boolean not null default false,
  kill_switch boolean not null default false,
  updated_at timestamptz not null default now()
);

alter table public.verified_rate_provider_health enable row level security;

drop policy if exists "vr_health_service_role" on public.verified_rate_provider_health;
create policy "vr_health_service_role"
  on public.verified_rate_provider_health for all
  using (auth.role() = 'service_role') with check (auth.role() = 'service_role');

revoke all on public.verified_rate_provider_health from anon, authenticated, public;
grant all on public.verified_rate_provider_health to service_role;

insert into public.verified_rate_sources (id, family, display_name, category_group, eligibility, notes)
values
  ('fuel_iocl_licensed', 'omc_iocl_licensed', 'IOCL licensed feed', 'fuel', 'blocked', 'Requires commercial API + display rights; no HTML/SMS scrape'),
  ('bullion_secondary', 'bullion_licensed_b', 'Licensed bullion secondary', 'bullion', 'blocked', 'Placeholder second family — not operational'),
  ('bullion_tertiary', 'bullion_licensed_c', 'Licensed bullion tertiary', 'bullion', 'blocked', 'Placeholder third family — not operational')
on conflict (id) do nothing;

insert into public.verified_rate_provider_health (source_id)
select id from public.verified_rate_sources
on conflict (source_id) do nothing;

-- Allow multiple historical rows per logical day key; only one accepted at a time.
alter table public.verified_rate_daily_snapshots
  drop constraint if exists verified_rate_daily_snapshots_record_key_key;

create unique index if not exists uq_vr_snap_accepted_record_key
  on public.verified_rate_daily_snapshots (record_key)
  where status = 'accepted';

-- Prevent mutating accepted snapshot economic fields (status→superseded only).
create or replace function public.verified_rate_snapshot_immutability()
returns trigger
language plpgsql
as $$
begin
  if TG_OP = 'UPDATE' and OLD.status = 'accepted' then
    if NEW.price_numeric is distinct from OLD.price_numeric
       or NEW.effective_date is distinct from OLD.effective_date
       or NEW.category is distinct from OLD.category
       or NEW.unit is distinct from OLD.unit
       or NEW.purity is distinct from OLD.purity
       or NEW.tax_basis is distinct from OLD.tax_basis
       or NEW.record_key is distinct from OLD.record_key
       or NEW.currency is distinct from OLD.currency then
      raise exception 'accepted verified_rate_daily_snapshots economic fields are immutable';
    end if;
  end if;
  if TG_OP = 'DELETE' and OLD.status = 'accepted' then
    raise exception 'accepted verified_rate_daily_snapshots cannot be deleted';
  end if;
  return coalesce(NEW, OLD);
end;
$$;

drop trigger if exists trg_vr_snap_immutability on public.verified_rate_daily_snapshots;
create trigger trg_vr_snap_immutability
  before update or delete on public.verified_rate_daily_snapshots
  for each row execute function public.verified_rate_snapshot_immutability();

revoke all on function public.verified_rate_snapshot_immutability() from public;
grant execute on function public.verified_rate_snapshot_immutability() to service_role;
