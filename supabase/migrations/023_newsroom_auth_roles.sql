-- Extend newsroom RBAC roles for secure admin console

alter table public.tenant_memberships
  drop constraint if exists tenant_memberships_role_check;

alter table public.tenant_memberships
  add constraint tenant_memberships_role_check
  check (
    role in (
      'owner',
      'super_admin',
      'admin',
      'publisher',
      'editor',
      'viewer',
      'billing'
    )
  );

comment on column public.tenant_memberships.role is
  'RBAC: super_admin/owner (full), publisher (publish), editor (write), viewer (read), billing';
