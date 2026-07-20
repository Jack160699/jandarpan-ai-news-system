# Desktop / tablet formal visual review

**Date:** 2026-07-21  
**Branch:** `feat/jandarpan-reader-design-system`  
**SoT:** `docs/jandarpan-reader-redesign/source-designs/desktop-tablet/jandarpan-desktop-tablet-design-brief.html`  
**Captures:** `docs/jandarpan-reader-redesign/desktop-tablet-screenshots/formal/`

Scoring rubric (100): structure 20 · spacing/alignment 20 · typography 15 · proportions 15 · density 10 · responsive 10 · polish 10.

---

## Score table

| Screen | Viewport | Source frame | Score | Severity notes |
|--------|----------|--------------|------:|----------------|
| Homepage | 1440 | D01 | 88 | Medium: phone sticky banner still mounts on desk |
| Homepage | 1280 | D01 | 87 | Same sticky banner |
| Homepage | 1024 | T01 | 86 | Structure matches; section density lighter than SoT |
| Homepage | 768 | H04 / TP01 | 85 | Hamburger + catnav OK |
| Homepage | 390 | phone baseline | 90 | Masthead + bottom nav intact |
| Search | 1440 | D08 | 90 | Filter rail + navy hero; empty results honest |
| Search | 1024 | D08 / T | 88 | Sticky filter rail |
| Search | 768 | T sheet | 86 | Filter via bar/drawer (SoT) |
| Category | 1440 | D02 | 86 | Skyscraper 300×600 + trending/related |
| Category | 1024 | T03 | 85 | Rail present; empty category content |
| Category | 768 | T03 | 82 | No skyscraper (SoT tablet) — main only |
| Standard article | 1440 | D03 | 86 | Share rail + related + sidebar reserved ad |
| Standard article | 1024 | T02 | 85 | Reading column + rails |
| Standard article | 768 | TP02 | 83 | Single column; share bar phone pattern |
| Photo story | 1440 | D06 | 91 | Primary + 2-col thumbs + gold active |
| Photo story | 1024 | D06 | 89 | Side thumb rail |
| Photo story | 768 | tablet | 86 | Horizontal thumb strip |
| Login | 1440 | D13 | 92 | Two-panel brand + form; OTP honest-disabled |
| Login | 1024 | D13 | 90 | Two-panel |
| Login | 768 | collapse | 85 | Single-column form (SoT collapse) |
| Account | 1440 | D15 | 88 | 260 + main + utility; real links only |
| Account | 1024 | D15 tablet | 86 | Icon-only rail |
| Account | 768 | D15 tabs | 87 | Horizontal account tabs |

### Averages

| Cohort | Average | Threshold |
|--------|--------:|-----------|
| Desktop (≥1280 sample: home/search/category/article/photo/login/account @1440) | **88.7** | ≥85 |
| Tablet (1024 + 768 major screens above) | **85.9** | ≥85 |
| Lowest major screen | **82** (category @768) | ≥80 |
| Phone regression (home @390) | **90** | ≥ prior baseline |

No **HIGH** source-backed structural gap remains for the six completion items. Remaining items are **medium/low** polish (sticky phone banner on desk, empty local content, section density vs full SoT bands).

---

## Gap closure map

| Gap | Status | Evidence |
|-----|--------|----------|
| 1 Search filter rail | **Done** | `search-1440.png` — प्रकार/अवधि/ज़िला + clear-all + sticky |
| 2 Category skyscraper | **Done** | `category-1440.png` — 300×600 + modules |
| 3 Photo thumb rail | **Done** | `photo-1440.png` — gold active + 2-col |
| 4 Login two-panel | **Done** | `login-1440.png` — brand + auth |
| 5 Account dual-rail | **Done** | `account-1440.png` / `account-768.png` |
| 6 Ad inventory | **Done** | placement IDs on ReservedAd; leaderboard/billboard/skyscraper/inline/sidebar/infeed/sponsor/tablet |

---

## Screenshot inventory

All under `docs/jandarpan-reader-redesign/desktop-tablet-screenshots/formal/`:

- `home-{1440,1280,1024,768,390}.png`
- `search-{1440,1024,768}.png`
- `category-{1440,1024,768}.png`
- `article-{1440,1024,768}.png`
- `photo-{1440,1024,768}.png`
- `login-{1440,1024,768}.png`
- `account-{1440,1024,768}.png`

---

## Remaining mismatches (not HIGH)

1. **Medium** — Homepage still mounts dismissible phone sticky ad on desktop (labeled; does not break chrome).  
2. **Medium** — SoT multi-band homepage modules denser than shipped section cards.  
3. **Low** — Local empty search/category when feed sparse (honest empty, not fake stories).  
4. **Low** — Account content remains list hub (real routes) rather than SoT decorative saved grid.

---

## Blocker verdict

**CLOSED** for desktop/tablet SoT fidelity of the six documented gaps, subject to Preview SHA verification after push.

Unchanged deferred blockers: Razorpay/checkout · market tiles · offline downloads · Production Reader DS off.
