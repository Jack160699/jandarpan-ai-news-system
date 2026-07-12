# JDP-017 — Reels Experience V3 Migration Guide

## Overview

Reels Experience V3 is a premium vertical reels **presentation** redesign. It consumes the same shorts data layer (`fetchShortsPool`, `NewsShortCard`) as the production reels page — no backend, API, or data changes.

**Default:** OFF. Production `/shorts` is unchanged until you opt in.

---

## Activation

Set in `.env.local` or Vercel environment variables:

```bash
NEXT_PUBLIC_REELS_V3=1
```

Restart the dev server after changing public env vars.

| Value | Behavior |
|-------|----------|
| unset / `0` | Legacy `ReelsPage` (production default) |
| `1` | `ReelsExperienceV3` immersive feed |

---

## Architecture

```
/shorts/page.tsx (unchanged server data fetch + SEO)
  └─ [V3 OFF] ReelsPage → ShortsReelsShell
  └─ [V3 ON]  ReelsExperienceV3 → ReelViewer
```

### Component map

| Component | Role |
|-----------|------|
| `ReelViewer` | Full-screen vertical feed with scroll-snap |
| `ReelCard` | Single reel (media, playback, story chrome) |
| `ReelProgress` | Segmented slide progress bar |
| `ReelLike` | Like action (localStorage) |
| `ReelSave` | Bookmark / save action |
| `ReelShare` | Native share or clipboard fallback |
| `ReelReadFullStory` | Link to full article |
| `ReelSwipeNavigation` | Swipe-up hint overlay |
| `ReelsLoading` | Loading skeleton |
| `ReelsEmpty` | Empty feed state |
| `ReelsError` | Error state with retry |

---

## Rollback

Unset `NEXT_PUBLIC_REELS_V3` or set to `0`. No deploy required for env-only rollback.

---

## Accessibility

- `role="feed"` with localized `aria-label`
- Keyboard navigation via `useReelViewport` (Arrow keys, j/k)
- `aria-pressed` on like/save toggles
- `role="progressbar"` on multi-slide progress
- `prefers-reduced-motion` respected via `useMotionConfig`
- 44px minimum touch targets (`tap-target`)
