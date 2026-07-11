# JDP-018 — Executive Analytics Dashboard V3 Migration Guide

## Overview

Executive Analytics Dashboard V3 is a **UI-only** executive command center for `/admin/analytics`. It renders placeholder data and does not call backend APIs. The legacy `EnterpriseAnalyticsPanel` remains the production default until you opt in.

**Default:** OFF.

---

## Activation

Set in `.env.local` or Vercel environment variables:

```bash
NEXT_PUBLIC_ANALYTICS_V3=1
```

Restart the dev server after changing public env vars.

| Value | Behavior |
|-------|----------|
| unset / `0` | Legacy `EnterpriseAnalyticsPanel` (production default) |
| `1` | `AnalyticsDashboardV3` executive dashboard |

---

## Architecture

```
/admin/analytics/page.tsx
  └─ [V3 OFF] AdminShell → EnterpriseAnalyticsPanel
  └─ [V3 ON]  AdminShell → AnalyticsDashboardV3
```

### Widget map

| Widget | Role |
|--------|------|
| `ReadersTodayWidget` | Daily unique readers + sparkline |
| `ActiveUsersWidget` | Live concurrent readers |
| `TopStoriesWidget` | Ranked story table |
| `DistrictHeatmapPlaceholder` | District density grid (placeholder) |
| `AIUsageWidget` | AI feature usage summary |
| `RevenuePlaceholder` | Monetization placeholder |
| `EngagementWidget` | Engagement score + metrics |
| `LiveStatusWidget` | Platform live status strip |
| `PerformanceWidget` | Core Web Vitals / API metrics |
| `SystemHealthWidget` | Infrastructure health checks |

---

## Wiring live data

Pass partial overrides to `AnalyticsDashboardV3`:

```tsx
<AnalyticsDashboardV3 data={{ readersToday: { total: liveCount, ... } }} />
```

Or replace `EXECUTIVE_ANALYTICS_PLACEHOLDER` with a hook that fetches from existing analytics APIs when ready.

---

## Rollback

Remove or set `NEXT_PUBLIC_ANALYTICS_V3=0`. Legacy analytics panel renders immediately.
