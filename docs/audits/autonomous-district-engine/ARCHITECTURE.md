# Architecture

Foundation for the Autonomous District Editorial + Image Engine.

## Packages

| Path | Role |
|------|------|
| `src/lib/regional/districts.ts` | 33-district registry + tier targets |
| `src/lib/autonomous/*` | Rollout, coverage, GNews plan, evidence, quality, pacing |
| `src/lib/news/images/*` | Canonical resolver, URL validation, image quality |
| `src/app/api/cron/district-coverage` | Shadow-safe hourly planner |
| `supabase/migrations/066_*.sql` | Coverage / quota / rollout / evidence tables |

## Data flow (shadow)

```
cron :20 → verifyCronRequest → coverage controller → JSON plan
                                         ↓
                              (no publish volume increase)
```

## Safety preserved

- Step 3 cursors / `ingestion_source_state` untouched in behavior.
- Cron auth via `verifyCronRequest` capability pipeline.
- `AI_LOCAL_ENRICH` and Step 4 env/security patterns unchanged.
- Default `AUTONOMOUS_ROLLOUT_STAGE=shadow`.
- Kill switch `AUTONOMOUS_KILL_SWITCH=1` pauses autonomous path.
