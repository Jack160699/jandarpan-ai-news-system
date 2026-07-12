# JDP-031 — Jan Darpan V3.1 Homepage UX Specification

**Project Phoenix · UX Renaissance**  
**Status:** Implementation spec  
**Audience:** 18–35, fast readers, one-handed mobile usage  
**Constraint:** Same backend, APIs, and feed contract (`GeneratedHomepageFeed`)

---

## 1. Design North Star

The first screen must answer in under 2 seconds:

> **"What happened near me?"**

Everything else is secondary. The homepage is a **calm reading surface** — not a dashboard, not a government portal, not a widget grid.

---

## 2. Information Architecture

```
Homepage (single scroll, one hierarchy)
├── Local Pulse          — district context + local alerts + nearest headline
├── Lead Story           — one dominant story (breaking → editors pick)
├── [Ad: home_leaderboard]
├── Quick Scan           — thumb-scroll headline rail (fast readers)
├── Story Feed           — vertical compact cards
├── [Ad: home_mid_feed]
├── Near You             — hyperlocal district stories
├── Live Wire            — only when live items exist
├── Continue Reading     — only when reading memory exists
├── For You              — personalized / trending fallback
└── Discover Strip       — minimal horizontal discovery chips
```

**Removed from V3:** verbose greeting, weather placeholders, widget grid, bulky Today's Brief card, duplicate explore grid.

---

## 3. Component Hierarchy

```
HomepageLiveView (unchanged shell)
└── LiveNewsroomProvider
    └── HomeExperienceV3 (V3.1 composer)
        └── PageContainer
            ├── LocalPulseSection
            │   ├── DistrictQuickSwitch (existing)
            │   └── LocalBreakingAlerts (existing)
            ├── LeadStorySection
            │   ├── HeroCard / EditorialCard hero
            │   └── AISummary (slim, 2-line max)
            ├── AdSlot home_leaderboard
            ├── QuickScanSection
            ├── StoryFeedSection
            │   └── CompactCard × N
            ├── AdSlot home_mid_feed
            ├── NearYouSection
            ├── LiveWireSection (conditional)
            ├── ContinueReadingSection (conditional)
            ├── ForYouSection
            └── DiscoverStripSection
```

---

## 4. User Scroll Journey

| Zone | User intent | Interaction | Time on screen |
|------|-------------|-------------|----------------|
| **0–100vh** | Orient locally, catch the biggest story | Tap district chip, tap lead hero | 5–15s |
| **100–200vh** | Fast-scan headlines without images | Horizontal thumb swipe | 10–30s |
| **200–400vh** | Read deeper stories | Vertical scroll, tap cards | 30–90s |
| **400vh+** | Personalize, resume, explore | Tap district / recommended / chips | Variable |

**Retention hooks:** district switching (re-ranks Near You), Continue Reading, live pulse dot, personalized For You.

---

## 5. Wireframe (ASCII)

### Mobile (375px)

```
┌─────────────────────────────────────┐
│ Near Raipur · Sat, 11 Jul           │
│ [Raipur][Bilaspur][Durg][Korba]…    │
│ ● Local: Power outage in…           │
│ ● Local: CM visit to…               │
├─────────────────────────────────────┤
│ ┌─────────────────────────────────┐ │
│ │  [BREAKING]                     │ │
│ │  ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓  │ │
│ │  Lead headline in display type  │ │
│ │  One-line summary               │ │
│ └─────────────────────────────────┘ │
│ ✦ AI · 2-line editor summary      │
├─────────────────────────────────────┤
│ [ Sponsored · local journalism ]    │
├─────────────────────────────────────┤
│ Quick Scan                    →     │
│ ┌──────────┐┌──────────┐┌────      │
│ │ Politics ││ Sports   ││ …       │
│ │ Headline ││ Headline ││          │
│ │ 4m ago   ││ 12m ago  ││          │
│ └──────────┘└──────────┘└────      │
├─────────────────────────────────────┤
│ More Stories                        │
│ ─────────────────────────────────   │
│ [img] Compact headline + meta       │
│ ─────────────────────────────────   │
│ [img] Compact headline + meta       │
│ ─────────────────────────────────   │
├─────────────────────────────────────┤
│ [ Mid-feed ad ]                     │
├─────────────────────────────────────┤
│ Near You · Raipur            View → │
│ [img] District story                │
│ [img] District story                │
├─────────────────────────────────────┤
│ ● Live · Headline card → → →        │
├─────────────────────────────────────┤
│ Continue · 67% ████████░░             │
├─────────────────────────────────────┤
│ For You                             │
│ [img] Recommended story             │
├─────────────────────────────────────┤
│ [Shorts][Listen][Search][AI][Politics]│
└─────────────────────────────────────┘
│ ■ Home  Search  Saved  Profile      │  ← app chrome (unchanged)
└─────────────────────────────────────┘
```

### Tablet (768px)

- Quick Scan shows 2.5 cards; Story Feed becomes 2-column grid from card 3 onward.
- Lead hero max-height 420px; image aspect 16:9.

### Desktop (1024px+)

- Page max-width 720px centered (reading column — Apple News pattern).
- Quick Scan shows 3 cards; Story Feed 2-column uniform grid.
- Ads inset within reading column, never full-bleed beyond container.

---

## 6. Spacing System

All values from JDS tokens (`--jds-space-*`).

| Token | px | Usage |
|-------|-----|-------|
| `xs` | 4 | Inline dot gaps |
| `sm` | 8 | Chip internal padding |
| `md` | 16 | Card padding, rail gap |
| `lg` | 24 | Section internal gap |
| `xl` | 32 | Hero padding |
| `2xl` | 48 | Between major sections (mobile) |
| `3xl` | 64 | Between major sections (desktop) |

**Page horizontal padding:** `lg` mobile, `xl` tablet+  
**Section vertical rhythm:** `2xl` mobile, `3xl` desktop  
**Card internal:** `md` compact, `lg` hero

---

## 7. Card Priorities

| Priority | Card | Purpose | Max count |
|----------|------|---------|-----------|
| P0 | Lead Hero | Single most important story | 1 |
| P1 | Local alert row | Hyperlocal urgency | 3 |
| P2 | Quick Scan tile | Headline-only fast read | 6 |
| P3 | Story Feed compact | Depth reading | 8 |
| P4 | Near You compact | District relevance | 5 |
| P5 | Live wire tile | Real-time updates | 8 |
| P6 | For You compact | Personalization | 6 |

**Rule:** One purpose per card. No card combines navigation + story + widget.

---

## 8. Typography Hierarchy

| Level | Token / style | Usage |
|-------|---------------|-------|
| Display | `--jds-text-hero` / `--jds-font-display` | Lead headline only |
| H2 | `--jds-text-h2` | Section titles (via SectionHeader) |
| Body | `--jds-text-body` / `--jds-font-body` | Summaries, feed excerpts |
| UI | `--jds-text-caption` / `--jds-font-ui` | Quick Scan headlines |
| Meta | `--jds-text-meta` / `--jds-font-meta` | Timestamps, districts, labels |

**Line length:** max 65ch for body text.  
**Quick Scan:** 3-line clamp max.  
**Lead summary:** 2-line clamp.

---

## 9. Motion Philosophy

- **Duration:** 180–220ms for enters; 240ms max.
- **Easing:** `--jds-ease-standard`.
- **Enter:** 8px translateY + opacity fade (sections only, once).
- **Live dot:** subtle pulse 1.6s (respects `prefers-reduced-motion`).
- **No:** parallax, staggered card cascades, floating FABs, auto-carousels.
- **Scroll:** `scroll-snap-type: x mandatory` on Quick Scan and Discover Strip only.

---

## 10. Color Usage

| Role | Token | When |
|------|-------|------|
| Brand accent | `--jds-color-brand-primary` | Active district chip, progress bar |
| Breaking | `--jds-color-breaking` | Breaking badge, live dot |
| AI | `--jds-color-ai` | AI summary icon, AI discover chip |
| Text primary | `--jds-color-text-primary` | Headlines |
| Text tertiary | `--jds-color-text-tertiary` | Meta, dates |
| Surface | `--jds-color-surface-primary` | Cards |
| Border subtle | `--jds-color-border-subtle` | Dividers, card outlines |

**Calm rule:** max one accent color per viewport height. Breaking red OR brand red, never both competing.

---

## 11. Empty States

| Section | Empty behavior |
|---------|----------------|
| Local Pulse | Show district chips; hide alert block |
| Lead Story | Never empty (feed validation guarantees lead) |
| Quick Scan | Hide section if < 2 stories |
| Story Feed | Hide section if empty |
| Near You | EmptyState: "No district stories yet" + link to district page |
| Live Wire | **Hide entire section** (no empty placeholder) |
| Continue Reading | Hide (conditional render) |
| For You | Hide if no items |

---

## 12. Loading States

| Section | Skeleton |
|---------|----------|
| Local Pulse | Chip row + text bar |
| Lead Story | Full-width media skeleton 4:3 |
| Quick Scan | 3 horizontal text blocks |
| Story Feed | 4 compact card skeletons |
| Near You | 2 compact skeletons |
| Live Wire | 3 rail card skeletons |
| For You | 3 compact skeletons |

Below-fold sections use `LazyV3Section` with `aria-busy` until mounted.

---

## 13. Personalization Strategy

**Signals (existing, unchanged):**
- `homeDistrict` → Near You pool, Local Pulse label
- `followedDistricts` → district chip follow state (right-click)
- `interests` → For You ranking via `buildRecommendedArticles`
- Reading memory → Continue Reading
- Language → `useLocalizedFeed`

**Surface personalization without noise:**
1. District name in first line
2. For You section title switches to "For You" vs "Trending Now"
3. Recommended reason shown as category chip when available

**No** homepage module reorder panel in V3.1 (reduces cognitive load).

---

## 14. AI Placement

| Location | Format | Purpose |
|----------|--------|---------|
| Lead Story | Slim `AISummary` (2-line clamp) | Context for lead article |
| Discover Strip | "AI" chip → command palette | Discovery, not intrusion |

**Not on homepage:** full AI chat, AI-generated widget placeholders, weather AI.

Morning Brief / Listen remain linked from Discover Strip (`/morning-brief`, `/listen`).

---

## 15. Ad Placement

| Slot ID | Position | Format |
|---------|----------|--------|
| `home_leaderboard` | After Lead Story | Premium banner, labeled |
| `home_mid_feed` | After Story Feed | Native rectangle |

**Rules:**
- Ads never appear above Local Pulse or Lead Story
- Max 2 ad slots per homepage session
- Uses existing `AdSlot` + monetization provider
- `role="complementary"` + ad labeling from settings

---

## 16. Accessibility

- Single `h1` on page (app chrome); sections use `h2` via SectionHeader + `sr-only` where needed
- Quick Scan rail: `role="list"` / `role="listitem"`
- Live progress: `role="progressbar"` with `aria-valuenow`
- District chips: `aria-pressed` for active state
- Focus rings via JDS `focusRingClass` on all interactive cards
- Touch targets ≥ 44px (`tap-target` class)
- Color contrast WCAG AA on all text pairs
- `prefers-reduced-motion` disables enter animations and live pulse

---

## 17. Mobile Gestures

| Gesture | Target | Action |
|---------|--------|--------|
| Vertical scroll | Page | Primary navigation |
| Horizontal swipe | Quick Scan, Live Wire, Discover | Rail navigation |
| Tap | Any card | Navigate to story |
| Tap | District chip | Set home district (re-renders Near You) |
| Long-press / right-click | District chip | Toggle follow |
| Pull | — | Not implemented (no refresh gesture; live polling handles updates) |

---

## 18. Tablet Adaptation (768–1023px)

- `PageContainer` padding increases to `--jds-space-xl`
- Story Feed: 2-column CSS grid
- Quick Scan cards: `min(340px, 45vw)`
- Lead hero image: 16:9 aspect, max-height 400px

---

## 19. Desktop Adaptation (1024px+)

- Reading column max-width **720px** centered (calm, not magazine-wide)
- Story Feed: 2-column grid, equal card heights per row
- Quick Scan: 3 visible cards
- Section gaps increase to `--jds-space-3xl`
- Hover states on cards: subtle border tint + 1px lift (disabled with reduced motion)

---

## 20. Activation

```bash
NEXT_PUBLIC_HOME_V3=1
```

Rollback: unset flag → legacy `PersonalizedHomepageBody`.

---

## 21. Files

```
src/sections/homepage/v3/
├── HomeExperienceV3.tsx
├── hooks/useHomeV3Data.ts
├── sections/
│   ├── LocalPulseSection.tsx
│   ├── LeadStorySection.tsx
│   ├── QuickScanSection.tsx
│   ├── StoryFeedSection.tsx
│   ├── NearYouSection.tsx
│   ├── LiveWireSection.tsx
│   ├── ContinueReadingSection.tsx
│   ├── ForYouSection.tsx
│   └── DiscoverStripSection.tsx
├── styles/home-v31.css
└── skeletons/
```
