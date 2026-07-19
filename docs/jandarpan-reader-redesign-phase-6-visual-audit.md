# Phase 6 visual audit — Tablet & desktop editorial grid

**Branch:** `feat/jandarpan-reader-design-system`  
**Flag:** `NEXT_PUBLIC_READER_DS=1`  
**Breakpoints verified:** 390 · 768 · 1024 · 1280 · 1440  
**Approved refs:** `public/design-refs/phase-6/approved-phase-6-desktop.html`  
**Screenshot dir:** `docs/jandarpan-reader-redesign/screenshots/phase-6/`  
**CSS:** `src/features/reader-ds/styles/responsive.css`

## Design note

The Plot gallery ships **mobile-only** (390×844) phones. Phase 6 encodes the **premium editorial newspaper grid** called out in `jandarpan-reader-redesign-audit.md` (§10): stop full-bleed stretch of the phone column at ≥768, introduce top primary nav, lead+rail hero, multi-column section feeds, and article reading column + related rail. Approved HTML references document that grid for screenshot compare.

## Architecture

| Concern | Implementation |
|---------|----------------|
| Breakpoints | tablet ≥768 · desktop ≥1024 · wide ≥1280 |
| Shell | `.jd-shell` max-width ~1120→1240 centered |
| Phone nav | `.jd-bottom-nav` (hidden ≥768) |
| Tablet/desktop nav | `DesktopPrimaryNav` (`.jd-desktop-nav`) |
| Homepage | `.jd-home-hero` lead + rail · `.jd-home-sections` 2→3 cols |
| Article | `.jd-article-layout` ~720 reading + 300 related rail (≥1024) |
| District / category | `.jd-hub-layout` lead + list |
| Search | `.jd-search-results` 2-col ≥768 |
| Live | `.jd-live-hero` hero + timeline |
| Transitions | gap/grid ease 180ms; reduced-motion respected |

## Screen-by-screen

| Surface | Ref | Routes | Captures | Major differences | Result |
|---------|-----|--------|----------|-------------------|--------|
| Homepage | g-home-desktop / tablet | `/` | `home-{mobile,tablet,desktop,wide}-*` | Real feed vs mock headlines; ad slots labeled | Pass — lead+rail + top nav; phone unchanged |
| Article | g-article-desktop | `/story/[slug]` | `article-{mobile,tablet,desktop}-*` | Related rail only when related stories exist | Pass — reading column; inline ads labeled |
| District | g-district-desktop | `/district/raipur` | `district-*` | Empty when no district-tagged pool | Pass — hub 2-col when content exists |
| Category | g-category-desktop | `/category/politics` | `category-*` | Empty state when hub has no articles | Pass — chips + top nav |
| Search | g-search-desktop | `/search?q=…` | `search-*` | Result count from real search | Pass — 2-col results ≥768 |
| Live | g-live-desktop | `/live` | `live-*` | Dark canvas + timeline; hero+list ≥768 | Pass |

## Breakpoint checklist

| Viewport | Bottom nav | Top nav | Newspaper grid | Stretch avoided |
|----------|------------|---------|----------------|-----------------|
| 390 mobile | Yes | Hidden | Single column | N/A |
| 768 tablet | Hidden | Yes | Lead stack + 2-col rail/sections | Pass |
| 1280 desktop | Hidden | Yes | Lead+rail · multi-col sections · article rail | Pass |
| 1440 wide | Hidden | Yes | 3-col section feeds | Pass |

## Functional

| Check | Result |
|-------|--------|
| Mobile A1 atoms preserved | Pass |
| Top nav destinations match bottom nav | Pass |
| Sticky ads above bottom nav (phone) / flush bottom (tablet+) | Pass |
| Ads still labeled विज्ञापन / प्रायोजित | Pass |
| Typecheck | Pass |
| Real data only | Pass |

## Limitations

- No pixel desktop mockups in original Plot gallery — refs are Phase 6 editorial-grid specs derived from tokens + audit.
- Related article rail appears only when the story model has related items.
- District/category empty states when feed pools lack tagged stories (honest degradation).

## Preview

_(filled after deploy)_
