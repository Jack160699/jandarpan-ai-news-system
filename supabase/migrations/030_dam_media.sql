-- Digital Asset Management (DAM) — folders, assets, variants

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

create index if not exists idx_dam_folders_tenant
  on public.dam_folders (tenant_id, parent_id);

create table if not exists public.dam_assets (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.newsroom_tenants(id) on delete cascade,
  folder_id uuid references public.dam_folders(id) on delete set null,
  name text not null,
  media_type text not null check (media_type in ('image', 'video', 'audio')),
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

create index if not exists idx_dam_assets_tenant_folder
  on public.dam_assets (tenant_id, folder_id, created_at desc);

create index if not exists idx_dam_assets_hash
  on public.dam_assets (tenant_id, content_hash);

create index if not exists idx_dam_assets_type
  on public.dam_assets (tenant_id, media_type);

create index if not exists idx_dam_assets_search
  on public.dam_assets using gin (
    to_tsvector('simple', coalesce(name, '') || ' ' || coalesce(ai_caption, '') || ' ' || coalesce(ai_ocr, ''))
  );

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

create index if not exists idx_dam_variants_asset
  on public.dam_asset_variants (asset_id);

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

comment on table public.dam_assets is 'Newsroom DAM — images, video, audio with AI metadata';
