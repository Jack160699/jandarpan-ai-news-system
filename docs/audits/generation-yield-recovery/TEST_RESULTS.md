# Test Results

## Commands

```text
npm run typecheck          → PASS
npx eslint <changed files> → PASS (exit 0)
npm test -- <targeted>     → PASS 40/40
npm run build              → PASS
```

## Targeted suites

| File | Result |
|---|---|
| `event-signal-yield.test.ts` | 6 passed |
| `editorial-priority.test.ts` | 4 passed |
| `generation-yield-repair.test.ts` | 3 passed |
| `editorial-generate-lane.test.ts` | 5 passed |
| `editorial-generate-policy.test.ts` | 4 passed |
| `editorial-backlog-classify.test.ts` | 18 passed |

**Totals:** 6 files, **40 passed**, 0 failed.

## Production build

`next build` (Turbopack) compiled successfully; TypeScript check inside build passed.
