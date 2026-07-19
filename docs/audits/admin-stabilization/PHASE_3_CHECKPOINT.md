# Phase 3 Checkpoint — Admin Route Performance

**Date:** 2026-07-19  
**Baseline Phase 2:** `e85ec268f79e7eb33980690df3a2fa6bf0369b8a`  
**Local commit:** confirm with `git rev-parse HEAD` after commit  
**Pushed / deployed:** No

## Root causes addressed

1. Editorial dashboard loaded on every shelled admin route via `AdminProvider`.
2. Technical home risked full `/ops/health` on first paint.
3. Owner overview / health pages could be blanked by one slow source.
4. Desk queries selected more rows/columns than needed for counts.
5. Inconsistent client fetch timeouts and ad-hoc `fetch` usage on platform pages.

## Changes

- `isEditorialDashboardRoute` allowlist + hook `enabled` gating
- Technical home → `health-summary` first; diagnostics disclosure-only
- Health panel → `adminGet` + progressive last-known / stale states
- Overview daily → `Promise.allSettled` + partial availability
- `fetch-dashboard` head counts + projections + limit 40
- `admin-fetch` standard adopted on technical/health clients
- CommandCentre seeds shared canonical status to reduce duplicate status work
- Tests: `dashboard-poll-state.test.ts`, `phase3-performance.test.ts`

## Deliverables

- `PHASE_3_PERFORMANCE_BASELINE.md`
- `PHASE_3_PERFORMANCE_AFTER.md`
- `PHASE_3_QUERY_CHANGES.md`
- `PHASE_3_CHECKPOINT.md`

## Acceptance

| Criterion | Result |
|---|---|
| Business / Settings do not fetch full editorial dashboard | Pass (route gate + tests) |
| Technical home does not call heavy health on load | Pass (source + tests) |
| Health survives one slow source | Pass (timedSource + summary contract) |
| Overview returns partial payload | Pass (assembleDailyPayload test) |
| Sidebar does not trigger dashboard refetch | Pass (path-only gate) |
| Hidden tab pauses polling | Pass (admin-poll + tests) |
| Authenticated wall-clock targets | Blocked — no E2E credentials |

## Remaining (Phase 4+)

- Authenticated HAR / TTI proof with E2E credentials
- Unify SEO/cost page polling under `admin-poll`
- Persist notification acknowledgement beyond process memory
- Optional indexes after query plan evidence

## Rollback

Reset to Phase 2 commit `e85ec268f79e7eb33980690df3a2fa6bf0369b8a` if needed (local only; do not force-push).
