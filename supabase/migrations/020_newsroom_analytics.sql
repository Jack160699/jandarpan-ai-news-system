-- Advanced newsroom reader analytics (privacy-aware, event-sourced)

create table if not exists reader_analytics_events (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references newsroom_tenants(id) on delete set null,
  event_type text not null check (event_type in (
    'page_view', 'article_view', 'article_click', 'dwell',
    'scroll_depth', 'share', 'breaking_alert_view', 'search_click'
  )),
  article_slug text,
  session_hash text,
  category text,
  region text,
  surface text,
  value_num numeric,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_reader_analytics_tenant_time
  on reader_analytics_events (tenant_id, created_at desc);

create index if not exists idx_reader_analytics_slug_type
  on reader_analytics_events (article_slug, event_type, created_at desc);

create index if not exists idx_reader_analytics_type_time
  on reader_analytics_events (event_type, created_at desc);

create table if not exists article_metrics_daily (
  tenant_id uuid not null references newsroom_tenants(id) on delete cascade,
  article_slug text not null,
  bucket_date date not null default (current_date),
  views int not null default 0,
  clicks int not null default 0,
  engagements int not null default 0,
  total_dwell_ms bigint not null default 0,
  scroll_samples int not null default 0,
  scroll_depth_sum numeric not null default 0,
  updated_at timestamptz not null default now(),
  primary key (tenant_id, article_slug, bucket_date)
);

create table if not exists breaking_velocity_snapshots (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references newsroom_tenants(id) on delete cascade,
  article_slug text not null,
  views_1h int not null default 0,
  views_24h int not null default 0,
  velocity_score numeric not null default 0,
  is_breaking boolean not null default false,
  captured_at timestamptz not null default now()
);

create index if not exists idx_breaking_velocity_tenant_time
  on breaking_velocity_snapshots (tenant_id, captured_at desc);

comment on table reader_analytics_events is 'Lightweight reader events — no PII, session_hash is anonymous';
comment on column reader_analytics_events.session_hash is 'Random per-browser session id, not linked to identity';
comment on table article_metrics_daily is 'Daily rollups for fast dashboard queries';
