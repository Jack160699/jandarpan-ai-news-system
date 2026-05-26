-- Team management: reinforce tenant-scoped RLS (read paths for authenticated)

comment on table public.tenant_memberships is
  'Newsroom staff memberships — managed via admin API (service role). RLS: own row + super_admin tenant read.';

-- Super admins may update memberships in their tenant (client-side direct access if ever used)
drop policy if exists "Super admin update tenant memberships" on public.tenant_memberships;
create policy "Super admin update tenant memberships"
  on public.tenant_memberships
  for update
  to authenticated
  using (
    tenant_id in (
      select me.tenant_id
      from public.tenant_memberships me
      where me.user_id = auth.uid()
        and me.status = 'active'
        and me.role = 'super_admin'
    )
  )
  with check (
    tenant_id in (
      select me.tenant_id
      from public.tenant_memberships me
      where me.user_id = auth.uid()
        and me.status = 'active'
        and me.role = 'super_admin'
    )
  );
