# Phase 2 Checkpoint — Health, Notifications, Polling

**Date:** 2026-07-19  
**Baseline Phase 1:** `fc7bad2a238684a42c46d52f823c837a42b05ff5`  
**Local commit:** confirm with `git rev-parse HEAD`  
**Pushed / deployed:** No

## Root causes addressed

1. Header / bell / overview / health used divergent heavy vs light aggregators.
2. Notifications invoked full `runAllHealthChecks` every 60s on every shelled page.
3. Synthetic stability scores (88/62/28) disagreed with diagnostic scores.
4. Polling ignored hidden tabs and refetched on every popover open.
5. Insufficient last-known / freshness semantics.

## Changes

- `getCanonicalHealth()` server cache + last-known + freshness contract
- Stronger `deriveCanonicalHealth` rules (optional providers, timeouts, critical lock)
- `buildIncidentFeed()` lightweight notifications path
- Shared client poll policy + `useAdminNotifications`
- Platform overview summary-first
- Diagnostics attach canonical `snapshot` without replacing the model
- Notification acknowledge/mark_read API with RBAC

## Tests

See commit message / CI local run summary in final phase response.

## Remaining (Phase 3+)

- Gate editorial dashboard poll off non-editorial routes
- Persist acknowledgement beyond process memory
- Unify SEO/cost page polling under the same policy helper
- Authenticated production timing proof (needs E2E credentials)

## Deliverables

- `PHASE_2_HEALTH_CONTRACT.md`
- `PHASE_2_POLLING_AUDIT.md`
- `PHASE_2_NOTIFICATION_VERIFICATION.md`
- `PHASE_2_CHECKPOINT.md`
