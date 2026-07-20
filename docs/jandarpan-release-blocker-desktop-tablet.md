# Release blocker — Desktop / tablet Reader DS fidelity

**Date:** 2026-07-21  
**Branch:** `feat/jandarpan-reader-design-system`  
**Source of truth:** `docs/jandarpan-reader-redesign/source-designs/desktop-tablet/jandarpan-desktop-tablet-design-brief.html`  
**Formal review:** `docs/jandarpan-reader-redesign/desktop-tablet-formal-visual-review.md`

---

## Blocker status

| Item | Status |
|------|--------|
| Desktop/tablet SoT chrome (Util → Brand → CatNav) | **Implemented** |
| Breakpoints 768 / 1024 / 1280 / 1440 + containers 1160/1240 | **Implemented** |
| Homepage desk composition | **Implemented** |
| Article share rail + reading ≤680 + opinion layout | **Implemented** |
| 1. Search filter rail | **Closed** |
| 2. Category skyscraper / side rail | **Closed** |
| 3. Photo-story thumbnail rail | **Closed** |
| 4. Login two-panel layout | **Closed** |
| 5. Account dual-rail layout | **Closed** |
| 6. Source-backed ad inventory (reserved) | **Closed** |
| Formal visual rubric (≥85 desk/tablet, no major &lt;80) | **Passed** — see formal review |
| **Overall desktop/tablet blocker** | **CLOSED** |

**Unchanged / deferred (by mandate):**
- Razorpay / checkout — deferred and open  
- Market tiles — omitted (no honest feed)  
- Offline downloads — open  
- Production `NEXT_PUBLIC_READER_DS` — remains disabled  

---

## Source-frame mapping

| Frame | Implementation |
|-------|----------------|
| H01–H04 | `DeskChrome` |
| D01 / T01 / TP01 | `ReaderHomepage` |
| D02 / T03 | `CategoryPage` + `.jd-category-rail` skyscraper |
| D03 / T02 | `ReaderArticlePage` + share/sidebar rails |
| D06 | `PhotoGallery` thumb rail |
| D08 | `SearchResultsPage` filter rail / drawer |
| D13 | `SignInPage` two-panel |
| D15 | `AccountShell` + profile/saved |
| Ad inventory | `ReservedAd` placement IDs |

---

## Formal score summary

| Metric | Value |
|--------|------:|
| Desktop average (@1440 major screens) | **88.7** |
| Tablet average (1024+768 majors) | **85.9** |
| Lowest major screen | **82** (category @768) |
| Phone regression (home @390) | **90** |

Full table + mismatches: `desktop-tablet-formal-visual-review.md`.

---

## Ad inventory (reserved, no fake creatives)

| Placement ID | Format | Size | Visibility |
|--------------|--------|------|------------|
| `home.leaderboard` | leaderboard | 728×90 | ≥1024 |
| `tablet.adaptive` | tablet | 468×60 | 768–1023 |
| `home.billboard` | billboard | 970×250 | ≥1024 |
| `home.sidebar` | sidebar | 300×250 | ≥1024 home rail |
| `home.infeed` | infeed | 300×250 | desk mid-feed |
| `home.sponsor` | sponsor | 728×90 | desk section |
| `category.skyscraper` | skyscraper | 300×600 | ≥1024 category |
| `article.inline` | inline | 580×300 | article body |
| `article.sidebar` | sidebar | 300×250 | ≥1024 article rail |

Empty/no-fill: dashed labelled slot, fixed min-height, no advertiser invent. Collapse: phone hides desk-only slots via CSS.

---

## Tests run

- `git diff --check`
- ESLint on changed Reader DS files
- `tsc --noEmit`
- Vitest: `ReservedAd.test.ts`, `strings.test.ts`
- Playwright: `e2e/reader-ds-smoke.spec.ts` (14 passed)
- Playwright: `e2e/reader-ds-formal-visual.spec.ts` (captures)
- `NEXT_PUBLIC_READER_DS=1` build — pass  
- `NEXT_PUBLIC_READER_DS=0` build — pass  

---

## Remaining low/medium mismatches

1. Medium — phone sticky dismissible ad still present on desktop homepage  
2. Medium — homepage section density lighter than full SoT band set  
3. Low — sparse local empty states (honest)  
4. Low — account hub list vs decorative SoT saved grid  

No HIGH source-backed gap remains for this blocker.
