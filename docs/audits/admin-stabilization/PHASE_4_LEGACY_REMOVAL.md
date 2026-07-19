# Phase 4 Legacy Removal

**Date:** 2026-07-19

## Removed (unused / superseded by Admin V3)

| Asset | Reason |
|---|---|
| `src/styles/platform-settings.css` | Orange glow / command-hero theme; globally shipped on every admin page |
| Layout import of `platform-settings.css` | Dropped from `src/app/admin/layout.tsx` |
| `PlatformSettingsDashboard.tsx` | Dead; live settings use `Av3SettingsDashboard` |
| `platform-settings/CommandHero.tsx` | Operational hero / metrics |
| `platform-settings/OperationsRail.tsx` | Ops metrics rail |
| `platform-settings/AmbientBackdrop.tsx` | Decorative glow |
| `platform-settings/ActivityTimeline.tsx` | Newsroom activity |
| `platform-settings/AiRecommendations.tsx` | AI health-style panel |
| `platform-settings/CommandPalette.tsx` | Duplicate palette |
| `platform-settings/GlowToggle.tsx` | Orange toggle |
| `platform-settings/HomepageSection.tsx` | Legacy settings cards |
| `platform-settings/SettingsCard.tsx` / `SettingsSection.tsx` / `SyncIndicator.tsx` | Legacy card system |
| `platform-settings/hooks/useNewsroomMetrics.ts` | Only used by removed hero/rail |
| `platform-settings/hooks/useAnimatedCounter.ts` | Only used by removed hero/rail |

## Retained

| Asset | Reason |
|---|---|
| `platform-settings/hooks/usePlatformConfig.ts` | Used by `Av3SettingsDashboard` |
| `admin-v2.css` | Still referenced by some legacy panel class names; full purge deferred |
| `admin-newsroom.css` | Shared newsroom/editor styles including `.jd-editor-*` |

## Settings page

Live route: `Av3SettingsDashboard` — configuration only (no operational hero, article stats, or AI health dashboard).

## Public site

No public reader CSS or pages were modified.
