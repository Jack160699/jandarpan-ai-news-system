-- Phase 4: archive table for obsolete queue entries removed during production cleanup

create table if not exists public.queue_cleanup_archive (
  id uuid primary key default gen_random_uuid(),
  source_table text not null,
  source_id uuid not null,
  job_type text,
  payload jsonb not null default '{}'::jsonb,
  stale_reasons text[] not null default '{}',
  original_status text not null,
  archived_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb
);

create index if not exists idx_queue_cleanup_archive_source
  on public.queue_cleanup_archive (source_table, archived_at desc);

create index if not exists idx_queue_cleanup_archive_job_type
  on public.queue_cleanup_archive (job_type, archived_at desc);

alter table public.queue_cleanup_archive enable row level security;

drop policy if exists "Service role queue cleanup archive" on public.queue_cleanup_archive;
create policy "Service role queue cleanup archive"
  on public.queue_cleanup_archive
  for all
  to service_role
  using (true)
  with check (true);
