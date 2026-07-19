# Phase 3 Performance Baseline

**Date:** 2026-07-19  
**Baseline SHA (pre-Phase 3):** `e85ec268f79e7eb33980690df3a2fa6bf0369b8a` (Phase 2)  
**Method:** Code-path analysis + prior audit (`ADMIN_PERFORMANCE_AUDIT.md` @ `60cd89d`).  
**Authenticated wall-clock timings:** Blocked — no `E2E_ADMIN_EMAIL` / `E2E_ADMIN_PASSWORD` in this environment.

---

## Route profiles (before Phase 3 fixes)

| Route | Server TTFB (code risk) | Time to shell | Time to useful primary data | API count (typical) | Duplicate risk | Slowest API | Largest payload risk | Polling | Notes |
|---|---|---|---|---|---|---|---|---|---|
| `/admin/overview` | Medium | Shell OK | Overview daily + shell status | ~4 | Status + daily health + notifications + **editorial dashboard** | GSC / executive / daily | Overview daily multi-section | 60s status/bell/daily; ~3m dashboard | Global dashboard enabled |
| `/admin/editorial` | Medium | Shell OK | Editorial dashboard | 2–3 | Status + bell + dashboard | `/api/editorial/dashboard` | Desk articles + queues | ~3m dashboard | Legitimate |
| `/admin/editor` | Medium | Shell OK | Dashboard (index) | 2–3 | Same | Dashboard | Same | ~3m | Allowlisted |
| `/admin/stories` | Medium | Shell OK | Dashboard | 2–3 | Same | Dashboard | Same | ~3m | Allowlisted |
| `/admin/business` | Medium | Shell OK | Panel APIs | 3+ | **Full editorial dashboard** + status + bell | Dashboard / SEO | Dashboard | Shell polls | **Unnecessary desk fetch** |
| `/admin/technical` | Heavy | Shell OK | Was full `/ops/health` (audit) | 2–3 | Bell + health | `/ops/health` | Full diagnostics | 60s | Heavy initial |
| `/admin/health` | Improved (P2) | Shell OK | `health-summary` | 1–2 | Header status may share cache | Summary probes | Bounded | 60s summary | Progressive |
| `/admin/settings` | Light | Shell OK | Config | 2+ | **Editorial dashboard** | Dashboard | Dashboard | Shell | Unnecessary |
| `/admin/seo/search-console` | Slow when disconnected | Shell OK | GSC | 2+ | Dashboard + GSC | GSC | Provider | On open | Unnecessary desk |
| `/admin/seo/autonomous` | Heavy | Shell OK | Autonomous | 2+ | Dashboard | Analysis | Large | Varies | Unnecessary desk |
| `/admin/executive` | Heavy | Shell OK | Executive | 2+ | Dashboard + costs | Usage scans | Large | Varies | Unnecessary desk |

---

## Critical defects at baseline

1. **Global editorial fetch:** `AdminProvider` → `useEditorialDashboardQuery` enabled on nearly every shelled `/admin/*` route (poll denylist insufficient; initial fetch still ran).
2. **Technical home:** Audit path still treated as full `/ops/health` on first paint.
3. **Owner overview fan-out:** Header `system-status` + `overview/daily` health section + notifications (mitigated in Phase 2 for notifications) still risk duplicate health work without shared client seed.
4. **Page-level blank timeouts:** Historical health 8s abort; risk of timeout-only screens when one source is slow.
5. **Unbounded / heavy desk queries:** Editorial dashboard historically selected wider article pools and `select("*")` on logs.

---

## Targets (Phase 3 acceptance)

| Metric | Target (warm auth nav) |
|---|---|
| Shell visible | &lt; 300 ms |
| Owner primary summary | &lt; 1.5 s |
| Platform summary | &lt; 1.5 s |
| Editorial overview primary | &lt; 2 s |
| Settings shell | &lt; 1 s |
| Duplicate shell+page APIs | None for editorial dashboard on non-desk routes |
| Hidden-tab polling | Paused |
| Heavy diagnostics on shell load | None |

---

## Evidence gaps

- No authenticated Chromium/Network HAR in this run.
- Bundle chunk sizes not measured in CI here; Next build size reported in AFTER doc after `next build`.
