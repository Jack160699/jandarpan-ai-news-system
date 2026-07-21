# Hotfix: ingestion truth + `geo_metadata` schema

## Root cause (CONFIRMED)

### `CONFIRMED_SCHEMA_MISMATCH`

Production `news_signals` has `ingestion_metadata`, `region`, and `tenant_id`, but **lacks** the `geo_metadata` column.

Application code in `src/lib/newsroom/signals/persist.ts` writes `geo_metadata` on every upsert. PostgREST rejects the payload → batch upsert errors → **inserted = 0**.

### Hardcoded `persistenceSucceeded: true`

`/api/fetch-news` previously passed `persistenceSucceeded: true` into `classifyIngestionOutcome` whenever the worker returned an object — even when every upsert batch failed and `inserted === 0`.

Batch errors were `continue`d inside `persistNewsSignals` without surfacing failure flags, so cron runs looked healthy (`ok: true`) while no novel signals were persisted.

## Fix summary

1. **Migration `067_news_signals_geo_metadata.sql`** — `ADD COLUMN IF NOT EXISTS geo_metadata jsonb`, expression indexes, backfill from `ingestion_metadata->'geo'`.
2. **Generated types** — `geo_metadata: Json | null` on `news_signals` Row/Insert/Update.
3. **Persist contract** — `SignalPersistResult` now reports `attempted`, `failedBatches`, `failedRows`, `persistenceErrors`, `allBatchesFailed`, `partialPersistence`. Zero inserts from `ignoreDuplicates` is **not** a failure.
4. **Scalable ingest + fetch-news** — propagate persistence flags; `persistenceSucceeded: !(allBatchesFailed || persistenceFailed)`; `failed_persistence` → HTTP 500 / `recordCronRun ok: false`.
5. **Outcome classifications** — `healthy_new_content`, `healthy_no_novel_content`, `degraded_*`, `skipped_backpressure`, `failed_persistence`, `failed_all_providers`, `failed_configuration` (status `success|degraded|failed` kept).
6. **Orchestrator** — `editorial_images` skip reason `empty_queue` when pending = 0 (not `deadline_budget`); with pending > 0, attempt if ≥ ~8s budget remains.

## Stage 1 rollout

**Stage 1 remains SHADOW.** This hotfix does **not** change rollout env vars, activate Stage 1, or widen GNews gap-first production mode.

## Apply migration

```bash
# via Supabase CLI / dashboard against production (forward-only)
supabase db push
# or apply 067_news_signals_geo_metadata.sql manually
```

Until 067 is applied, persistence will continue to fail honestly (`failed_persistence`) rather than reporting false health.

## Remaining gaps

| Gap | Notes |
|-----|--------|
| **Partial batch persistence** | Some batches OK + some fail → `partialPersistence`; run may still classify success if inserts landed. Ops should watch `failedBatches` telemetry. |
| **Migration must be applied** | 067 must be applied to production before upserts succeed. |

## Cursor rule (fixed in this hotfix)

RSS / NewsData stamp `ingestion_source_key` + `ingestion_cursor_expected` on articles at fetch time. **`advanceSourceCursorSafe` runs only after successful `persistNewsSignals`** in `ingest-provider-batch.ts`. Failed persistence no longer advances the cursor past unpersisted content.

## Telemetry (safe)

`recordCronRun` metadata / workers JSON now includes: `runId`, `schedulerIdentity` (`vercel_cron` \| `qstash` \| `bearer_unknown`), fetched/normalized/inserted/duplicates, `failedBatches`, truncated `persistenceErrors`, outcome `classification`, optional `gnewsMode`, provider counts. No secrets.

