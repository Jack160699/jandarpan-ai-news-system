# Jandarpan Code Cleanup Audit

**Date:** July 2026  
**Scope:** Cleanup and consolidation achieved by (and surrounding) the admin command-centre overhaul  
**Repo:** `jandarpan-ai-news-system` / `newspaper-motion`  
**Stack:** Next.js 16.2.6  

---

## 1. Verdict

The admin platform is in a **cleaned, single-console state**: one shell, one login, one CSS entry for the newsroom OS, workspace IA centralized, legacy dashboard UI removed, and redirects kept thin. Residual dualism is intentional compatibility (`/api/dashboard/auth/*`, deprecated dashboard API headers), not duplicate UX.

---

## 2. Cleanup already completed (platform unification + July IA)

### 2.1 Removed UI surfaces

Documented in `docs/ADMIN_PLATFORM_UNIFICATION.md` and still true in the tree:

- Entire `src/app/dashboard/**` console deleted
- `src/components/dashboard/**` (including `DashboardShell` / panels) deleted
- `saas-dashboard.css` removed in favour of `admin-newsroom.css`
- Dual login pages collapsed to `/admin/login`

### 2.2 July 2026 IA consolidation

**Added / centralized**

| Module | Purpose |
|--------|---------|
| `src/lib/admin-platform/workspaces.ts` | Workspace definitions, landings, path resolution |
| `src/lib/admin-platform/role-landing.ts` | Safe post-login redirect |
| `src/lib/admin-platform/legacy-redirects.ts` | `/dashboard` → `/admin` map + next.config export |
| `src/lib/admin-platform/api-deprecation.ts` | Standard deprecation headers for legacy APIs |
| `src/lib/admin-platform/workspaces.test.ts` | Unit coverage for IA |

**Shell behaviour**

- `AdminShell` reads workspaces instead of a hard-coded flat 29-item list
- Privileged nav policy remains in `src/lib/auth/admin-nav-policy.ts` but href inventory comes from workspaces

### 2.3 Auth recovery (additive, not duplicate)

New pages/APIs for password recovery sit beside existing login/logout without introducing a second IdP or cookie scheme.

---

## 3. Intentional retained “legacy” seams

These are **not** cleanup failures; they preserve clients and bookmarks:

| Seam | Why retained |
|------|--------------|
| `/api/dashboard/auth/*` | Stable cookie + client contracts |
| Deprecated `/api/dashboard/snapshot` & actions | Headers point to `/api/editorial/*` successors |
| `/dashboard` redirects | Bookmarks / shared links |
| Legacy role aliases in `normalizeDashboardRole` | Older membership rows still resolve |

`legacyDashboardApiHeaders(successor)` emits `Deprecation`, `Link: rel=successor-version`, and `X-Platform-Console: admin`.

---

## 4. Redirect cleanup surface

`next.config.ts` only composes:

1. Exact `LEGACY_DASHBOARD_REDIRECTS` (permanent)
2. `/admin/dashboard` → `/admin/overview` (temporary)

Catch-all `/dashboard/*` handling lives in middleware via `mapLegacyDashboardPath`, avoiding a huge static redirect table.

---

## 5. Test & script hygiene relevant to admin/ops

Useful package scripts (not all new in July, but part of operational cleanliness):

- `test` / `test:e2e` — Vitest + Playwright
- `ops:queue-audit` / `ops:queue-cleanup` / `ops:dead-letters*`
- `qstash:setup`
- `schema:verify`

Workspace unit tests assert landings and visibility without needing a browser.

---

## 6. Remaining cleanup opportunities (non-blocking)

These are optional engineering follow-ups, **not** July overhaul blockers:

1. Further migrate any remaining client calls still hitting deprecated dashboard snapshot/action routes (if any remain outside auth).
2. Continue shrinking duplicate permission maps between `saas-auth` and `newsroom-auth` where comments already mark legacy helpers.
3. Audit dead admin CSS selectors left from pre-workspace layouts (visual-only debt).

No production credentials or invented metrics are required to complete those.

---

## 7. Related documents

- `docs/ADMIN_PLATFORM_UNIFICATION.md`
- `JANDARPAN_ADMIN_REDESIGN.md`
- `JANDARPAN_ADMIN_INVENTORY.md`
- `JANDARPAN_END_TO_END_VERIFICATION.md`
