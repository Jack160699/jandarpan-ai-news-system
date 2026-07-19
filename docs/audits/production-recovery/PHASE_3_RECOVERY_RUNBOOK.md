# Phase 3 — Recovery Runbook

**Do not execute production retries until Phase 3 tooling is deployed and an operator explicitly opts in.**

## Prerequisites

- Phase 1 + Phase 2 on the deployment under recovery
- `NEXT_PUBLIC_SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY`
- Dedicated editorial-generate cron healthy

## Commands

```bash
# Read-only backlog audit
npm run ops:editorial-backlog-audit
# or
npx tsx scripts/editorial-backlog-recovery.ts audit

# Dry-run retry selection (default)
npm run ops:editorial-backlog-retry
npx tsx scripts/editorial-backlog-recovery.ts retry --batch-size=3

# Release stale claims (dry-run classification / execute reclaim)
npx tsx scripts/editorial-backlog-recovery.ts release-stale-claims
npx tsx scripts/editorial-backlog-recovery.ts release-stale-claims --execute

# Quarantine obsolete / duplicate / malformed / already-completed
npx tsx scripts/editorial-backlog-recovery.ts quarantine
npx tsx scripts/editorial-backlog-recovery.ts quarantine --execute --batch-size=5

# List obsolete-like classes
npx tsx scripts/editorial-backlog-recovery.ts list-obsolete

# DLQ classify + annotate metadata (no delete)
npx tsx scripts/editorial-backlog-recovery.ts classify-dlq
npx tsx scripts/editorial-backlog-recovery.ts classify-dlq --execute

# Post-batch verification
npx tsx scripts/editorial-backlog-recovery.ts verify
```

### Filters

- `--tenant=<uuid>`
- `--job-type=editorial_generate` (repeatable)
- `--batch-size=3`
- `--min-age-hours=1` / `--max-age-hours=72`
- `--reason=timeout`
- `--class=eligible_immediate_retry`
- `--enqueue-wakeup` (also enqueue a fresh bounded wake-up)
- `--stop-on-error=2`

## Controlled drain procedure (post-deploy)

1. `audit` — capture `byClass` + uncovered fresh/stale counts  
2. `release-stale-claims --execute` if stale claims present  
3. `quarantine --execute` for obsolete/duplicate/already_completed/malformed  
4. `retry --execute --batch-size=3` **only** for `eligible_immediate_retry` with fresh events  
5. Wait **≥60s** cooldown  
6. `verify` — queue depth, oldest age, failure spike, publication flood  
7. Repeat until fresh backlog cleared; leave stale stories in manual review  

## Guards (non-negotiable)

- Dry-run default; requires `--execute`
- No destructive deletion of `worker_jobs` or `worker_dead_letters`
- No retry unless fresh uncovered events exist
- Stale-only uncovered events → manual review (not auto-publish)
- Stop-on-error threshold aborts the batch
- Bounded AI / DB / publication load via `RECOVERY_RATE_LIMITS`

## Audit artifacts

Each run writes JSON under:

`docs/audits/production-recovery/logs/phase3-<command>-<dryrun|execute>-<ts>.json`

Do not commit execute logs containing production secrets; dry-run summaries may be copied into `PHASE_3_DRY_RUN_RESULTS.md`.

## Rollback

Quarantine sets `status=failed` + `result.quarantined=true` and parks `scheduled_at` far future. To un-quarantine manually, clear those fields and set `status=pending` for a specific id after review.
