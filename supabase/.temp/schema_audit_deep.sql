-- Deep schema audit (read-only)
select json_build_object(
  'orphan_tenant_memberships_fk', (
    select count(*)::int
    from public.tenant_memberships tm
    left join auth.users u on u.id = tm.user_id
    where u.id is null
  ),
  'tenant_memberships_constraints', (
    select coalesce(json_agg(json_build_object(
      'name', con.conname,
      'type', contype,
      'validated', con.convalidated
    ) order by con.conname), '[]'::json)
    from pg_constraint con
    join pg_class rel on rel.oid = con.conrelid
    join pg_namespace nsp on nsp.oid = rel.relnamespace
    where nsp.nspname = 'public' and rel.relname = 'tenant_memberships'
  ),
  'tenant_memberships_policies', (
    select coalesce(json_agg(json_build_object(
      'name', pol.polname,
      'roles', (
        select coalesce(array_agg(rol.rolname), '{}')
        from pg_roles rol
        where rol.oid = any(pol.polroles)
      ),
      'cmd', case pol.polcmd when 'r' then 'SELECT' when 'a' then 'INSERT' when 'w' then 'UPDATE' when 'd' then 'DELETE' when '*' then 'ALL' end
    ) order by pol.polname), '[]'::json)
    from pg_policy pol
    join pg_class cls on cls.oid = pol.polrelid
    join pg_namespace nsp on nsp.oid = cls.relnamespace
    where nsp.nspname = 'public' and cls.relname = 'tenant_memberships'
  ),
  'generated_articles_columns', (
    select coalesce(json_agg(column_name order by ordinal_position), '[]'::json)
    from information_schema.columns
    where table_schema = 'public' and table_name = 'generated_articles'
  ),
  'intelligence_embeddings_columns', (
    select coalesce(json_agg(column_name order by ordinal_position), '[]'::json)
    from information_schema.columns
    where table_schema = 'public' and table_name = 'intelligence_embeddings'
  ),
  'dam_assets_columns', (
    select coalesce(json_agg(column_name order by ordinal_position), '[]'::json)
    from information_schema.columns
    where table_schema = 'public' and table_name = 'dam_assets'
  ),
  'newsroom_editor_locks_columns', (
    select coalesce(json_agg(column_name order by ordinal_position), '[]'::json)
    from information_schema.columns
    where table_schema = 'public' and table_name = 'newsroom_editor_locks'
  ),
  'reader_analytics_columns', (
    select coalesce(json_agg(column_name order by ordinal_position), '[]'::json)
    from information_schema.columns
    where table_schema = 'public' and table_name = 'reader_analytics_events'
  ),
  'legacy_tenants_table', (
    select exists (
      select 1 from information_schema.tables
      where table_schema = 'public' and table_name = 'tenants'
    )
  ),
  'newsroom_tenants_columns', (
    select coalesce(json_agg(column_name order by ordinal_position), '[]'::json)
    from information_schema.columns
    where table_schema = 'public' and table_name = 'newsroom_tenants'
  ),
  'schema_migrations', (
    select coalesce(json_agg(version order by version), '[]'::json)
    from supabase_migrations.schema_migrations
  ),
  'grants_tenant_memberships', (
    select coalesce(json_agg(json_build_object(
      'grantee', grantee,
      'privilege', privilege_type
    ) order by grantee, privilege_type), '[]'::json)
    from information_schema.role_table_grants
    where table_schema = 'public' and table_name = 'tenant_memberships'
  )
) as deep_audit;
