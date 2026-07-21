# Phase 7 visual audit — Product polish & Group F system states

**Branch:** `feat/jandarpan-reader-design-system`  
**Commit:** `726b8ca`  
**Preview:** https://newspaper-motion-faumlh45l-jack160699s-projects.vercel.app  
**Branch alias:** https://newspaper-motion-git-feat-jandarpan-b9dd37-jack160699s-projects.vercel.app  
**Flag:** `NEXT_PUBLIC_READER_DS=1`  
**Approved refs:** `public/design-refs/phase-7/approved-phase-7-system.html`  
**Screenshot dir:** `docs/jandarpan-reader-redesign/screenshots/phase-7/`  
**QA gallery:** `/system/preview?state=loading|empty|error|offline|slow|notify|location|404` · `/maintenance`

## Scope verified

| Area | Result |
|------|--------|
| Typography | Pass — brand / serif / UI tokens; long headlines clamped (4 / 3 lines) |
| Colours | Pass — navy / red / gold / paper; high-contrast + data-saving attrs wired |
| Spacing | Pass — system states use approved 14/28 gutters |
| Images | Pass — data-saving hides `.jd-img-media` via `html[data-data-saving]` |
| Navigation | Pass — phone bottom nav; tablet+ desktop nav; system routes opt out of legacy chrome |
| Animations | Pass — skeleton shimmer; reduced-motion respected |
| Audio | Pass — listen hub + ActionRow → `/listen` |
| Ads | Pass — labeled विज्ञापन / प्रायोजित (Phase 5 unchanged) |
| Membership | Pass — DS membership surfaces; checkout still honestly not live |
| Loading F46 | Pass — content-shaped skeleton |
| Empty F47 | Pass — `EmptyState` on saved |
| Error F48 | Pass — calm Hindi error + retry |
| Offline F49 | Pass — ink banner + saved link |
| Slow F50 | Pass — gold strip + data-saving shortcut |
| Notify F51 / Location F52 | Pass — value-first sheets, dismissible |
| Maintenance F53 | Pass — `/maintenance` |
| 404 F54 | Pass — editorial 404 |
| Hindi / English | Pass — DS Hindi-first; language prefs page retained |
| Long headlines | Pass — `.jd-lead-title` / `.jd-sec-title` clamps |
| Slow network | Pass — Network Information API + force demo |
| Mobile 390 / Tablet 768 / Desktop 1280 | Pass — home captures |
| SEO | Pass — existing `buildHomeMetadata` / JSON-LD unchanged on home |
| Accessibility | Pass — landmarks, named nav, dialog labels, focus-visible gold ring |
| Performance | Pass — no new heavy deps; skeleton over spinner |

## Screen-by-screen

| ID | Ref | Route | Captures | Major differences | Result |
|----|-----|-------|----------|-------------------|--------|
| F46 | f46-loading | `/system/preview?state=loading` | `f46-loading-*` | Real masthead/actions vs ref chrome | Pass |
| F47 | f47-empty | `…?state=empty` | `f47-empty-*` | Real bottom-nav icons | Pass |
| F48 | f48-error | `…?state=error` | `f48-error-*` | Retry is button (no-op in preview) | Pass |
| F49 | f49-offline | `…?state=offline` | `f49-offline-*` | Forced offline banner for QA | Pass |
| F50 | f50-slow | `…?state=slow` | `f50-slow-*` | Forced slow strip + text-first demo | Pass |
| F51 | f51-notify | `…?state=notify` | `f51-notify-*` | Sheet after mount | Pass |
| F52 | f52-location | `…?state=location` | `f52-location-*` | Manual district link | Pass |
| F53 | f53-maintenance | `/maintenance` | `f53-maintenance-*` | ETA copy fixed for Preview | Pass |
| F54 | f54-404 | `…?state=404` | `f54-404-*` | Trending rail empty without feed | Pass — honest |

## Verification commands

| Check | Result |
|-------|--------|
| `npm run typecheck` | Pass |
| `npm run lint` (scoped reader-ds / system) | Pass (0 errors; pre-existing hook warnings elsewhere) |
| `npm run build` (`NEXT_PUBLIC_READER_DS=1`) | Pass |
| `npm test` | Pass — 264 tests |
| `npm run test:reader-ds` / Playwright smoke + a11y | Pass — 8/8 |
| Screenshot capture | Pass — `scripts/capture-phase-7-screens.mjs` |

## Visual comparison summary

- **Before:** Group F missing; legacy English `error` / `not-found` / spinner loading; data-saver CSS attribute mismatch; no focus-visible / high-contrast; ActionRow inert.
- **After:** Flag-gated F46–F54; Hindi system states; prefs attrs aligned; focus + contrast + font-scale; ActionRow share/save/listen wired; offline/slow guards in shell.

No major visual differences remain vs approved Phase 7 phone refs for F46–F54 structure, copy, and colour. Remaining deltas are listed in `jandarpan-reader-redesign-phase-7-remaining-issues.md`.

## Preview

| URL | Role |
|-----|------|
| https://newspaper-motion-faumlh45l-jack160699s-projects.vercel.app | Phase 7 Preview (READY) |
| https://newspaper-motion-git-feat-jandarpan-b9dd37-jack160699s-projects.vercel.app | Stable branch alias |
| https://vercel.com/jack160699s-projects/newspaper-motion/A4QKFusqv56Az7nnY3KqKqV6Qzdp | Inspector |

Production was not promoted. Enable `NEXT_PUBLIC_READER_DS=1` on Preview to exercise DS routes.
