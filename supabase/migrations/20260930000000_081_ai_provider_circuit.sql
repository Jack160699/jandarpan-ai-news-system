-- Migration 081: persisted AI provider circuit breaker
--
-- Provider health was in-memory only, so every cold serverless start re-probed
-- dead providers (codecraft `deepseek-v4-pro-max` 401 after ~87s; gemini-3.6-flash
-- upstream errors after ~65s) before failing over — ~60-90s wasted per candidate.
-- Keys are "<provider>" or "<provider>:<model>" (matches health.ts registry keys).
-- Service-role only: RLS enabled, no policies.

create table if not exists public.ai_provider_circuit (
  key                  text primary key,
  disabled_until       timestamptz,
  consecutive_failures integer not null default 0,
  last_error           text,
  last_failure_at      timestamptz,
  last_success_at      timestamptz,
  failure_class        text,
  updated_at           timestamptz not null default now()
);

create index if not exists ai_provider_circuit_open_idx
  on public.ai_provider_circuit (disabled_until)
  where disabled_until is not null;

alter table public.ai_provider_circuit enable row level security;

comment on table public.ai_provider_circuit is
  'Persisted AI provider/model circuit-breaker state shared across serverless invocations. Written by src/lib/ai/providers/circuit-store.ts.';
