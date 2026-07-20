# Editorial Engine

Foundation modules under `src/lib/autonomous/`:

| Module | Purpose |
|--------|---------|
| `human-quality-score.ts` | 0–100 score; publish threshold 70 |
| `evidence-ledger.ts` | Claim support tracking |
| `publication-pacing.ts` | 6–8/hr normal, 12 breaking; 15–20 min district spacing |
| `rollout-state.ts` | Stage + kill switch |

## Capacity

`editorial-capacity.ts` keeps `dailyLimit: 40` as default.

`AUTONOMOUS_STAGE_TARGETS = { shadow: 40, stage_1: 60, stage_2: 100, stage_3: 160 }`

`getEffectiveDailyLimit()` returns 40 in shadow; raised only when stage is non-shadow.

## Methodology

Public disclosure: `/how-we-report` — AI-assisted drafting + quality gates; no false human-review claims.
