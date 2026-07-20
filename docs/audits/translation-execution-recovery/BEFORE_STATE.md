# Translation Execution Recovery — Before State

Captured: **2026-07-20 ~07:35 UTC**  
Production deployment (pre-fix): `dpl_E9ZozUVocJiDtN55xtGT8JNKS4n6` @ `557f9b5`  
Queue table: `worker_jobs` (`job_type=translate_article`)

## Corpus coverage (published + approved)

| Metric | Value |
|---|---:|
| Published Hindi | 877 |
| Hindi with EN (headline+summary in translations / editorial_metadata) | 536 |
| **HI→EN coverage** | **61.1%** |
| Published English | 2 |
| EN→HI coverage | 0.0% (0/2) |

## Generation window

| Metric | Value |
|---|---:|
| Generated last 24h | 29 (all Hindi) |
| Generated last 72h | 37 |
| Published+approved last 24h | 8 |
| Step 1 window articles (since 2026-07-19 12:00 UTC) | 29 |
| Step 1 with EN translation | **0** |
| Step 1 with pending EN job | 8 |

## Active queue

| Metric | Value |
|---|---:|
| Valid HI→EN pending | **28** |
| EN→HI pending | 0 |
| CG pending | 0 |
| CG failed/quarantined | **6** |
| Dead `article_not_found` (wire-* IDs) | **24** |
| Processing | 0 |
| Stale claims | 0 |
| Pending with retries | 0 |
| Avg pending priority | 6.00 |
| Oldest HI→EN pending age | **~49.3 h** |
| Average HI→EN pending age | **~17.1 h** |
| HI→EN completed last 24h | **1** |
| HI→EN failed last 24h | 0 |

## Log evidence (pre-fix)

Every `/api/cron/translation-backfill` run in the last 24h:

- `trigger=scheduled_cron`
- `enqueued=20`
- **`processed=0`**

Examples: `2026-07-20T06:20`, `2026-07-20T00:20`, `2026-07-19T18:20`, `2026-07-19T12:20`.

No `urgencyScore` / `ReferenceError` on active pending rows.

## CSV exports (metadata only)

- `data/translation_jobs_before.csv` — 28 eligible HI→EN pending
- `data/translation_failures_before.csv` — wire dead + CG quarantined
- `data/translation_duplicates_before.csv` — 0 active duplicates
- `data/translation_missing_dependencies.csv` — 24 wire `article_not_found`
- `data/disabled_language_jobs.csv` — 6 CG quarantined
