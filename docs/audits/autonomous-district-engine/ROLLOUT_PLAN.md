# Rollout Plan

## Stages

| Stage | Env value | Publish via autonomous path | Effective daily target |
|-------|-----------|-----------------------------|------------------------:|
| Shadow (default) | `shadow` | No — plan only | 40 |
| Stage 1 | `stage_1` | Yes (when wired) | 60 |
| Stage 2 | `stage_2` | Yes | 100 |
| Stage 3 | `stage_3` | Yes | 160 |

## Controls

- `AUTONOMOUS_ROLLOUT_STAGE` — default **shadow**
- `AUTONOMOUS_KILL_SWITCH=1` — pause

## Cron

`/api/cron/district-coverage` at `20 * * * *` (hourly :20).

**Shadow does not increase publish volume.**

## Status

Foundation = **PARTIAL / SHADOW**. Publish wiring deferred.
