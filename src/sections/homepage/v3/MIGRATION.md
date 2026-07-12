# JDP-031 — Jan Darpan V3.1 Homepage

## Overview

V3.1 is a **local-first, calm** homepage presentation rebuild. It consumes the same `GeneratedHomepageFeed` and personalization providers — no backend, API, or data changes.

**Default:** OFF. Production is unchanged until you opt in.

Full UX specification: [`docs/JDP-031-HOMEPAGE-UX-SPEC.md`](../../../docs/JDP-031-HOMEPAGE-UX-SPEC.md)

---

## Activation

```bash
NEXT_PUBLIC_HOME_V3=1
```

Restart the dev server after changing public env vars.

| Value | Behavior |
|-------|----------|
| unset / `0` | Legacy `PersonalizedHomepageBody` |
| `1` | Jan Darpan V3.1 `HomeExperienceV3` |

---

## Reading order (V3.1)

1. **Local Pulse** — district context, chips, local alerts, top local headline
2. **Lead Story** — single hero (breaking → editors pick) + slim AI summary
3. **Ad** — `home_leaderboard`
4. **Quick Scan** — thumb-scroll headline rail
5. **Story Feed** — compact vertical/grid cards
6. **Ad** — `home_mid_feed`
7. **Near You** — district stories (no placeholder widgets)
8. **Live Wire** — hidden when empty
9. **Continue Reading** — hidden when no reading memory
10. **For You** — personalized with trending fallback
11. **Discover Strip** — horizontal chips (Brief, Shorts, Listen, Search, AI, categories)

---

## File structure

```
src/sections/homepage/v3/
├── HomeExperienceV3.tsx
├── hooks/useHomeV3Data.ts
├── sections/          # V3.1 section components
├── components/LazyV3Section.tsx
├── skeletons/
├── styles/home-v31.css
└── MIGRATION.md
```

---

## Rollback

Remove or set `NEXT_PUBLIC_HOME_V3=0`. Legacy homepage renders immediately.
