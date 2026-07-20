# GNews Quota Plan

Planner lives in `src/lib/autonomous/gnews-quota-planner.ts`.

## Allocation (must sum 100%)

| Bucket | Share |
|--------|------:|
| gaps (under-covered districts) | 40% |
| statewide | 20% |
| second_pass | 20% |
| topical | 10% |
| reserve | 10% |

## Integration rules

- Uses a persisted-planner interface + in-memory implementation for tests.
- Reads conceptual ledger fields (`requests_used`, `requests_limit`, `reserve_remaining`).
- Does **not** replace or break `markProviderQuotaExhausted` in `source-state.ts` — hard 429s still flow through the provider path.
- Builds gap query lists for under-covered districts from the coverage plan.
