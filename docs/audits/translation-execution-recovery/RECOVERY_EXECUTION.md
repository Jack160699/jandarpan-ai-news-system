# Recovery Execution

## Dry-run classification (pre-deploy)

| Class | Count |
|---|---:|
| eligible_now | 28 |
| disabled_cg | 6 |
| missing_article (wire) | 24 |
| duplicate_active | 0 |
| stale_claim | 0 |

## Execution

No blind full reset. Production drain via dedicated cron after deploy:

| Metric | Value |
|---|---:|
| Eligible processed (2 runs × 12) | 24 |
| Failed since deploy | 0 |
| Quarantined (new) | 0 |
| CG excluded (unchanged) | 6 |
| Newly enqueued historical gaps | 40 across 2 runs |
| Pre-deploy pending remaining | **4** |
| Total HI→EN pending after | **24** (4 old + 20 new enqueues) |
| Completed since deploy | **24** |

Priority bump: 28 pending HI→EN raised to priority 9 via bounded SQL before first cron (non-destructive).

Manual authenticated forceProcess was **not** required; Vercel scheduled cron succeeded. Local `CRON_SECRET` pull is empty (sensitive); scheduled path uses platform auth.
