-- OpenAI cost observability — per-request usage from actual API metadata

create table if not exists public.openai_usage_events (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  worker text,
  operation text not null,
  cron_job text,
  article_id text,
  event_id text,
  tenant_id text,
  model text not null,
  endpoint text not null,
  input_tokens integer not null default 0,
  output_tokens integer not null default 0,
  cached_tokens integer not null default 0,
  estimated_cost_usd numeric(14, 8) not null default 0,
  latency_ms integer,
  retry_count integer not null default 0,
  success boolean not null default true,
  prompt_hash text,
  prompt_chars integer,
  completion_chars integer,
  metadata jsonb not null default '{}'::jsonb
);

create index if not exists openai_usage_events_created_at_idx
  on public.openai_usage_events (created_at desc);

create index if not exists openai_usage_events_worker_created_idx
  on public.openai_usage_events (worker, created_at desc);

create index if not exists openai_usage_events_model_created_idx
  on public.openai_usage_events (model, created_at desc);

create index if not exists openai_usage_events_article_created_idx
  on public.openai_usage_events (article_id, created_at desc)
  where article_id is not null;

create index if not exists openai_usage_events_operation_created_idx
  on public.openai_usage_events (operation, created_at desc);

create index if not exists openai_usage_events_prompt_hash_idx
  on public.openai_usage_events (prompt_hash, created_at desc)
  where prompt_hash is not null;

alter table public.openai_usage_events enable row level security;

create policy "openai_usage_service_role"
  on public.openai_usage_events
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');
