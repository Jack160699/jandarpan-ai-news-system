# Production Verification

Deploy: `dpl_7Juird5aTEssbPjruR3TS412kGRu` / SHA `01632fa` READY.

## Cron runs on new release

| Window (UTC) | Jobs completed | Notes |
|---|---|---|
| 19:50 | 3 wake-ups | release `jan-darpan@01632fa346c1` |
| 20:05 | 3 wake-ups | same release |

## Yield evidence (all post-deploy jobs)

| Job completed_at | generated | skipped | filteredNoSignals | resolvable pool |
|---|---|---|---|---|
| 19:50:32 | 5 | 0 | 0 | 230 |
| 19:50:55 | 5 | 0 | 0 | 225 |
| 19:51:12 | 3 | 0 | 0 | 220 |
| 20:05:29 | 2 | 0 | 0 | 217 |
| 20:05:43 | 2 | 0 | 0 | 215 |
| 20:05:57 | 2 | 0 | 0 | 213 |

- `no_signals_for_event` / dangling skip rate on these jobs: **0%**
- Generated articles after deploy: **19**
- Untitled: **0**
- Pending queue: 15 → **9**
- Oldest pending age: ~9.8h → **~5.8h**

## Quality gates

Still enforcing: rejects for `body_too_short` / `quality_checks_failed` observed; no gate weakening.

## Public publish state

New stories persisted with `editorial_status=pending`, `workflow_status=scheduled`, `published_at=null` (non-breaking path). Batch counter `published` means quality-approved persist, not necessarily immediate live `published_at`.

## Reader availability

`www.jandarpan.news` remained on production aliases of the READY deployment.
