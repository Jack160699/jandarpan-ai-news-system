-- OpenAI prompt result cache — skip duplicate identical prompts

create table if not exists public.openai_prompt_cache (
  id uuid primary key default gen_random_uuid(),
  prompt_hash text not null,
  operation text not null,
  worker text not null,
  cache_version text not null default '1',
  article_id text,
  event_id text,
  model text not null,
  result_json jsonb not null,
  input_tokens integer not null default 0,
  output_tokens integer not null default 0,
  estimated_cost_usd numeric(14, 8) not null default 0,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '7 days')
);

create unique index if not exists openai_prompt_cache_lookup_idx
  on public.openai_prompt_cache (prompt_hash, operation, worker, cache_version, article_id, event_id) nulls not distinct;

create index if not exists openai_prompt_cache_expires_idx
  on public.openai_prompt_cache (expires_at);

alter table public.openai_prompt_cache enable row level security;

create policy "openai_prompt_cache_service_role"
  on public.openai_prompt_cache
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');
