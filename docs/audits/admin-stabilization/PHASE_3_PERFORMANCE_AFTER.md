# Phase 3 Performance After

**Date:** 2026-07-19  
**Local commit:** see `PHASE_3_CHECKPOINT.md`  
**Method:** Code-path verification + unit/integration assertions. Authenticated wall-clock still blocked without E2E credentials.

---

## What changed

| Area | Before | After |
|---|---|---|
| Editorial dashboard | Fetched on every shelled admin page | Allowlisted editorial/desk routes only |
| `/admin/technical` | Full `/ops/health` risk on load | `health-summary` first; diagnostics on disclosure |
| `/admin/health` | Summary-first (P2) | Uses `adminGet` standard + progressive sections |
| `/admin/overview` | Parallel sections (P1/P2) | `Promise.allSettled` + shared status seed from daily |
| Desk queries | Broader selects / larger article list | Head counts + projected columns + limit 40 |
| Fetch standard | Ad-hoc `fetch` + timeouts | `admin-fetch` / `admin-poll` shared defaults |

---

## Route request graph (after)

| Route | Editorial dashboard? | Primary data | Heavy `/ops/health` on load? |
|---|---|---|---|
| `/admin/overview` | No | `/api/admin/overview/daily` + shell status/notifications | No |
| `/admin/editorial` | Yes | Dashboard | No |
| `/admin/stories` | Yes | Dashboard | No |
| `/admin/business` | **No** | Business panels only | No |
| `/admin/settings` | **No** | Settings only | No |
| `/admin/technical` | No | `/api/admin/ops/health-summary` | **No** (disclosure only) |
| `/admin/health` | No | `health-summary` | No (disclosure only) |
| `/admin/seo/*` | No | SEO APIs | No |
| `/admin/executive` | No | Executive APIs | No |

---

## Target status

| Target | Status | Evidence |
|---|---|---|
| Shell &lt; 300 ms | Untimed (auth blocked) | Shell unchanged; fewer global fetches |
| Owner summary &lt; 1.5 s | Code target retained | Parallel `timed()` sections + canonical health cache; timings in payload `sources` / `totalMs` |
| Platform summary &lt; 1.5 s | Code target retained | `health-summary` + 4s client budget; 30s server cache |
| Editorial primary &lt; 2 s | Improved query shape | Bounded desk queries; still network-bound |
| Settings shell &lt; 1 s | Improved | No dashboard fetch |
| No indefinite loading | Improved | Partial / stale / timeout section states |
| No page-level blank timeout | Improved | Source-level timeouts; last-known seed |
| No shell+page duplicate dashboard | **Fixed** | `isEditorialDashboardRoute` + tests |
| Hidden-tab pause | **Fixed** (P2 + P3 assert) | `isDocumentHidden` / `shouldSkipBackgroundFetch` |
| No heavy diagnostics on shell load | **Fixed** | Technical + health disclosure-gated |

---

## Remaining infrastructure blockers

- Authenticated production TTI / HAR proof requires E2E admin credentials.
- SEO/cost page-local polling not fully unified under `admin-poll` (deferred; out of Phase 3 critical path).
- Bundle chunk analysis optional follow-up after authenticated Lighthouse.
