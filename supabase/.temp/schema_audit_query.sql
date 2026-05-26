-- Schema audit snapshot (read-only)
select json_build_object(
  'tables', (
    select coalesce(json_agg(table_name order by table_name), '[]'::json)
    from information_schema.tables
    where table_schema = 'public' and table_type = 'BASE TABLE'
  ),
  'tenant_memberships_columns', (
    select coalesce(json_agg(json_build_object(
      'column', column_name,
      'type', data_type,
      'nullable', is_nullable,
      'default', column_default
    ) order by ordinal_position), '[]'::json)
    from information_schema.columns
    where table_schema = 'public' and table_name = 'tenant_memberships'
  ),
  'generated_articles_workflow_cols', (
    select coalesce(json_agg(column_name order by ordinal_position), '[]'::json)
    from information_schema.columns
    where table_schema = 'public' and table_name = 'generated_articles'
      and column_name like 'workflow%'
  ),
  'functions', (
    select coalesce(json_agg(p.proname order by p.proname), '[]'::json)
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname in (
        'reload_postgrest_schema',
        'match_intelligence_embeddings',
        'set_tenant_memberships_updated_at'
      )
  ),
  'extensions', (
    select coalesce(json_agg(extname order by extname), '[]'::json)
    from pg_extension
    where extname in ('vector', 'pgcrypto', 'uuid-ossp')
  ),
  'rls_enabled', (
    select coalesce(json_agg(json_build_object(
      'table', c.relname,
      'rls', c.relrowsecurity
    ) order by c.relname), '[]'::json)
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relkind = 'r'
      and c.relname in (
        'tenant_memberships',
        'newsroom_tenants',
        'generated_articles',
        'editorial_workflow_events',
        'intelligence_embeddings',
        'dam_assets',
        'newsroom_editor_locks',
        'reader_analytics_events'
      )
  )
) as audit;
