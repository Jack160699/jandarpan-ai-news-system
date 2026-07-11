# JDP-020 — Monetization UI V3 Migration Guide

## Overview

Monetization UI V3 is a **presentation-layer** redesign for reader-facing monetization surfaces: premium banners, membership cards, ad containers, sponsored story layouts, newsletter signup, and donation cards.

**Default:** OFF. Production is unchanged until you opt in.

**Scope:** UI only — no payment or checkout integration.

---

## Activation

Set in `.env.local` or Vercel environment variables:

```bash
NEXT_PUBLIC_MONETIZATION_V3=1
```

Restart the dev server after changing public env vars.

| Value | Behavior |
|-------|----------|
| unset / `0` | Legacy `mnr-*` monetization components |
| `1` | JDP-020 `mnv3-*` monetization UI |

---

## Components

| Component | Purpose |
|-----------|---------|
| `PremiumBanner` | Premium membership promotion with perks and CTA |
| `MembershipCard` | Plan card with features (subscribe disabled) |
| `AdContainer` | Polished ad placement shells (leaderboard, rectangle, sidebar, in-feed, header-strip) |
| `SponsoredStoryLayout` | Sponsored disclosure header + article body + footer |
| `NewsletterSignup` | Email capture card (uses existing newsletter API) |
| `DonationCard` | Suggested amounts UI (donate disabled — coming soon) |

---

## Integration points

```
/membership
  └─ [V3 OFF] MembershipPlansPage (legacy mnr-*)
  └─ [V3 ON]  MembershipExperienceV3

AdSlot
  └─ [V3 OFF] mnr-unit shells
  └─ [V3 ON]  AdContainer shells (same placement logic)

Article / story sponsored content
  └─ [V3 OFF] SponsoredStoryBanner
  └─ [V3 ON]  SponsoredStoryLayout wrapper
```

---

## File structure

```
src/features/monetization-v3/
├── config.ts
├── index.ts
├── MIGRATION.md
├── MembershipExperienceV3.tsx
├── styles/monetization-v3.css
└── components/
    ├── PremiumBanner.tsx
    ├── MembershipCard.tsx
    ├── AdContainer.tsx
    ├── SponsoredStoryLayout.tsx
    ├── NewsletterSignup.tsx
    └── DonationCard.tsx
```

---

## Rollout checklist

- [ ] Set `NEXT_PUBLIC_MONETIZATION_V3=1` in Preview environment
- [ ] Verify `/membership` — plans, donation card, newsletter
- [ ] Verify story pages with sponsored content
- [ ] Verify ad slots on home and story pages
- [ ] Confirm reduced-motion and dark/light theme
- [ ] Promote to production when ready

---

## Rollback

Remove or set `NEXT_PUBLIC_MONETIZATION_V3=0`. Legacy monetization UI renders immediately — no code deploy required beyond env change.
