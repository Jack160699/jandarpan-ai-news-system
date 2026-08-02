-- 071 — provider_quota_snapshots gains a nullable `model` column so
-- per-model quota buckets (gemini-3.6-flash vs gemini-3.5-flash-lite,
-- Groq's per-model buckets) can be snapshotted and reported on separately
-- from the coarser provider-level bucket. null = provider-level row,
-- matching the existing rows already in the table.

alter table public.provider_quota_snapshots
  add column if not exists model text;

-- Existing provider_scope index doesn't need to change (model is additive
-- context, not a new query dimension on its own), but a model-aware lookup
-- is common enough for the daily report to warrant its own index.
create index if not exists provider_quota_snapshots_provider_model_scope_created_idx
  on public.provider_quota_snapshots (provider, model, scope, created_at desc);
