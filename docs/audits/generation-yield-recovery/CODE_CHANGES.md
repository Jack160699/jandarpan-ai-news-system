# Code Changes

## Summary

Restore generation yield by selecting only fresh events whose `signal_ids` still resolve, demoting stale orphans in priority scoring, classifying missing-signal outcomes, and adding safe quarantine tooling.

## Files

| Path | Change |
|---|---|
| `src/lib/news/ai/event-signal-yield.ts` | **New** — window helpers, classification, resolvable filters |
| `src/lib/news/ai/event-signal-yield.test.ts` | **New** — unit tests |
| `src/lib/news/ai/generate-article.ts` | Freshness window query; prefilter resolvable signals; classified skip reasons; `candidatePool` / `skipReasonCounts` |
| `src/lib/news/ai/editorial-types.ts` | Optional yield observability fields |
| `src/lib/infrastructure/workers/editorial-priority.ts` | Steep age penalty; hard demotion after 7d |
| `src/lib/infrastructure/workers/editorial-priority.test.ts` | Fresh vs orphan ranking test |
| `src/lib/infrastructure/jobs/handlers.ts` | Persist skip/pool metrics on job result |
| `src/lib/ops/generation-yield-repair.ts` | Dry-run quarantine tooling |
| `src/lib/ops/generation-yield-repair.test.ts` | Eligibility tests |
| `scripts/generation-yield-repair.ts` | CLI |
| `package.json` | `ops:generation-yield-repair` script |

## Out of scope (intentionally untouched)

- Public reader design
- Translation recovery
- Ingestion dedupe
- SEO / admin UI
- Quality gate thresholds
