# Coverage Controller

`src/lib/autonomous/coverage-controller.ts`

## Behavior

1. Load per-district published counts for the UTC day.
2. Compare to registry `dailyTarget` → `deficit = max(0, target - published)`.
3. Sort by deficit (desc), then tier priority, then target.
4. Return a `CoveragePlan`.

## Shadow

- `AUTONOMOUS_ROLLOUT_STAGE` defaults to `shadow`.
- `isAutonomousPublishingEnabled()` is **false** in shadow.
- Cron returns `{ mode: 'shadow', plan }` and logs the plan — **no publish**.

## Kill switch

`AUTONOMOUS_KILL_SWITCH=1` → cron returns `{ mode: 'paused' }`.
