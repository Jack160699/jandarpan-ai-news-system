# Phase 1 — Verification

All commands run locally on branch `main`. No push, no deploy.

## Automated checks

| Check | Command | Result |
|---|---|---|
| Typecheck | `npx tsc --noEmit` | ✅ Pass (0 errors) |
| Lint (changed files) | `npx eslint <changed files>` | ✅ 0 errors (1 pre-existing unused-generic warning in `run-guard.ts`) |
| Unit tests (targeted) | `npx vitest run <phase-1 files>` | ✅ 39/39 pass |
| Unit + integration (full) | `npx vitest run` | ✅ 294/294 pass, 65 files |
| Production build | `npm run build` | ✅ Compiled + TS + 121 static pages |

## Test coverage added

`src/lib/news/pipeline/ingestion-outcome.test.ts` (13 tests):

- all providers healthy → success
- one optional RSS feed dead (family healthy) → not failed
- GNews quota exhausted → degraded
- GNews 429 with NewsData + RSS working → degraded
- NewsData unavailable but RSS working → degraded
- RSS partially unavailable, safe deadline → degraded
- all providers unavailable → failed (`all_source_families_failed`)
- database persistence failure → failed (`persistence_failed`)
- useful ingestion reaching safe deadline → degraded
- zero new content (all duplicate) → success
- never failed solely because `errors.length > 0`
- GNews-quota incident language + no "Cron failed" wording

`src/lib/news/providers/provider-classification.test.ts` (6 tests): known/unknown
classification, required-only persistence, required vs optional failure split,
disabled/retired ignored, `newsFamilyHealthy`.

`src/lib/admin-v3/health-scoring.test.ts` (9 tests): weights sum to 1, all-healthy
→ 100/A, optional-provider failure limited impact, degraded ingestion ~80s (not
28), core publishing outage weighs heavily, full ingestion outage reflected but
not zero, DB critical drops score, determinism, grade thresholds.

`src/lib/admin-v3/canonical-health.test.ts` (updated): single ingestion cron
hard-failure → degraded (not critical); degraded ingestion run → degraded; core
publishing cron hard-failure → critical; weighted score ≥ 80 / grade A–B for a
degraded ingestion incident.

## Regression safety

- `src/lib/admin-v3/canonical-health.phase2.test.ts` — 14/14 still pass
  (optional redis/openai not escalated, probe timeouts → warning, cron dedup to
  one family, GNews 429 grouping, incident identity).
- `run-guard` change is backward-compatible: identical `ok` computation for all
  callers that do not set `degraded` (`cron_jobs`, `orchestrate`, per-worker).

## Scope guarantee

No reader-facing route, component, or style was modified. Changes are limited to
ingestion outcome semantics, provider classification, run-guard, `fetch-news`
route, and canonical health/scoring.
