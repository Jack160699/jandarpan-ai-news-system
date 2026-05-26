-- Team membership schema sync: columns, indexes, updated_at trigger, PostgREST reload
-- Safe to re-run (IF NOT EXISTS / idempotent alters)

-- ─── Columns ───
alter table public.tenant_memberships
  add column if not exists display_name text,
  add column if not exists avatar_url text,
  add column if not exists permissions jsonb not null default '{}'::jsonb,
  add column if not exists metadata jsonb not null default '{}'::jsonb,
  add column if not exists joined_at timestamptz default now();

comment on column public.tenant_memberships.display_name is
  'Staff display name; fallback to auth user_metadata.full_name or email local-part';
comment on column public.tenant_memberships.avatar_url is
  'Optional avatar URL for team directory';
comment on column public.tenant_memberships.permissions is
  'Optional per-member permission overrides (JSON object)';
comment on column public.tenant_memberships.metadata is
  'Extensible metadata (e.g. full_name when display_name column unavailable)';
comment on column public.tenant_memberships.joined_at is
  'When the user joined this tenant (defaults to created_at for legacy rows)';

-- Backfill display_name from email local-part
update public.tenant_memberships tm
set display_name = coalesce(
  nullif(trim(tm.display_name), ''),
  nullif(trim(tm.metadata->>'full_name'), ''),
  split_part(lower(tm.email), '@', 1)
)
where display_name is null or trim(display_name) = '';

-- Backfill joined_at from created_at
update public.tenant_memberships
set joined_at = coalesce(joined_at, created_at)
where joined_at is null;

-- Ensure status default (column already exists in 018; normalize nulls)
update public.tenant_memberships
set status = 'active'
where status is null or trim(status) = '';

alter table public.tenant_memberships
  alter column status set default 'active';

-- ─── Unique constraint (018 may already have this) ───
do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'tenant_memberships_tenant_id_user_id_key'
      and conrelid = 'public.tenant_memberships'::regclass
  ) then
    alter table public.tenant_memberships
      add constraint tenant_memberships_tenant_id_user_id_key unique (tenant_id, user_id);
  end if;
end $$;

-- ─── Indexes ───
create index if not exists idx_tenant_memberships_tenant_status
  on public.tenant_memberships (tenant_id, status);

create index if not exists idx_tenant_memberships_tenant_role
  on public.tenant_memberships (tenant_id, role);

create index if not exists idx_tenant_memberships_joined_at
  on public.tenant_memberships (tenant_id, joined_at desc);

-- ─── updated_at trigger ───
create or replace function public.set_tenant_memberships_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_tenant_memberships_updated_at on public.tenant_memberships;
create trigger trg_tenant_memberships_updated_at
  before update on public.tenant_memberships
  for each row
  execute function public.set_tenant_memberships_updated_at();

-- ─── RPC for app-triggered PostgREST reload (service role) ───
create or replace function public.reload_postgrest_schema()
returns void
language sql
security definer
set search_path = public
as $$
  notify pgrst, 'reload schema';
$$;

revoke all on function public.reload_postgrest_schema() from public;
grant execute on function public.reload_postgrest_schema() to service_role;

-- ─── PostgREST schema cache reload ───
notify pgrst, 'reload schema';
