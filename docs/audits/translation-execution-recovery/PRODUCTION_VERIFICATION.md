# Production Verification — Step 2

Deployment: `dpl_CsVQ9gRKXGeBGTyHsPo97R6VgHBn` @ `bec66ae`

## Worker runs on new release

| Run (UTC) | Trigger | enqueued | processed | backlogAfter | Duration |
|---|---|---:|---:|---:|---:|
| 2026-07-20 08:10 | scheduled_cron | 20 | **12** | 329 | 101s |
| 2026-07-20 08:40 | scheduled_cron | 20 | **12** | 317 | 75s |

Pre-fix baseline on same path: `processed:0` every run.

## Checklist

- [x] Scheduler fires on new release (`10` / `40`)
- [x] Heartbeat fresh (ok, both runs)
- [x] Valid jobs claimed (`processed=12` twice)
- [x] Completions > 0 (**24** HI→EN completed since deploy)
- [x] Queue / corpus backlog decreases (`backlogAfter` 329→317; pre-deploy pending 28→4)
- [x] Oldest valid pending age improves (49.3h → **26.55h**)
- [x] No `urgencyScore` / new recurring `ReferenceError`
- [x] No new duplicate translations this recovery (1 historical Jul 7/9 pair only)
- [x] CG jobs remain excluded (6 quarantined; 0 pending CG)
- [x] ≥1 Step 1 article receives EN (**8** of 29)
- [x] No unexpected publication flood / P0 incident

## Coverage

| Metric | Before | After |
|---|---:|---:|
| HI→EN coverage (published+approved) | 61.1% (536/877) | **63.9%** (560/877) |
| Step 1 window with EN | 0 | **8** |

## Sample quality (metadata lengths only)

Eight Step 1 articles show non-empty EN headline/summary/body lengths in expected ranges; no empty bundles observed on completed set.
