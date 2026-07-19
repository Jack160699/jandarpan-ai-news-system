# Phase 3 — Dry-run Results

**Mode:** tooling dry-run / fixture verification only  
**Production execute:** **not run** (Phase 3 scope)

## A. Three-day audit snapshot (inputs)

From `docs/audits/three-day-production-audit/data/`:

| Queue | Pending | Dead | Window fail reason |
|---|---:|---:|---|
| `editorial_generate` | 18 | 0 | `job_timeout` (9 fails) |
| `intelligence_snapshot` | 50 | 2 | `job_timeout` |
| `embed_signals` | 40 | 0 | `job_timeout` |
| `event_cluster` | 36 | 0 | `job_timeout` |
| `translate_article` | 51 | 0 | `urgencyScore is not defined` |
| Upstream pending (approx.) | ~194 | | |

Expected classification themes **before** live audit against current DB:

- Most `editorial_generate` pending → `eligible_immediate_retry` **if** fresh uncovered events remain; else `already_completed` / `manual_review_required`
- Duplicate wake-ups sharing dedupe → `duplicate` → quarantine
- Snapshot DLQ `job_timeout` → `retryable` (annotate only)
- Translate failures → `requires_code_repair` (do not requeue via this tool)

## B. Automated dry-run coverage (local)

Vitest (`src/lib/ops/editorial-backlog-*.test.ts`):

| Scenario | Result |
|---|---|
| Dry-run audit | No mutations; audit log emitted |
| Eligible retry | `eligible_immediate_retry` + `safeToAutoPublish` |
| Already completed | quarantine action |
| Duplicate job | `duplicate` |
| Stale claim | `release_stale_claim` |
| Malformed | `malformed` |
| Missing tenant | `manual_review` |
| Obsolete stale story | `manual_review_required` (not retry) |
| Batch limit | ≤ configured size |
| Stop-on-error | trips at threshold |
| Idempotent re-classify | same inputs → same class |
| DLQ classify | no row deletion |

**22 tests passed** in Phase 3 verification.

## C. Operator dry-run against production DB

After deploy (or with local service-role env), run:

```bash
npx tsx scripts/editorial-backlog-recovery.ts audit --job-type=editorial_generate
npx tsx scripts/editorial-backlog-recovery.ts retry --batch-size=3
npx tsx scripts/editorial-backlog-recovery.ts classify-dlq
npx tsx scripts/editorial-backlog-recovery.ts list-obsolete
```

Paste `byClass` + `summary` from the JSON artifact into this section before any `--execute`.

### Live dry-run placeholder

```
status: not_executed_in_phase_3
reason: phase_scope_forbids_production_retries
next: operator runs audit/retry dry-run post-deploy, then controlled execute per runbook
```

## D. Safety confirmation

- Default path is dry-run
- `--execute` required for mutations
- No DLQ / job deletes in Phase 3 tooling
- Stale news cannot enter auto-publish retry selection (`onlySafeAutoPublish`)
