# JDP-013 — Notification Center V3 Migration Guide

## Overview

Notification Center V3 is a complete reader **inbox presentation** layer. It uses placeholder data and local UI state — no backend, API, push, or database changes.

**Default:** OFF. Bell icons continue linking to `/live` until you opt in.

---

## Activation

Set in `.env.local` or Vercel environment variables:

```bash
NEXT_PUBLIC_NOTIFICATION_CENTER_V3=1
```

Restart the dev server after changing public env vars.

| Value | Behavior |
|-------|----------|
| unset / `0` | Route `/notifications` returns 404; bell links to `/live` |
| `1` | `/notifications` renders Notification Center V3; bell links to inbox |

---

## Architecture

```
/notifications/page.tsx
  └─ [V3 OFF] notFound()
  └─ [V3 ON]  PageShell → NotificationCenterPage → NotificationCenterExperience
```

### Component map

| Component | Role |
|-----------|------|
| `NotificationHeader` | Title, unread count, select / mark-all / settings |
| `NotificationFilters` | All, Breaking, Government, Saved, Unread tabs |
| `BreakingAlerts` | Priority breaking section |
| `GovernmentAlerts` | Official notices section |
| `SavedAlerts` | Bookmarked alerts tab |
| `NotificationList` | Accessible list wrapper |
| `NotificationCard` | Read/unread, save, selection, link |
| `BatchActions` | Multi-select toolbar |
| `SettingsPanel` | Preferences drawer (UI preview) |
| `NotificationEmptyState` | Per-filter empty states |
| `NotificationLoadingState` | Skeleton loading |

---

## Rollback

Remove or set `NEXT_PUBLIC_NOTIFICATION_CENTER_V3=0`. Route 404s immediately; navigation reverts to `/live`.

---

## Next integration steps (out of scope for JDP-013)

1. Wire `useNotificationCenter` to push / inbox APIs
2. Persist read/saved state to reader account
3. Connect settings panel to notification preferences service
4. Add unread badge count to TopBar from live data
