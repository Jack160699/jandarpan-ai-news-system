# Translation Execution — Root Cause

## Verdict

Valid Hindi→English jobs remained pending because the dedicated translation cron **only enqueued** gaps and never drained `translate_article` jobs. Concurrently, the shared `job_processor` starved translations behind higher-volume `intelligence_snapshot` work at similar priority.

The Phase 4 `urgencyScore` ReferenceError is **fixed and absent** from active pending jobs — it is not the current blocker.

## Confirmed primary cause

| Factor | Evidence |
|---|---|
| `shouldProcessTranslationBackfill("scheduled_cron")` returned `allowed:false` (pre-fix) | Policy required `vercel_backup` / env flags; Vercel cron hits arrived as `scheduled_cron` |
| Cron response always `processed:0` | Runtime logs every 6h: `enqueued=20`, `processed=0` |
| Schedule too infrequent | `vercel.json` was `20 */6 * * *` — enqueue-only every 6 hours |

## Confirmed secondary causes

| Factor | Evidence |
|---|---|
| Priority starvation in shared processor | Pending translate priority **6**; intelligence jobs at **5–8**; translator rarely claimed |
| Strict published+approved gate | Handler skipped scheduled/pending Step 1 stories as not eligible for auto-translation |
| Wire dead jobs | 24 `article_not_found` for `wire-*` IDs — permanent, not HI/EN backlog |
| Disabled CG | 6 quarantined — correctly excluded from active pending |

## Root-cause matrix

| Hypothesis | Evidence | Confirmed? | Impact | Fix |
|---|---|---|---|---|
| Translation cron missing | Cron fires; path `/api/cron/translation-backfill` 200 | No | — | — |
| Cron reaches route but does not process | Logs: `processed:0`, gate blocked scheduled_cron | **Yes** | Critical | Default process on scheduled_cron |
| Wrong secret / auth failure | 200 responses with heartbeats | No | — | — |
| Duplicate schedules compete | Single translation-backfill entry | No | — | — |
| Pending status excluded from claim | Claim works for other job types; dedicated lane never called process | Partial | High | Dedicated process lane |
| Stale claims never released | `processing=0` | No | — | — |
| Batch size zero | processLimit default 12 but gate blocked | No | — | — |
| Priority starvation | priority 6 vs intelligence 5–8 | **Yes** | High | Priority default 9 + dedicated jobTypes filter |
| Handler requires published only | Code path `not_published`; Step 1 often scheduled/pending | **Yes** | High for new yield | `isArticleEligibleForAutoTranslation` |
| urgencyScore ReferenceError | Absent on pending; Phase 4 fixed | No (historical) | — | Already fixed |
| Provider key missing | Would skip with `no_openai` if claimed | Unconfirmed until drain | Medium | Verify after process>0 |
| CG polluting backlog | CG status=failed quarantined; pending=0 | No | — | Keep disabled |
| Duplicate jobs | Unique dedupe keys; 0 active dupes | No | — | Idempotency retained |
| Missing article (wire) | 24 dead wire-* | Yes (noise) | Low | Leave dead; exclude from recovery |
| Source version mismatch | Pending attempts=0 never claimed | No | — | — |

## Why coverage stalled at ~61%

Enqueue kept creating HI→EN jobs for published gaps, but nothing executed them. Completions last 24h = **1**. Step 1 generated articles (29) still have **0** EN translations.
