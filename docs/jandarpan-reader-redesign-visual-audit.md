# Jan Darpan — Visual Correction Audit (Homepage)

**Branch:** `feat/jandarpan-reader-design-system`  
**Scope:** Homepage only — match approved Plot Design A1  
**Flag:** `NEXT_PUBLIC_READER_DS=1` (Preview, git-branch scoped)

---

## 1. Screenshot evidence

| Role | Viewport | Path |
|------|----------|------|
| Approved A1 (full phone) | 390×844 | `docs/jandarpan-reader-redesign/screenshots/visual-correction/approved-a1-390-full.png` |
| Approved A1 (browser) | 390×844 | `docs/jandarpan-reader-redesign/screenshots/visual-correction/approved-a1-390.png` |
| Approved reference HTML | — | `docs/jandarpan-reader-redesign/approved-a1-homepage.html` · `/design-refs/approved-a1-homepage.html` |
| Implementation BEFORE | 390×844 | `docs/jandarpan-reader-redesign/screenshots/visual-correction/before-impl-390.png` |
| Implementation AFTER | 390×844 | `docs/jandarpan-reader-redesign/screenshots/visual-correction/after-impl-390.png` |
| Implementation AFTER | 430×932 | `docs/jandarpan-reader-redesign/screenshots/visual-correction/after-impl-430.png` |
| Vercel Preview AFTER | 390×844 | `docs/jandarpan-reader-redesign/screenshots/visual-correction/preview-after-390.png` |

---

## 2. Visual-difference checklist (BEFORE)

| # | Region | Approved | Before (wrong) | After status |
|---|--------|----------|----------------|--------------|
| 1 | Masthead bg | Solid `#0a2550` | Gradient + gold border | ✅ solid navy `rgb(10,37,80)` |
| 2 | Masthead left | Red 24×24 “ज” + Tiro 22 | Large brand + “छत्तीसगढ़” | ✅ mark + Tiro 22 |
| 3 | Masthead icons | goldSoft; bell red-dot; gold→red avatar | White icons; user glyph | ✅ goldSoft + avatar |
| 4 | Masthead pad | `8px 14px 9px` | Taller | ✅ matched |
| 5 | Utility bg | `#081b3a` | Cream | ✅ `rgb(8,27,58)` |
| 6 | Utility content | pin+district+chev · date · wx+temp | Cream row, long weather | ✅ three-cluster navyDeep |
| 7 | Breaking badge | White pill, red text, red dot | Translucent + bolt | ✅ white/red badge |
| 8 | Breaking type | Noto Serif 13/600 | Mukta | ✅ `.jd-serif` |
| 9 | Lead image | 190px editorial crop / tinted fallback | Empty globe box | ✅ h=190, real Unsplash when available; tinted hatch fallback |
| 10 | Lead meta | Tag + “· time” | Clock icon heavy | ✅ “· {relative}” |
| 11 | First-viewport extras | Util tiles (सोना/चांदी/डीज़ल) then ad | Audio CTA banner | ✅ UtilTiles + Ad; audio CTA removed from A1 first viewport |
| 12 | Bottom nav bg | White | Cream | ✅ `#fff` |
| 13 | Fonts loaded | Tiro / Noto Serif / Mukta | Claimed, not verified | ✅ browser computed: Tiro, Noto Serif Devanagari, Mukta |
| 14 | Content density | Compact chrome → lead fills viewport | Excess whitespace | ✅ improved; lead 362×190 in 390 viewport |
| 15 | Edge padding | 14px | Mixed | ✅ 14px content pad |

---

## 3. Files changed (visual correction)

- `src/features/reader-ds/components/Masthead.tsx` — A1 atom
- `src/features/reader-ds/components/UtilityRow.tsx` — navyDeep utility
- `src/features/reader-ds/components/BreakingStrip.tsx` — white badge
- `src/features/reader-ds/components/ArticleImage.tsx` — 190px lead, tinted fallback, CDN crop
- `src/features/reader-ds/components/LeadStory.tsx` — meta + type scale
- `src/features/reader-ds/components/SecondaryStory.tsx` — 96×72 thumbs
- `src/features/reader-ds/components/UtilTiles.tsx` — **new**
- `src/features/reader-ds/components/BottomNav.tsx` — white surface
- `src/features/reader-ds/components/icons.tsx` — `chevD`
- `src/features/reader-ds/homepage/ReaderHomepage.tsx` — A1 composition + best lead image
- `src/features/reader-ds/styles/tokens.css` — font CSS var aliases (no overwrite of next/font)
- `docs/jandarpan-reader-redesign/approved-a1-homepage.html` — approved mockup for side-by-side
- `public/design-refs/approved-a1-homepage.html` — served copy for browser capture

---

## 4. Exact improvements

1. Masthead rebuilt to solid navy, red “ज” mark, Tiro 22 wordmark, goldSoft icons, notification dot, gradient avatar — no gold rule, no edition subtitle.
2. Utility row moved to navyDeep with district dropdown chevron, short Hindi date, compact temperature.
3. Breaking strip badge matches white/red/dot pattern; headline uses Noto Serif with ellipsis.
4. Lead image fixed at **190px**; prefers articles with real `imageUrl`; design-style hatch gradient when missing.
5. Homepage order matches A1: lead → 2 secondary → util tiles → ad → section feeds (audio CTA removed from first viewport).
6. Bottom navigation white surface so it does not blend into cream paper.
7. Font stack verified in browser: **Tiro Devanagari Hindi**, **Noto Serif Devanagari**, **Mukta**.

---

## 5. Remaining mismatches (minor)

- Seed/dev headlines differ from mockup copy (expected — real feed data).
- Util-tile rate values are presentation placeholders until a live rates API exists (documented; not fake news content).
- Desktop 1440 editorial grid not in scope for this mobile-first A1 pass (design gallery is mobile phones).
- Next.js DevTools overlay appears only in local `next dev` — not in production preview.
- Secondary story times may read “1 मिनट पहले” on hot seed data vs mockup’s “34 मिनट”.

---

## 6. Verification results

| Check | Result |
|-------|--------|
| Typecheck | ✅ `npm run typecheck` — 0 errors |
| Lint | ✅ `eslint src/features/reader-ds …` — 0 errors |
| Build (flag ON) | ✅ `NEXT_PUBLIC_READER_DS=1 npm run build` — success |
| Fonts (browser) | ✅ Tiro / Noto Serif Devanagari / Mukta applied |
| Lead geometry | ✅ height 190 · width 362 @ 390 viewport |
| Preview env | ✅ `NEXT_PUBLIC_READER_DS=1` added for Preview · `feat/jandarpan-reader-design-system` |

---

## 7. Preview deployment

| Item | Value |
|------|-------|
| Branch | `feat/jandarpan-reader-design-system` |
| Commit | `39fac46` |
| Deployment ID | `dpl_23SZXtg34M4QMTu41MQpgFN3tgUh` — **READY ✅** |
| Preview URL | https://newspaper-motion-i6av8g7nr-jack160699s-projects.vercel.app |
| Branch alias | https://newspaper-motion-git-feat-jandarpan-b9dd37-jack160699s-projects.vercel.app |
| Inspector | https://vercel.com/jack160699s-projects/newspaper-motion/23SZXtg34M4QMTu41MQpgFN3tgUh |
| Flag | `NEXT_PUBLIC_READER_DS=1` (Preview · git branch `feat/jandarpan-reader-design-system` only) |
| Preview smoke | ✅ Reader-DS chrome + real production stories (masthead mark, navyDeep utility, white breaking badge, lead, secondary, util tiles, section feeds, bottom nav) |
| Production | untouched |

Shareable access (expires ~23h): use Vercel share link if deployment protection prompts login.
