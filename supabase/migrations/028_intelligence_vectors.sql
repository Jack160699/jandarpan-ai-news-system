-- AI Intelligence Engine: vector embeddings + source reputation memory

create extension if not exists vector;

create table if not exists public.intelligence_embeddings (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references public.newsroom_tenants(id) on delete cascade,
  entity_type text not null check (entity_type in ('signal', 'article', 'event')),
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

create index if not exists idx_intelligence_embeddings_tenant
  on public.intelligence_embeddings (tenant_id, entity_type);

create index if not exists idx_intelligence_embeddings_hash
  on public.intelligence_embeddings (content_hash);

create index if not exists idx_intelligence_embeddings_vector
  on public.intelligence_embeddings
  using ivfflat (embedding vector_cosine_ops)
  with (lists = 50);

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
  on public.intelligence_embeddings
  for all
  to service_role
  using (true)
  with check (true);

drop policy if exists "Service role source_reputation_memory" on public.source_reputation_memory;

create policy "Service role source_reputation_memory"
  on public.source_reputation_memory
  for all
  to service_role
  using (true)
  with check (true);

-- Semantic nearest-neighbor search (pgvector)

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

comment on table public.intelligence_embeddings is
  'OpenAI embeddings for semantic duplicate detection and clustering';