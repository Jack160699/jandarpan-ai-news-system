-- Display name for newsroom staff (team management UI)

alter table public.tenant_memberships
  add column if not exists display_name text;

comment on column public.tenant_memberships.display_name is
  'Staff display name; synced from auth user_metadata on create';

update public.tenant_memberships tm
set display_name = coalesce(
  nullif(trim(tm.display_name), ''),
  split_part(lower(tm.email), '@', 1)
)
where display_name is null or trim(display_name) = '';
