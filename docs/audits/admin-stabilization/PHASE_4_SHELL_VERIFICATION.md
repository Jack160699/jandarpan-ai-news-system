# Phase 4 Shell Verification

**Date:** 2026-07-19  
**Method:** Code inspection + unit tests (authenticated browser QA blocked without E2E credentials).

| Check | Result | Evidence |
|---|---|---|
| Editor `[id]` inside Admin V3 shell | Pass | `editor/[id]/page.tsx` wraps workbench in `AdminShell` |
| Editorial workspace active on editor | Pass | `resolveWorkspaceFromPath('/admin/editor/…')` → `editorial` |
| Page-level editor errors stay in shell | Pass | `AdminPageErrorBoundary` wraps content |
| Team/Settings/Sign out not in sidebar nav list | Pass | Secondary workspaces → account menu only |
| No Collapse on mobile/tablet drawer | Pass | Collapse rendered only when `desktopViewport` (≥1200) |
| Mobile routes full width | Pass | Existing `admin-v3.css` drawer overrides + no collapsed class off-desktop |
| Desktop collapse preference | Pass | `localStorage` `jd-admin-sidebar-collapsed` + `shellCollapsed` |
| Orange settings CSS not shipped | Pass | Import removed; file deleted |
| More tools expandable in drawer | Pass | Tiered `primaryNavItems` / `secondaryNavItems` + label |
| Command search reaches secondary tools | Pass | `CommandMenu` lists permitted workspace items + actions |
| Restricted Team/Schema hidden | Pass | Super-admin filter in shell + command menu |

## Sidebar modes

| Viewport | Mode |
|---|---|
| ≥1200 | Fixed sidebar; expand/collapse preference |
| 768–1199 | Off-canvas drawer (existing CSS `@media max-width: 1199px`) |
| &lt;768 | Off-canvas drawer; no Collapse; full-width labels |

## Gaps

- Authenticated Playwright drawer screenshots not re-run in this environment.
- `admin-v2.css` still loaded for residual class names (non-orange settings path).
