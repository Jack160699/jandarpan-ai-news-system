-- 024: Normalize newsroom auth schema (production-safe)
-- Canonical roles: super_admin, editor, moderator, journalist

-- ─── newsroom_tenants: add display name (keep config/domains/status) ───
alter table public.newsroom_tenants
  add column if not exists name text;

update public.newsroom_tenants
set name = coalesce(
  nullif(trim(name), ''),
  nullif(config #>> '{branding,nameEn}', ''),
  nullif(config #>> '{branding,shortNameEn}', ''),
  initcap(replace(slug, '-', ' '))
)
where name is null or trim(name) = '';

-- Ensure default Jan Darpan tenant (matches static preset id when possible)
insert into public.newsroom_tenants (id, slug, name, status, domains, config)
values (
  '00000000-0000-4000-8000-000000000003',
  'jan-darpan-chhattisgarh',
  'Jan Darpan Chhattisgarh',
  'active',
  array['localhost', '127.0.0.1', 'newspaper-motion.vercel.app']::text[],
  jsonb_build_object(
    'branding', jsonb_build_object(
      'nameEn', 'Jan Darpan Chhattisgarh',
      'shortNameEn', 'Jan Darpan'
    )
  )
)
on conflict (slug) do update
set
  name = coalesce(excluded.name, public.newsroom_tenants.name),
  status = 'active',
  updated_at = now();

-- ─── tenant_memberships: migrate legacy roles ───
update public.tenant_memberships
set role = 'super_admin', updated_at = now()
where role in ('owner', 'admin', 'super_admin');

update public.tenant_memberships
set role = 'moderator', updated_at = now()
where role in ('publisher', 'moderator');

update public.tenant_memberships
set role = 'journalist', updated_at = now()
where role in ('viewer', 'billing', 'journalist');

update public.tenant_memberships
set role = 'editor', updated_at = now()
where role = 'editor';

-- Normalize unknown roles to journalist (read desk)
update public.tenant_memberships
set role = 'journalist', updated_at = now()
where role not in ('super_admin', 'editor', 'moderator', 'journalist');

alter table public.tenant_memberships
  drop constraint if exists tenant_memberships_role_check;

alter table public.tenant_memberships
  add constraint tenant_memberships_role_check
  check (role in ('super_admin', 'editor', 'moderator', 'journalist'));

comment on column public.tenant_memberships.role is
  'Canonical RBAC: super_admin (full), moderator (publish), editor (write), journalist (read)';

-- ─── FK to auth.users (safe: NOT VALID first) ───
alter table public.tenant_memberships
  drop constraint if exists tenant_memberships_user_id_fkey;

alter table public.tenant_memberships
  add constraint tenant_memberships_user_id_fkey
  foreign key (user_id)
  references auth.users (id)
  on delete cascade
  not valid;

do $$
declare
  orphan_count int;
begin
  select count(*) into orphan_count
  from public.tenant_memberships tm
  left join auth.users u on u.id = tm.user_id
  where u.id is null;

  if orphan_count = 0 then
    alter table public.tenant_memberships
      validate constraint tenant_memberships_user_id_fkey;
  else
    raise notice 'tenant_memberships: % orphan user_id rows — FK left NOT VALID until cleaned', orphan_count;
  end if;
end $$;

create index if not exists idx_tenant_memberships_user_status
  on public.tenant_memberships (user_id, status);

create index if not exists idx_tenant_memberships_email
  on public.tenant_memberships (lower(email));

-- ─── RLS: authenticated read own membership ───
drop policy if exists "Users read own membership" on public.tenant_memberships;
create policy "Users read own membership"
  on public.tenant_memberships
  for select
  to authenticated
  using (user_id = auth.uid() and status = 'active');

drop policy if exists "Super admin read tenant memberships" on public.tenant_memberships;
create policy "Super admin read tenant memberships"
  on public.tenant_memberships
  for select
  to authenticated
  using (
    tenant_id in (
      select me.tenant_id
      from public.tenant_memberships me
      where me.user_id = auth.uid()
        and me.status = 'active'
        and me.role = 'super_admin'
    )
  );

-- Service role retains full access (app server routes)
drop policy if exists "Service role tenant_memberships" on public.tenant_memberships;
create policy "Service role tenant_memberships"
  on public.tenant_memberships
  for all
  to service_role
  using (true)
  with check (true);

comment on table public.newsroom_tenants is
  'Newsroom tenants — slug, name, config (branding), domains for routing';

-- Bootstrap super_admin for production owner (when auth user already exists)
do $$
declare
  v_uid uuid;
  v_tid uuid;
begin
  select id into v_uid
  from auth.users
  where lower(email) = 'shriyanshchandrakar@gmail.com'
  limit 1;

  select id into v_tid
  from public.newsroom_tenants
  where slug = 'jan-darpan-chhattisgarh'
  limit 1;

  if v_uid is not null and v_tid is not null then
    insert into public.tenant_memberships (tenant_id, user_id, email, role, status)
    values (v_tid, v_uid, 'shriyanshchandrakar@gmail.com', 'super_admin', 'active')
    on conflict (tenant_id, user_id) do update
    set
      role = 'super_admin',
      status = 'active',
      email = excluded.email,
      updated_at = now();
  end if;
end $$;
