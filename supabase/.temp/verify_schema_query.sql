select json_build_object(
  'health', public.get_schema_health(),
  'migrations', (
    select coalesce(json_agg(version order by version), '[]'::json)
    from supabase_migrations.schema_migrations
    where version >= '030'
  )
) as report;
