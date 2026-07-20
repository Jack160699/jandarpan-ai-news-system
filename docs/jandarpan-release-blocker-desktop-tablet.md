# Release blocker — Desktop / tablet Reader DS fidelity

**Date:** 2026-07-20  
**Branch:** `feat/jandarpan-reader-design-system`  
**Source of truth:** `docs/jandarpan-reader-redesign/source-designs/desktop-tablet/jandarpan-desktop-tablet-design-brief.html`

---

## Blocker status

| Item | Status |
|------|--------|
| Desktop/tablet SoT chrome (Util → Brand → CatNav) | **Implemented** |
| Breakpoints 768 / 1024 / 1280 / 1440 + containers 1160/1240 | **Implemented** |
| Homepage desk composition (hero + rail + sections + promos + footer) | **Implemented (structure)** |
| Article share rail + reading ≤680 + opinion purity layout | **Implemented (CSS + rail)** |
| Full page-by-page visual parity (search filters, account dual-rail, photo thumb rail, etc.) | **Partial — remaining mismatches below** |
| **Overall desktop/tablet blocker** | **Partially closed** — not fully closed pending visual score ≥85 on all major screens |

**Unchanged / deferred (by mandate):**
- Razorpay / checkout — deferred and open  
- Market tiles — omitted (no honest feed)  
- Offline downloads — open  
- Production `NEXT_PUBLIC_READER_DS` — remains disabled  

---

## Source frames used

| Frame | Mapped to |
|-------|-----------|
| H01–H04 | `DeskChrome` (util / brand / catnav / sticky / hamburger) |
| D01 / T01 / TP01 | `ReaderHomepage` + responsive grids |
| D03 / T02 / TP02 | `ReaderArticlePage` + `.jd-article-layout` + `ArticleShareRail` |
| D04 | `.jd-article-layout--opinion` |
| D02 / T03 / D07–D11 | Existing pages + shared shell/grid CSS (hub/search/live) |
| D12–D16 | Existing DS pages under shared DeskChrome (composition polish remaining) |

---

## Token / breakpoint changes

| Token | Value |
|-------|--------|
| `--jd-shell` | `#ece6d9` |
| `--jd-line` | `#dcd5c5` (SoT) |
| `--jd-shell-max` | 1160 @1280 · 1240 @1440 |
| `--jd-gutter-x` | 20 / 24 / 28 |
| `--jd-reading-max` | ≤680 desktop |
| `--jd-home-rail-w` | 384 desktop |
| `--jd-share-rail-w` | 56 |

Phone tokens and phone chrome (Masthead / UtilityRow / BottomNav) unchanged below 768.

---

## Files changed (primary)

- `src/features/reader-ds/components/DeskChrome.tsx` (+ deskCatItems)
- `src/features/reader-ds/components/DeskFooter.tsx`
- `src/features/reader-ds/components/ReservedAd.tsx`
- `src/features/reader-ds/components/ArticleShareRail.tsx`
- `src/features/reader-ds/components/ReaderShell.tsx`
- `src/features/reader-ds/styles/tokens.css`
- `src/features/reader-ds/styles/responsive.css`
- `src/features/reader-ds/homepage/ReaderHomepage.tsx`
- `src/features/reader-ds/article/ReaderArticlePage.tsx`
- `src/features/reader-ds/i18n/strings.ts`
- `e2e/reader-ds-smoke.spec.ts`
- This doc + release certification notes

---

## Fidelity (engineering estimate before full screenshot rubric)

| Viewport | Structure | Notes | Est. score |
|----------|-----------|-------|------------|
| 1440 | Desk chrome + footer + home rail | Matches SoT stack; section modules simplified vs all SoT bands | ~82–88 |
| 1280 | Same, container 1160 | Sticky condensed header active | ~82–87 |
| 1024 | Landscape catnav + 3-col sections | Search filter rail / skyscraper not fully rebuilt | ~80–85 |
| 768 | Hamburger + truncated catnav | Closer to SoT H04 than prior 5-tab nav | ~80–86 |
| Phone | Unchanged atoms | Regression expected ≈ prior baseline | ≥ prior |

**Do not treat blocker as fully closed** until screenshot rubric averages ≥85 with no major screen &lt;80.

---

## Remaining mismatches

1. Search left filter rail / navy search hero (D08) — not rebuilt  
2. Category 3-col + 300×600 skyscraper (D02) — partial via hub CSS only  
3. Photo story desktop thumb rail (D06) — mobile gallery still primary  
4. Login two-panel brand form (D13) — phone D28 layout retained at all widths  
5. Account dual-rail (D15) — not rebuilt  
6. Audio sticky mini-player desk composition — existing mini player only  
7. Exact SoT ad inventory placements (billboard / sponsorship) — reserved slots added, not every placement  
8. Visual screenshot artifact folder for formal scoring — generate on Preview smoke  

---

## Screenshots (homepage smoke)

Captured under `docs/jandarpan-reader-redesign/desktop-tablet-screenshots/`:

- `home-1440.png`
- `home-1280.png`
- `home-1024.png`
- `home-768.png`
- `home-390.png`

These are engineering smoke captures for Preview review — formal SoT rubric scoring still required before declaring the blocker fully closed.

---

## Owner next steps

1. Run formal screenshot compare vs SoT at 1440/1280/1024/768/phone  
2. Close remaining page compositions (search, login desk, account, photo)  
3. Keep payment / rates / offline as separate blockers  
