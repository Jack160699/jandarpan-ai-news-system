# Phase 4 Checkpoint — Shell, Navigation, Legacy Cleanup

**Date:** 2026-07-19  
**Baseline Phase 3:** `7d628d4cf6c149f5d449c222ea9c7bc952f7b1fc`  
**Local commit:** confirm with `git rev-parse HEAD` after commit  
**Pushed / deployed:** No

## Root causes addressed

1. Editor article route rendered outside AdminShell.
2. Editorial (and sibling) navigation overcrowded without primary/More tiers.
3. Team/Settings duplication risk vs account menu (verified account-only).
4. Legacy orange `platform-settings.css` globally imported.
5. Dead PlatformSettingsDashboard tree still in tree.
6. Desktop collapsed styles could leak into drawer contexts.

## Changes

- `/admin/editor/[id]` → AdminShell (`hidePageHeader`) + dense content CSS
- Workspace IA with `tier: primary | secondary` and More tools labels
- AdminShell: viewport-gated collapse; tiered nav expansion
- CommandMenu: role-filtered routes + expanded actions
- Removed platform-settings CSS + dead orange settings components
- Tests: `workspaces.test.ts`, `phase4-shell.test.ts`

## Deliverables

- `PHASE_4_ROUTE_MAP.md`
- `PHASE_4_LEGACY_REMOVAL.md`
- `PHASE_4_SHELL_VERIFICATION.md`
- `PHASE_4_CHECKPOINT.md`

## Remaining (Phase 5+)

- Authenticated mobile/drawer visual QA
- Finish purging residual `admin-v2` / `anr-*` class usage on detail panels
- SEO hub page consolidation (tabs) beyond nav labeling

## Rollback

Reset to Phase 3 commit `7d628d4` if needed (local only).
