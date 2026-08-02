-- 072 — fix daily_newsroom_report_actions idempotency enforcement.
--
-- 070 created a PARTIAL unique index (`where idempotency_key is not null`)
-- as the idempotency guard for recordActionExecution()'s
-- `.upsert(row, { onConflict: "idempotency_key" })` call. PostgreSQL cannot
-- use a partial index to arbitrate a plain `ON CONFLICT (idempotency_key)`
-- clause (no WHERE predicate on the conflict target), so every recommended
-- action insert has been failing in production with:
--   "there is no unique or exclusion constraint matching the ON CONFLICT
--   specification"
-- silently caught by recordActionExecution's try/catch and only surfaced as
-- a pipelineWarn log line — daily_newsroom_report_actions has been staying
-- empty despite generate.ts reporting a nonzero actionsRecommended count.
--
-- Fix: replace the partial index with a real UNIQUE constraint on
-- idempotency_key. A plain unique constraint already treats every NULL as
-- distinct from every other NULL (Postgres semantics), giving the same
-- "only enforce uniqueness when non-null" behavior the partial index was
-- going for, while also being a valid ON CONFLICT target.

do $$
begin
  if exists (
    select 1 from pg_indexes
    where schemaname = 'public'
      and tablename = 'daily_newsroom_report_actions'
      and indexname = 'daily_newsroom_report_actions_idempotency_key_uidx'
  ) then
    drop index public.daily_newsroom_report_actions_idempotency_key_uidx;
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'daily_newsroom_report_actions_idempotency_key_key'
      and conrelid = 'public.daily_newsroom_report_actions'::regclass
  ) then
    alter table public.daily_newsroom_report_actions
      add constraint daily_newsroom_report_actions_idempotency_key_key unique (idempotency_key);
  end if;
end $$;
