# JDP-003 — Home Experience V3 Migration Guide

## Overview

Home Experience V3 is a complete homepage **presentation** redesign. It consumes the same `GeneratedHomepageFeed` and personalization providers as the legacy homepage — no backend, API, or data changes.

**Default:** OFF. Production is unchanged until you opt in.

---

## Activation

Set in `.env.local` or Vercel environment variables:

```bash
NEXT_PUBLIC_HOME_V3=1
```

Restart the dev server after changing public env vars.

| Value | Behavior |
|-------|----------|
| unset / `0` | Legacy `PersonalizedHomepageBody` (production default) |
| `1` | `HomeExperienceV3` story flow |

---

## Architecture

```
page.tsx (unchanged — server feed fetch + SEO)
  └─ HomepageLiveView
       └─ LiveNewsroomProvider (unchanged)
            ├─ [V3 OFF] HomepageStackBands + PersonalizedHomepageBody + HomepageSeoHub
            └─ [V3 ON]  HomeExperienceV3 (9 editorial sections)
```

### Reading order (V3)

1. **Greeting** — time-based salutation, name, district, date, weather placeholder
2. **Today's Brief** — breaking count, AI summary, Listen + Read Brief CTAs
3. **Breaking Story** — single hero card (largest)
4. **Top Stories** — responsive 2-col grid with tier hierarchy
5. **My District** — placeholders + district news from feed
6. **Live Updates** — horizontal timeline, newest first
7. **Continue Reading** — hidden when no reading history
8. **Recommended** — personalized with trending fallback
9. **Explore** — categories, districts, topics, reels, audio, search

---

## File structure

```
src/sections/homepage/v3/
├── HomeExperienceV3.tsx      # Main composer
├── index.ts
├── hooks/
│   ├── useGreeting.ts
│   └── useHomeV3Data.ts      # Feed → section data (no new APIs)
├── sections/                 # One file per section
├── components/LazyV3Section.tsx
├── skeletons/
├── styles/home-v3.css
└── MIGRATION.md

src/lib/homepage/config.ts    # isHomeV3Enabled()
```

---

## Dependencies (read-only)

| Layer | Usage |
|-------|-------|
| **JDP-001** | `NewsCard`, `HeroCard`, `SectionHeader`, `Badge`, `AISummary`, `Skeleton`, `EmptyState`, `Button` variants |
| **JDP-002** | `PageContainer` (homepage max-width 1280px) |
| **Existing feed** | `GeneratedHomepageFeed` via `useLiveNewsroom` + `useLocalizedFeed` |
| **Personalization** | `useReaderPreferences`, `useReaderAccount`, `useHomepageLayout`, `buildRecommendedArticles` |
| **Reading memory** | `getContinueTarget`, `getRecentReadSlugs` via `EditorialIntelligenceProvider` |

**Do not modify** JDP-001 or JDP-002 source files.

---

## Layout integration

V3 uses `PageContainer width="homepage"` inside the existing `AppLayout` chrome. When JDP-002 `AppShell` replaces `AppLayout`, V3 continues to work — only the outer chrome changes.

To preview with full JDP-002 shell (future):

1. Enable `NEXT_PUBLIC_HOME_V3=1`
2. Swap `AppLayout` → `AppShell` per `src/layouts/README.md`

---

## What stays unchanged

- `src/app/page.tsx` — server fetch, ISR, JSON-LD
- `getCachedGeneratedHomepageFeed()` — feed composition
- All API routes and Supabase queries
- SEO metadata generation
- Analytics instrumentation
- `PersonalizedHomepageBody` — retained for rollback

---

## Rollout checklist

- [ ] Set `NEXT_PUBLIC_HOME_V3=1` in Preview environment
- [ ] Verify all 9 sections render with real feed data
- [ ] Test light + dark mode
- [ ] Test mobile (bottom nav coexistence with existing dock)
- [ ] Test `prefers-reduced-motion`
- [ ] Verify Continue Reading appears after reading a story
- [ ] Verify empty states (no district news, no live updates)
- [ ] Run `npm run typecheck` and `npm run build`
- [ ] Promote to production when satisfied

---

## Rollback

Remove or set `NEXT_PUBLIC_HOME_V3=0`. Legacy homepage renders immediately — no code deploy required beyond env change.
