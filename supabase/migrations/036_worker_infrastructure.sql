-- Jan Darpan OS: worker jobs, dead-letter queue, event bus, intelligence snapshots

-- ---------------------------------------------------------------------------
-- Unified job queue (Postgres-backed, deduplicated)
-- ---------------------------------------------------------------------------

create table if not exists public.worker_jobs (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references public.newsroom_tenants(id) on delete cascade,
  job_type text not null,
  dedupe_key text not null,
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'pending'
    check (status in ('pending', 'claimed', 'completed', 'failed', 'dead')),
  priority int not null default 0,
  attempts int not null default 0,
  max_attempts int not null default 5,
  scheduled_at timestamptz not null default now(),
  claimed_at timestamptz,
  completed_at timestamptz,
  last_error text,
  result jsonb,
  timeout_ms int not null default 120000,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists idx_worker_jobs_dedupe_active
  on public.worker_jobs (job_type, dedupe_key)
  where status in ('pending', 'claimed');

create index if not exists idx_worker_jobs_claim
  on public.worker_jobs (status, scheduled_at, priority desc)
  where status = 'pending';

create index if not exists idx_worker_jobs_tenant_type
  on public.worker_jobs (tenant_id, job_type, created_at desc);

-- ---------------------------------------------------------------------------
-- Dead-letter queue
-- ---------------------------------------------------------------------------

create table if not exists public.worker_dead_letters (
  id uuid primary key default gen_random_uuid(),
  job_id uuid references public.worker_jobs(id) on delete set null,
  tenant_id uuid references public.newsroom_tenants(id) on delete cascade,
  job_type text not null,
  dedupe_key text not null,
  payload jsonb not null default '{}'::jsonb,
  attempts int not null default 0,
  last_error text,
  failed_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb
);

create index if not exists idx_worker_dead_letters_type
  on public.worker_dead_letters (job_type, failed_at desc);

-- ---------------------------------------------------------------------------
-- Worker health / job run monitoring
-- ---------------------------------------------------------------------------

create table if not exists public.worker_job_runs (
  id uuid primary key default gen_random_uuid(),
  worker_id text not null,
  job_id uuid references public.worker_jobs(id) on delete set null,
  job_type text,
  tenant_id uuid references public.newsroom_tenants(id) on delete cascade,
  ok boolean not null default false,
  duration_ms int not null default 0,
  skipped boolean not null default false,
  error text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_worker_job_runs_worker
  on public.worker_job_runs (worker_id, created_at desc);

create index if not exists idx_worker_job_runs_job
  on public.worker_job_runs (job_id, created_at desc);

-- ---------------------------------------------------------------------------
-- Event bus (pub/sub persistence)
-- ---------------------------------------------------------------------------

create table if not exists public.event_bus_messages (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references public.newsroom_tenants(id) on delete cascade,
  topic text not null,
  event_type text not null,
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'pending'
    check (status in ('pending', 'processing', 'delivered', 'failed')),
  dedupe_key text,
  attempts int not null default 0,
  max_attempts int not null default 3,
  scheduled_at timestamptz not null default now(),
  delivered_at timestamptz,
  last_error text,
  created_at timestamptz not null default now()
);

create unique index if not exists idx_event_bus_dedupe
  on public.event_bus_messages (topic, dedupe_key)
  where dedupe_key is not null and status in ('pending', 'processing');

create index if not exists idx_event_bus_pending
  on public.event_bus_messages (status, scheduled_at)
  where status = 'pending';

create index if not exists idx_event_bus_topic
  on public.event_bus_messages (topic, created_at desc);

-- ---------------------------------------------------------------------------
-- Precomputed intelligence snapshots
-- ---------------------------------------------------------------------------

create table if not exists public.intelligence_snapshots (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references public.newsroom_tenants(id) on delete cascade,
  snapshot jsonb not null,
  version int not null default 1,
  build_duration_ms int,
  built_at timestamptz not null default now(),
  unique (tenant_id)
);

create index if not exists idx_intelligence_snapshots_built
  on public.intelligence_snapshots (built_at desc);

-- ---------------------------------------------------------------------------
-- Precomputed analytics snapshots
-- ---------------------------------------------------------------------------

create table if not exists public.analytics_snapshots (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.newsroom_tenants(id) on delete cascade,
  window_hours int not null default 168,
  snapshot jsonb not null,
  built_at timestamptz not null default now(),
  unique (tenant_id, window_hours)
);

-- ---------------------------------------------------------------------------
-- DAM analyze queue (async vision AI)
-- ---------------------------------------------------------------------------

create table if not exists public.dam_analyze_queue (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references public.newsroom_tenants(id) on delete cascade,
  asset_id uuid not null,
  status text not null default 'pending'
    check (status in ('pending', 'processing', 'completed', 'failed')),
  created_at timestamptz not null default now(),
  processed_at timestamptz,
  error text
);

create unique index if not exists idx_dam_analyze_asset
  on public.dam_analyze_queue (asset_id);

create index if not exists idx_dam_analyze_pending
  on public.dam_analyze_queue (status, created_at)
  where status = 'pending';

-- ---------------------------------------------------------------------------
-- RLS (service role only)
-- ---------------------------------------------------------------------------

alter table public.worker_jobs enable row level security;
alter table public.worker_dead_letters enable row level security;
alter table public.worker_job_runs enable row level security;
alter table public.event_bus_messages enable row level security;
alter table public.intelligence_snapshots enable row level security;
alter table public.analytics_snapshots enable row level security;
alter table public.dam_analyze_queue enable row level security;

drop policy if exists "Service role worker_jobs" on public.worker_jobs;
create policy "Service role worker_jobs"
  on public.worker_jobs for all to service_role using (true) with check (true);

drop policy if exists "Service role worker_dead_letters" on public.worker_dead_letters;
create policy "Service role worker_dead_letters"
  on public.worker_dead_letters for all to service_role using (true) with check (true);

drop policy if exists "Service role worker_job_runs" on public.worker_job_runs;
create policy "Service role worker_job_runs"
  on public.worker_job_runs for all to service_role using (true) with check (true);

drop policy if exists "Service role event_bus_messages" on public.event_bus_messages;
create policy "Service role event_bus_messages"
  on public.event_bus_messages for all to service_role using (true) with check (true);

drop policy if exists "Service role intelligence_snapshots" on public.intelligence_snapshots;
create policy "Service role intelligence_snapshots"
  on public.intelligence_snapshots for all to service_role using (true) with check (true);

drop policy if exists "Service role analytics_snapshots" on public.analytics_snapshots;
create policy "Service role analytics_snapshots"
  on public.analytics_snapshots for all to service_role using (true) with check (true);

drop policy if exists "Service role dam_analyze_queue" on public.dam_analyze_queue;
create policy "Service role dam_analyze_queue"
  on public.dam_analyze_queue for all to service_role using (true) with check (true);

comment on table public.worker_jobs is
  'Unified async job queue with deduplication, retries, and scheduling';
comment on table public.intelligence_snapshots is
  'Precomputed newsroom intelligence dashboard payload (served on GET)';
comment on table public.event_bus_messages is
  'Durable pub/sub event bus for worker orchestration';
