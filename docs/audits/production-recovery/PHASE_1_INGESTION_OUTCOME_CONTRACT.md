# Phase 1 — Ingestion Outcome Contract & Provider Classification

Part of the Jan Darpan Production Recovery Program. This phase corrects
`fetch-news` result semantics, provider criticality, cron heartbeat correctness,
and canonical health classification. **The reader-facing website is untouched.**

## Problem recap (from the three-day audit)

- `fetch-news` performs useful ingestion via NewsData + RSS.
- Optional providers (GNews quota) or dead RSS feeds emit soft errors.
- `run-guard` treated any `failed > 0` (where `failed = errors.length`) as a
  full worker failure → `fetch-news` recorded `ok=false` and returned HTTP 500,
  even though hundreds of articles were inserted.
- `canonical-health` then converted that single `ok=false` cron into
  **Critical / 28 / F / "Cron failed: fetch-news"**.

Root cause: soft provider errors were conflated with worker failure, and any
failed cron was hard-forced to platform-Critical with a state-snapped score.

## New shared provider-outcome model

`src/lib/news/providers/provider-classification.ts` is the single source of
truth for how much a provider matters:

| Classification | Meaning | Counts as failure? |
|---|---|---|
| `required` | Run cannot succeed without it (DB persistence) | Yes |
| `preferred` | Primary coverage (NewsData, RSS family) | Yes → optional bucket |
| `optional` | Fallback coverage (GNews) | Yes → optional bucket |
| `disabled` | Intentionally off (config/circuit) | **No** |
| `retired` | Permanently dead upstream | **No** |

Default registry: `persistence=required`, `newsdata=preferred`,
`gnews=optional`, `rss=preferred`. Unknown providers default to `optional` so
they can never dominate health. `summarizeProviderOutcomes()` reduces a set of
per-provider outcomes into `requiredProviderFailures`, `optionalProviderFailures`,
`skipped`, and `newsFamilyHealthy` (at least one news-source family produced).

**A single dead RSS sub-feed is not a provider-family failure** — only a whole
family going dark counts.

## Canonical ingestion outcome contract

`src/lib/news/pipeline/ingestion-outcome.ts` exposes
`classifyIngestionOutcome(input): IngestionOutcome` with:

`status` (`success | degraded | failed`), `ok`, `degraded`, `fetched`,
`inserted`, `duplicates`, `rejected`, `queuedForAI`, `completedProviders`,
`failedProviders`, `optionalProviderFailures`, `requiredProviderFailures`,
`timedOutSafely`, `persistenceSucceeded`, `failureReason`, `startedAt`,
`completedAt`, `durationMs`.

### Rules (deterministic)

**SUCCESS** — persistence succeeded, no meaningful provider degradation
(no optional failures, no skipped providers, not timed out). Includes the
"everything was a duplicate" case (`inserted === 0` but providers healthy).

**DEGRADED** — persistence succeeded AND (one or more optional/preferred
providers failed OR a provider was skipped OR a safe deadline was reached after
useful work). Fallback continued; partial coverage; newsroom kept operating.

**FAILED** — persistence failed (`persistence_failed`), OR every required
source family failed and nothing was fetched (`all_source_families_failed`).

> A run is **never** marked failed solely because `errors.length > 0`.

## HTTP & heartbeat semantics (`src/app/api/fetch-news/route.ts`)

| Outcome | HTTP | Heartbeat (`ops_cron_runs`) |
|---|---|---|
| success | 200 | `ok=true`, `degraded=false`, status `ok` |
| degraded | 200 (`degraded:true`) | `ok=true`, `degraded=true`, status `degraded` |
| failed | 502 | `ok=false`, status `failed` |
| overlap lock | 200 skipped | `ok=true`, `degraded=true` |
| queue backpressure skip | 200 skipped | `ok=true`, `degraded=true` |
| worker threw | 500 | `ok=false` |

Full error/provider detail is preserved in the JSON body for diagnostics in all
cases; degraded runs additionally carry an `incident` describing the situation.

## run-guard change

`src/lib/infrastructure/workers/run-guard.ts` now carries a `degraded` flag and
computes `ok = result.ok !== false && (failed === 0 || result.degraded === true)`.
This is **backward-compatible** for every existing caller (identical when
`degraded` is unset); only a worker that explicitly marks a run degraded may
have soft-error `failed` counts without being flipped to a hard failure.

## Incident language

`describeIngestionOutcome()` and the cron incident builder replace
"Cron failed: fetch-news" with honest language:

- Degraded: **"News ingestion degraded"** — failed provider, reason, fallback
  providers, records inserted, queued for AI, impact.
- GNews quota: **"GNews daily quota exhausted. NewsData and RSS ingestion
  continue. GNews coverage resumes after provider reset."**
- Failed: **"News ingestion failed"** — with `persistence_failed` /
  `all_source_families_failed` reason.
