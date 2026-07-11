# JDP-014 — Profile Experience V3 Migration Guide

## Overview

Profile Experience V3 is a complete reader profile **presentation** redesign at `/archive`. It consumes the same reader session, preferences, reading memory, and homepage layout data as the legacy archive page — no authentication, API, or backend changes.

**Default:** OFF. Production profile page is unchanged until you opt in.

---

## Activation

Set in `.env.local` or Vercel environment variables:

```bash
NEXT_PUBLIC_PROFILE_V3=1
```

Restart the dev server after changing public env vars.

| Value | Behavior |
|-------|----------|
| unset / `0` | Legacy `ArchivePageContent` (production default) |
| `1` | `ProfileExperienceV3` profile flow |

---

## Architecture

```
/archive/page.tsx (unchanged route + SEO)
  └─ PageShell → ArchivePageContent
       └─ [V3 OFF] legacy panels
       └─ [V3 ON]  ProfileExperienceV3
```

### Section map

| Section | Data source |
|---------|-------------|
| Personal Dashboard | `useReaderAccount`, reading memory |
| Reading History | `EditorialIntelligenceProvider`, `reading-memory` |
| Saved Stories | `memory.bookmarks` |
| Reading Streak | `ReaderAccountProvider` (local streak) |
| Followed Topics | `useReaderAccount().interests` |
| Followed Districts | `useHomepageLayout().followedDistricts` |
| AI Preferences | `cgb-profile-v3-prefs` (localStorage) |
| Notification Preferences | `cgb-profile-v3-prefs` (localStorage) |
| Language Settings | `useLanguage()` |
| Appearance Settings | `useReaderPreferences()` |
| Privacy Settings | `cgb-profile-v3-prefs` (localStorage) |

---

## Rollback

Remove or set `NEXT_PUBLIC_PROFILE_V3=0`. Legacy archive page renders immediately.

---

## Redirects (unchanged)

- `/profile` → `/archive`
- `/saved` → `/archive#saved-stories`
