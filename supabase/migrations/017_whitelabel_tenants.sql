-- White-label SaaS: per-client newsroom tenants

create table if not exists newsroom_tenants (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  status text not null default 'active' check (status in ('active', 'suspended', 'trial')),
  domains text[] not null default '{}',
  config jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_newsroom_tenants_domains
  on newsroom_tenants using gin (domains);

create index if not exists idx_newsroom_tenants_slug
  on newsroom_tenants (slug);

alter table generated_articles
  add column if not exists tenant_id uuid references newsroom_tenants(id) on delete set null;

create index if not exists idx_generated_articles_tenant
  on generated_articles (tenant_id);

alter table news_signals
  add column if not exists tenant_id uuid references newsroom_tenants(id) on delete set null;

alter table news_events
  add column if not exists tenant_id uuid references newsroom_tenants(id) on delete set null;

comment on table newsroom_tenants is 'White-label client newspapers — branding, domains, categories, regions';
comment on column newsroom_tenants.config is 'TenantConfig JSON: branding, theme, categories, regions, newsroom settings';
