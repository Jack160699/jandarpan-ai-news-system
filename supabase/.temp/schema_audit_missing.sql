select json_build_object(
  'expected_tables_missing', (
    select coalesce(json_agg(t order by t), '[]'::json)
    from unnest(array[
      'ingestion_logs',
      'ingestion_failures',
      'rss_source_health',
      'ingestion_logs',
      'editorial_workflow_comments'
    ]) as t
    where not exists (
      select 1 from information_schema.tables
      where table_schema = 'public' and table_name = t
    )
  ),
  'intelligence_embeddings_missing_cols', (
    select coalesce(json_agg(c order by c), '[]'::json)
    from unnest(array['embedding_json', 'updated_at']) as c
    where not exists (
      select 1 from information_schema.columns
      where table_schema = 'public'
        and table_name = 'intelligence_embeddings'
        and column_name = c
    )
  ),
  'source_reputation_columns', (
    select coalesce(json_agg(column_name order by ordinal_position), '[]'::json)
    from information_schema.columns
    where table_schema = 'public' and table_name = 'source_reputation_memory'
  ),
  'indexes_tenant_memberships', (
    select coalesce(json_agg(indexname order by indexname), '[]'::json)
    from pg_indexes
    where schemaname = 'public' and tablename = 'tenant_memberships'
  ),
  'indexes_intelligence', (
    select coalesce(json_agg(indexname order by indexname), '[]'::json)
    from pg_indexes
    where schemaname = 'public' and tablename = 'intelligence_embeddings'
  ),
  'schema_checksum', (
    select md5(string_agg(
      table_name || ':' || column_name || ':' || data_type || ':' || is_nullable,
      '|' order by table_name, ordinal_position
    ))
    from information_schema.columns
    where table_schema = 'public'
      and table_name in (
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
) as missing_audit;
