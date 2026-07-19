# Generation Yield Recovery — Before State

Captured: 2026-07-19T19:30Z (approx)  
Production SHA: `560f47d8f5145c8a320c4750e02f9fdf706af02e`  
Production deploy: `dpl_hptDZzT1rH8JP7pcjtHyUnwhWQbq`  
Rollback branch: `backup/before-generation-yield-recovery` @ `560f47d`

## Queue (`editorial_generate`)

| Metric | Value |
|---|---|
| Pending | 18 → 15 (draining during capture) |
| Processing | 0 |
| Failed | 0 |
| Dead | 0 |
| Completed (24h) | 21–23 |
| Oldest pending age | ~9.8h |

Recent completed job results (sample): `generated=0 published=0 skipped=6` with empty errors — wake-ups finish by skipping the full batch.

## Publication / generation (24h)

| Metric | Value |
|---|---|
| Generated articles created | 2 |
| Published (`published_at` in 24h) | 3 |
| Events created | ~83 |
| Signals created | ~1503 |

## Event ↔ signal resolvability

| Pool | Count |
|---|---|
| Events in last 7d | 799 |
| Of which resolvable (`news_signals` row exists) | 799 |
| Unused resolvable in 7d | 789 |
| Top-40 by `urgency_score` with zero resolvable signals | 34 / 40 |
| Top-40 average age | ~28.1 days |

## Feeder lanes (pending / completed 24h)

| Job type | Pending | Completed (window) |
|---|---|---|
| `editorial_generate` | 15 | 23 |
| `embed_signals` | 43 | 47 |
| `event_cluster` | 38 | 42 |

Feeder is alive; generation is not starving from a stopped enqueue path.

## Exports

- `data/before_generation_jobs.csv`
- `data/events_without_signals.csv`
- `data/jobs_without_dependencies.csv`
