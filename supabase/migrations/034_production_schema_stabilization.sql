-- 034: Production schema stabilization (idempotent, data-preserving)
-- Reconciles drift where migration history exists but objects/columns are missing.
-- Safe to re-run. Does NOT drop editorial, auth, or tenant data.

-- ═══════════════════════════════════════════════════════════════════════════════
-- 1. Schema registry + health RPC (migration status dashboard / verify scripts)
-- ═══════════════════════════════════════════════════════════════════════════════

create table if not exists public.schema_registry (
  key text primary key,
  value text not null,
  updated_at timestamptz not null default now()
);

comment on table public.schema_registry is
  'Expected schema checksums and migration metadata for health checks';

alter table public.schema_registry enable row level security;

drop policy if exists "Service role schema_registry" on public.schema_registry;
create policy "Service role schema_registry"
  on public.schema_registry for all to service_role using (true) with check (true);

revoke all on table public.schema_registry from anon, authenticated;
grant select, insert, update, delete on table public.schema_registry to service_role;

-- ═══════════════════════════════════════════════════════════════════════════════
-- 2. Ingestion pipeline tables (missing on production despite 002/003 applied)
-- ═══════════════════════════════════════════════════════════════════════════════

create table if not exists public.ingestion_logs (
  id uuid primary key default gen_random_uuid(),
  status text not null default 'success',
  total_fetched int not null default 0,
  total_valid int not null default 0,
  inserted int not null default 0,
  skipped_duplicates int not null default 0,
  failed_validation int not null default 0,
  category_stats jsonb default '{}'::jsonb,
  provider_stats jsonb default '{}'::jsonb,
  provider_errors jsonb default '[]'::jsonb,
  duration_ms int,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists ingestion_logs_created_at_idx
  on public.ingestion_logs (created_at desc);

create table if not exists public.ingestion_failures (
  id uuid primary key default gen_random_uuid(),
  title text,
  article_url text,
  provider text,
  reason text not null,
  payload jsonb,
  created_at timestamptz not null default now()
);

create index if not exists ingestion_failures_created_at_idx
  on public.ingestion_failures (created_at desc);

create table if not exists public.rss_source_health (
  source_id text primary key,
  name text not null,
  last_success timestamptz,
  last_failure timestamptz,
  failure_count int not null default 0,
  consecutive_failures int not null default 0,
  disabled_until timestamptz,
  updated_at timestamptz not null default now()
);

create index if not exists rss_source_health_disabled_idx
  on public.rss_source_health (disabled_until);

alter table public.ingestion_logs enable row level security;
alter table public.ingestion_failures enable row level security;
alter table public.rss_source_health enable row level security;

drop policy if exists "Service role ingestion logs" on public.ingestion_logs;
create policy "Service role ingestion logs"
  on public.ingestion_logs for all to service_role using (true) with check (true);

drop policy if exists "Service role ingestion failures" on public.ingestion_failures;
create policy "Service role ingestion failures"
  on public.ingestion_failures for all to service_role using (true) with check (true);

drop policy if exists "Service role rss health" on public.rss_source_health;
create policy "Service role rss health"
  on public.rss_source_health for all to service_role using (true) with check (true);

revoke all on table public.ingestion_logs from anon, authenticated;
revoke all on table public.ingestion_failures from anon, authenticated;
revoke all on table public.rss_source_health from anon, authenticated;
grant all on table public.ingestion_logs to service_role;
grant all on table public.ingestion_failures to service_role;
grant all on table public.rss_source_health to service_role;

-- ═══════════════════════════════════════════════════════════════════════════════
-- 3. tenant_memberships — ensure 025/032 columns, indexes, trigger, FK validate
-- ═══════════════════════════════════════════════════════════════════════════════

alter table public.tenant_memberships
  add column if not exists display_name text,
  add column if not exists avatar_url text,
  add column if not exists permissions jsonb not null default '{}'::jsonb,
  add column if not exists metadata jsonb not null default '{}'::jsonb,
  add column if not exists joined_at timestamptz default now();

update public.tenant_memberships tm
set display_name = coalesce(
  nullif(trim(tm.display_name), ''),
  nullif(trim(tm.metadata->>'full_name'), ''),
  split_part(lower(tm.email), '@', 1)
)
where display_name is null or trim(display_name) = '';

update public.tenant_memberships
set joined_at = coalesce(joined_at, created_at)
where joined_at is null;

update public.tenant_memberships
set status = 'active'
where status is null or trim(status) = '';

alter table public.tenant_memberships
  alter column status set default 'active';

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'tenant_memberships_tenant_id_user_id_key'
      and conrelid = 'public.tenant_memberships'::regclass
  ) then
    alter table public.tenant_memberships
      add constraint tenant_memberships_tenant_id_user_id_key unique (tenant_id, user_id);
  end if;
end $$;

create index if not exists idx_tenant_memberships_tenant_status
  on public.tenant_memberships (tenant_id, status);

create index if not exists idx_tenant_memberships_tenant_role
  on public.tenant_memberships (tenant_id, role);

create index if not exists idx_tenant_memberships_joined_at
  on public.tenant_memberships (tenant_id, joined_at desc);

create index if not exists idx_tenant_memberships_user_status
  on public.tenant_memberships (user_id, status);

create index if not exists idx_tenant_memberships_email
  on public.tenant_memberships (lower(email));

-- Canonical RBAC (024)
alter table public.tenant_memberships
  drop constraint if exists tenant_memberships_role_check;

alter table public.tenant_memberships
  add constraint tenant_memberships_role_check
  check (role in ('super_admin', 'editor', 'moderator', 'journalist'));

alter table public.tenant_memberships
  drop constraint if exists tenant_memberships_user_id_fkey;

alter table public.tenant_memberships
  add constraint tenant_memberships_user_id_fkey
  foreign key (user_id) references auth.users (id) on delete cascade not valid;

do $$
declare
  orphan_count int;
begin
  select count(*) into orphan_count
  from public.tenant_memberships tm
  left join auth.users u on u.id = tm.user_id
  where u.id is null;

  if orphan_count = 0 then
    alter table public.tenant_memberships validate constraint tenant_memberships_user_id_fkey;
  else
    raise notice 'tenant_memberships: % orphan user_id — FK not validated', orphan_count;
  end if;
end $$;

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

-- RLS policies (021 + 024 + 026)
drop policy if exists "Service role tenant_memberships" on public.tenant_memberships;
create policy "Service role tenant_memberships"
  on public.tenant_memberships for all to service_role using (true) with check (true);

drop policy if exists "Users read own membership" on public.tenant_memberships;
create policy "Users read own membership"
  on public.tenant_memberships for select to authenticated
  using (user_id = auth.uid() and status = 'active');

drop policy if exists "Super admin read tenant memberships" on public.tenant_memberships;
create policy "Super admin read tenant memberships"
  on public.tenant_memberships for select to authenticated
  using (
    tenant_id in (
      select me.tenant_id from public.tenant_memberships me
      where me.user_id = auth.uid() and me.status = 'active' and me.role = 'super_admin'
    )
  );

drop policy if exists "Super admin update tenant memberships" on public.tenant_memberships;
create policy "Super admin update tenant memberships"
  on public.tenant_memberships for update to authenticated
  using (
    tenant_id in (
      select me.tenant_id from public.tenant_memberships me
      where me.user_id = auth.uid() and me.status = 'active' and me.role = 'super_admin'
    )
  )
  with check (
    tenant_id in (
      select me.tenant_id from public.tenant_memberships me
      where me.user_id = auth.uid() and me.status = 'active' and me.role = 'super_admin'
    )
  );

revoke all on table public.tenant_memberships from anon;
grant select, update on table public.tenant_memberships to authenticated;
grant all on table public.tenant_memberships to service_role;

-- ═══════════════════════════════════════════════════════════════════════════════
-- 4. newsroom_tenants
-- ═══════════════════════════════════════════════════════════════════════════════

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

alter table public.newsroom_tenants enable row level security;

drop policy if exists "Public read active tenants" on public.newsroom_tenants;
create policy "Public read active tenants"
  on public.newsroom_tenants for select to anon, authenticated
  using (status = 'active');

drop policy if exists "Service role tenants" on public.newsroom_tenants;
create policy "Service role tenants"
  on public.newsroom_tenants for all to service_role using (true) with check (true);

-- Legacy `tenants` table (pre-017): document only — do not drop
comment on table public.tenants is
  'LEGACY: pre-newsroom_tenants table. App uses newsroom_tenants. Retained for historical rows.';

-- ═══════════════════════════════════════════════════════════════════════════════
-- 5. generated_articles + editorial workflow (027)
-- ═══════════════════════════════════════════════════════════════════════════════

alter table public.generated_articles
  add column if not exists tenant_id uuid references public.newsroom_tenants(id) on delete set null;

alter table public.generated_articles
  add column if not exists workflow_status text;

update public.generated_articles
set workflow_status = 'draft'
where workflow_status is null;

alter table public.generated_articles
  alter column workflow_status set default 'draft';

alter table public.generated_articles
  alter column workflow_status set not null;

alter table public.generated_articles
  drop constraint if exists generated_articles_workflow_status_check;

alter table public.generated_articles
  add constraint generated_articles_workflow_status_check
  check (
    workflow_status in (
      'draft', 'review', 'fact_check', 'legal_review', 'scheduled', 'published', 'archived'
    )
  );

alter table public.generated_articles
  add column if not exists workflow_deadline_at timestamptz,
  add column if not exists workflow_assigned_to uuid,
  add column if not exists workflow_rejection_reason text;

create index if not exists idx_generated_articles_workflow_status
  on public.generated_articles (workflow_status, workflow_deadline_at);

create index if not exists idx_generated_articles_workflow_assignee
  on public.generated_articles (workflow_assigned_to)
  where workflow_assigned_to is not null;

create index if not exists idx_generated_articles_tenant
  on public.generated_articles (tenant_id);

update public.generated_articles
set workflow_status = case
  when editorial_status = 'approved' and published_at is not null then 'published'
  when editorial_status = 'approved' and published_at is null then 'scheduled'
  when editorial_status = 'rejected' then 'draft'
  when editorial_status = 'pending' then 'review'
  else coalesce(workflow_status, 'draft')
end
where workflow_status = 'draft'
  and editorial_status is not null
  and editorial_status <> 'draft';

create table if not exists public.editorial_workflow_events (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references public.newsroom_tenants(id) on delete cascade,
  article_id uuid not null references public.generated_articles(id) on delete cascade,
  actor_user_id uuid,
  actor_email text,
  event_type text not null,
  from_status text,
  to_status text,
  comment text,
  rejection_reason text,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_workflow_events_article
  on public.editorial_workflow_events (article_id, created_at desc);

create index if not exists idx_workflow_events_tenant
  on public.editorial_workflow_events (tenant_id, created_at desc);

create table if not exists public.editorial_workflow_comments (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references public.newsroom_tenants(id) on delete cascade,
  article_id uuid not null references public.generated_articles(id) on delete cascade,
  author_user_id uuid,
  author_email text not null,
  body text not null,
  workflow_status text,
  created_at timestamptz not null default now()
);

create index if not exists idx_workflow_comments_article
  on public.editorial_workflow_comments (article_id, created_at desc);

alter table public.editorial_workflow_events enable row level security;
alter table public.editorial_workflow_comments enable row level security;

drop policy if exists "Service role workflow events" on public.editorial_workflow_events;
create policy "Service role workflow events"
  on public.editorial_workflow_events for all to service_role using (true) with check (true);

drop policy if exists "Service role workflow comments" on public.editorial_workflow_comments;
create policy "Service role workflow comments"
  on public.editorial_workflow_comments for all to service_role using (true) with check (true);

revoke all on table public.editorial_workflow_events from anon, authenticated;
revoke all on table public.editorial_workflow_comments from anon, authenticated;
grant all on table public.editorial_workflow_events to service_role;
grant all on table public.editorial_workflow_comments to service_role;

-- ═══════════════════════════════════════════════════════════════════════════════
-- 6. intelligence_embeddings (028 drift: missing embedding_json, updated_at)
-- ═══════════════════════════════════════════════════════════════════════════════

create extension if not exists vector;

create table if not exists public.intelligence_embeddings (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references public.newsroom_tenants(id) on delete cascade,
  entity_type text not null,
  entity_id uuid not null,
  content_hash text not null,
  model text not null default 'text-embedding-3-small',
  embedding vector(1536),
  embedding_json jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (entity_type, entity_id)
);

alter table public.intelligence_embeddings
  add column if not exists embedding_json jsonb,
  add column if not exists updated_at timestamptz not null default now();

alter table public.intelligence_embeddings
  drop constraint if exists intelligence_embeddings_entity_type_check;

alter table public.intelligence_embeddings
  add constraint intelligence_embeddings_entity_type_check
  check (entity_type in ('signal', 'article', 'event'));

update public.intelligence_embeddings
set updated_at = coalesce(updated_at, created_at)
where updated_at is null;

create index if not exists idx_intelligence_embeddings_tenant
  on public.intelligence_embeddings (tenant_id, entity_type);

create index if not exists idx_intelligence_embeddings_hash
  on public.intelligence_embeddings (content_hash);

-- IVFFlat index: skip if exists; rebuild only when empty (avoid long locks on large tables)
do $$
begin
  if not exists (
    select 1 from pg_indexes
    where schemaname = 'public'
      and tablename = 'intelligence_embeddings'
      and indexname = 'idx_intelligence_embeddings_vector'
  ) then
    execute '
      create index idx_intelligence_embeddings_vector
      on public.intelligence_embeddings
      using ivfflat (embedding vector_cosine_ops)
      with (lists = 50)
    ';
  end if;
exception
  when others then
    raise notice 'ivfflat index skipped: %', sqlerrm;
end $$;

create table if not exists public.source_reputation_memory (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references public.newsroom_tenants(id) on delete cascade,
  source_key text not null,
  source_name text not null,
  reputation_score numeric not null default 0.5,
  credibility_score numeric not null default 0.5,
  misinfo_incidents int not null default 0,
  verified_hits int not null default 0,
  total_signals int not null default 0,
  history jsonb not null default '[]'::jsonb,
  last_seen_at timestamptz,
  updated_at timestamptz not null default now(),
  unique (tenant_id, source_key)
);

create index if not exists idx_source_reputation_tenant_score
  on public.source_reputation_memory (tenant_id, reputation_score desc);

alter table public.intelligence_embeddings enable row level security;
alter table public.source_reputation_memory enable row level security;

drop policy if exists "Service role intelligence_embeddings" on public.intelligence_embeddings;
create policy "Service role intelligence_embeddings"
  on public.intelligence_embeddings for all to service_role using (true) with check (true);

drop policy if exists "Service role source_reputation_memory" on public.source_reputation_memory;
create policy "Service role source_reputation_memory"
  on public.source_reputation_memory for all to service_role using (true) with check (true);

revoke all on table public.intelligence_embeddings from anon, authenticated;
revoke all on table public.source_reputation_memory from anon, authenticated;
grant all on table public.intelligence_embeddings to service_role;
grant all on table public.source_reputation_memory to service_role;

create or replace function public.match_intelligence_embeddings(
  query_embedding vector(1536),
  match_count int default 10,
  filter_entity_type text default null,
  filter_tenant_id uuid default null
)
returns table (
  entity_type text,
  entity_id uuid,
  similarity float,
  metadata jsonb
)
language sql
stable
as $$
  select
    e.entity_type,
    e.entity_id,
    1 - (e.embedding <=> query_embedding) as similarity,
    e.metadata
  from public.intelligence_embeddings e
  where e.embedding is not null
    and (filter_entity_type is null or e.entity_type = filter_entity_type)
    and (filter_tenant_id is null or e.tenant_id = filter_tenant_id)
  order by e.embedding <=> query_embedding
  limit match_count;
$$;

-- ═══════════════════════════════════════════════════════════════════════════════
-- 7. DAM (030), collaboration (031), analytics (020/029) — grants + RLS normalize
-- ═══════════════════════════════════════════════════════════════════════════════

-- DAM tables (create if not exists — mirrors 030)
create table if not exists public.dam_folders (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.newsroom_tenants(id) on delete cascade,
  parent_id uuid references public.dam_folders(id) on delete cascade,
  name text not null,
  slug text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, parent_id, slug)
);

create table if not exists public.dam_assets (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.newsroom_tenants(id) on delete cascade,
  folder_id uuid references public.dam_folders(id) on delete set null,
  name text not null,
  media_type text not null,
  mime_type text not null,
  size_bytes bigint not null default 0,
  storage_path text not null,
  public_url text not null,
  content_hash text not null,
  width int,
  height int,
  duration_sec numeric,
  metadata jsonb not null default '{}'::jsonb,
  copyright jsonb not null default '{}'::jsonb,
  ai_tags text[] not null default '{}',
  ai_objects text[] not null default '{}',
  ai_ocr text,
  ai_caption text,
  ai_faces jsonb not null default '[]'::jsonb,
  duplicate_of uuid references public.dam_assets(id) on delete set null,
  watermark_applied boolean not null default false,
  cdn_optimized boolean not null default false,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.dam_assets
  drop constraint if exists dam_assets_media_type_check;

alter table public.dam_assets
  add constraint dam_assets_media_type_check
  check (media_type in ('image', 'video', 'audio'));

create table if not exists public.dam_asset_variants (
  id uuid primary key default gen_random_uuid(),
  asset_id uuid not null references public.dam_assets(id) on delete cascade,
  variant_key text not null,
  width int,
  height int,
  size_bytes bigint not null default 0,
  storage_path text not null,
  public_url text not null,
  created_at timestamptz not null default now(),
  unique (asset_id, variant_key)
);

alter table public.dam_folders enable row level security;
alter table public.dam_assets enable row level security;
alter table public.dam_asset_variants enable row level security;

drop policy if exists "Service role dam_folders" on public.dam_folders;
create policy "Service role dam_folders"
  on public.dam_folders for all to service_role using (true) with check (true);

drop policy if exists "Service role dam_assets" on public.dam_assets;
create policy "Service role dam_assets"
  on public.dam_assets for all to service_role using (true) with check (true);

drop policy if exists "Service role dam_variants" on public.dam_asset_variants;
create policy "Service role dam_variants"
  on public.dam_asset_variants for all to service_role using (true) with check (true);

-- Collaboration tables (031)
create table if not exists public.newsroom_editor_locks (
  article_id uuid primary key references public.generated_articles(id) on delete cascade,
  tenant_id uuid not null references public.newsroom_tenants(id) on delete cascade,
  locked_by uuid not null references auth.users(id) on delete cascade,
  locked_by_email text not null,
  acquired_at timestamptz not null default now(),
  expires_at timestamptz not null,
  heartbeat_at timestamptz not null default now()
);

create index if not exists idx_editor_locks_tenant
  on public.newsroom_editor_locks (tenant_id);

-- reader_analytics_events RLS harden
alter table public.reader_analytics_events enable row level security;

drop policy if exists "Service role reader analytics" on public.reader_analytics_events;
create policy "Service role reader analytics"
  on public.reader_analytics_events for all to service_role using (true) with check (true);

revoke all on table public.reader_analytics_events from anon, authenticated;
grant all on table public.reader_analytics_events to service_role;

do $$
declare
  t text;
begin
  foreach t in array array[
    'dam_folders', 'dam_assets', 'dam_asset_variants',
    'newsroom_editor_locks', 'newsroom_inline_comments', 'newsroom_chat_messages',
    'newsroom_notifications', 'newsroom_activity_events', 'newsroom_approval_requests',
    'newsroom_doc_operations', 'newsroom_doc_heads'
  ]
  loop
    if exists (
      select 1 from information_schema.tables
      where table_schema = 'public' and table_name = t
    ) then
      execute format('alter table public.%I enable row level security', t);
      execute format('drop policy if exists "Service role %s" on public.%I', t, t);
      execute format(
        'create policy "Service role %s" on public.%I for all to service_role using (true) with check (true)',
        t, t
      );
      execute format('revoke all on table public.%I from anon, authenticated', t);
      execute format('grant all on table public.%I to service_role', t);
    end if;
  end loop;
end $$;

-- ═══════════════════════════════════════════════════════════════════════════════
-- 8. PostgREST schema reload RPC
-- ═══════════════════════════════════════════════════════════════════════════════

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

-- ═══════════════════════════════════════════════════════════════════════════════
-- 9. Schema health RPC (used by admin dashboard + verify scripts)
-- ═══════════════════════════════════════════════════════════════════════════════

create or replace function public.get_schema_health()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  with checks as (
    select jsonb_agg(jsonb_build_object('id', id, 'ok', ok)) as items
    from (
      select 'table_ingestion_logs' as id, to_regclass('public.ingestion_logs') is not null as ok
      union all select 'table_ingestion_failures', to_regclass('public.ingestion_failures') is not null
      union all select 'table_rss_source_health', to_regclass('public.rss_source_health') is not null
      union all select 'table_tenant_memberships', to_regclass('public.tenant_memberships') is not null
      union all select 'table_newsroom_tenants', to_regclass('public.newsroom_tenants') is not null
      union all select 'table_generated_articles', to_regclass('public.generated_articles') is not null
      union all select 'table_editorial_workflow_events', to_regclass('public.editorial_workflow_events') is not null
      union all select 'table_intelligence_embeddings', to_regclass('public.intelligence_embeddings') is not null
      union all select 'table_dam_assets', to_regclass('public.dam_assets') is not null
      union all select 'table_newsroom_editor_locks', to_regclass('public.newsroom_editor_locks') is not null
      union all select 'table_reader_analytics_events', to_regclass('public.reader_analytics_events') is not null
      union all select 'col_display_name', exists (
        select 1 from information_schema.columns
        where table_schema = 'public' and table_name = 'tenant_memberships' and column_name = 'display_name'
      )
      union all select 'col_embedding_json', exists (
        select 1 from information_schema.columns
        where table_schema = 'public' and table_name = 'intelligence_embeddings' and column_name = 'embedding_json'
      )
      union all select 'col_workflow_status', exists (
        select 1 from information_schema.columns
        where table_schema = 'public' and table_name = 'generated_articles' and column_name = 'workflow_status'
      )
      union all select 'fn_reload_postgrest', exists (
        select 1 from pg_proc p
        join pg_namespace n on n.oid = p.pronamespace
        where n.nspname = 'public' and p.proname = 'reload_postgrest_schema'
      )
      union all select 'ext_vector', exists (select 1 from pg_extension where extname = 'vector')
    ) s
  )
  select jsonb_build_object(
    'ok', coalesce((
      select bool_and((elem->>'ok')::boolean)
      from checks c, jsonb_array_elements(c.items) elem
    ), false),
    'checked_at', now(),
    'migration_latest', (select coalesce(max(version), 'unknown') from supabase_migrations.schema_migrations),
    'schema_checksum', (
      select md5(string_agg(
        table_name || ':' || column_name || ':' || data_type || ':' || is_nullable,
        '|' order by table_name, ordinal_position
      ))
      from information_schema.columns
      where table_schema = 'public'
        and table_name in (
          'tenant_memberships', 'newsroom_tenants', 'generated_articles',
          'editorial_workflow_events', 'intelligence_embeddings', 'dam_assets',
          'newsroom_editor_locks', 'reader_analytics_events',
          'ingestion_logs', 'ingestion_failures', 'rss_source_health'
        )
    ),
    'expected_checksum', (select value from public.schema_registry where key = 'critical_tables_checksum_v1'),
    'checks', (select items from checks)
  );
$$;

revoke all on function public.get_schema_health() from public;
grant execute on function public.get_schema_health() to service_role;

insert into public.schema_registry (key, value, updated_at)
values ('critical_tables_checksum_v1', 'pending_after_033_apply', now())
on conflict (key) do update
set value = excluded.value, updated_at = now();

-- Update checksum after stabilization
update public.schema_registry
set value = (
  select md5(string_agg(
    table_name || ':' || column_name || ':' || data_type || ':' || is_nullable,
    '|' order by table_name, ordinal_position
  ))
  from information_schema.columns
  where table_schema = 'public'
    and table_name in (
      'tenant_memberships', 'newsroom_tenants', 'generated_articles',
      'editorial_workflow_events', 'intelligence_embeddings', 'dam_assets',
      'newsroom_editor_locks', 'reader_analytics_events',
      'ingestion_logs', 'ingestion_failures', 'rss_source_health'
    )
),
updated_at = now()
where key = 'critical_tables_checksum_v1';

notify pgrst, 'reload schema';
