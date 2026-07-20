# Jan Darpan Reader Design System — Final Release Certification

**Role:** Independent gatekeeper (Principal Staff / Design / QA / Perf / A11y / PM / Release)  
**Date:** 2026-07-20  
**Branch under review:** `feat/jandarpan-reader-design-system`  
**Local HEAD at review:** includes gatekeeper remediation (uncommitted at certification time unless pushed later)  
**Prior handoff HEAD:** `e30a25c`  
**Flag:** `NEXT_PUBLIC_READER_DS=1` (Preview / local only — must remain unset on Production)  
**Rollback:** `rollback/reader-design-20260719` → `33d1cb1`

---

## Executive Summary

The redesign is a **substantial Preview-quality RC**, not a production-safe reader for millions of users. Independent verification found prior “READY” claims overstated: account providers were stripped on DS routes, membership success was spoofable via query params, A1 homepage skipped `ReaderShell`, and demo native-ad brands shipped on the homepage.

Gatekeeper remediation fixed those **critical integrity defects** locally (account providers restored, success gated to active subscription, homepage wrapped in `ReaderShell`, demo creatives removed, fake weather/rates removed, photo/live-blog fabrication reduced, `useSupabase` `getServerSnapshot` infinite-loop fixed). Engineering gates (typecheck, build, vitest, reader-ds Playwright smoke+a11y) pass after remediation.

**Remaining release blockers are still HIGH.** Checkout / Razorpay is **not live** and remains **explicitly deferred and open** (no payment implementation in the A1 utilities pass). D28 login fidelity improved on Preview after DS login work; English language switching was closed later on the feature branch. Desktop layout is still invented vs phone-only Plot. Offline downloads are not real media. **A1 weather is now honestly wired (Open-Meteo)**; **market rate tiles remain omitted** until a real feed exists (A1 utilities **partially closed**). Production Reader DS must stay disabled.

---

## Production deploy decision

# NO

### Why NO — remaining blockers

| Severity | Blocker | Evidence |
|----------|---------|----------|
| **HIGH** | Live checkout / payments not production-ready | `/membership/checkout` intentionally routes to failure (`checkout-not-live`). **Deferred — open.** No Razorpay work in A1 utilities pass. |
| **HIGH** | D28 login not redesigned to Plot DS | Addressed on feature branch after certification; re-verify on latest Preview. |
| **HIGH** | Language switching incomplete on DS chrome | Closed later on feature branch (`d48daf2` / follow-ups); re-verify on Preview. |
| **HIGH** | Desktop/tablet grid not Plot-approved | Plot gallery is phone-first; Phase 6 grid is derived invention. Visual risk at ≥768. |
| **HIGH** | Offline / downloads not real | C25 downloads are localStorage IDs, not offline media packages. |
| **HIGH** | A1 Plot fidelity incomplete without inventing data | **Partially closed:** weather via Open-Meteo in `UtilityRow`. **Still open:** gold/silver/diesel tiles omitted (no honest live rates feed). See `docs/jandarpan-release-blocker-a1-weather-market.md`. |
| **MED** | Gatekeeper / A1 Preview lag | Confirm latest feature Preview SHA after push. |
| **MED** | Placeholder lead imagery / empty image plane | A1 lead often shows striped placeholder — CLS and trust risk. |
| **MED** | Duplicate nav landmarks in a11y tree | Desktop + phone nav both in DOM (CSS-hidden) — noisy for AT. |
| **MED** | No full Lighthouse / axe / bundle gate in this pass | Playwright landmark suite only; no CI axe-core; no Lighthouse score artifact. |
| **MED** | cg-rates API still invents jittered prices | Safe only because homepage does not consume it for UtilTiles — do not reconnect. |

Until every **HIGH** row is closed (or explicitly accepted by product with a production kill-switch plan), this must not be enabled for Production readers.

---

## Scores (/10)

| Dimension | Score | Notes |
|-----------|------:|-------|
| **Production Readiness** | **3** | Flag-off on Production is correct; product surfaces incomplete for go-live. |
| **Visual Fidelity** | **5** | Phone shell/tokens close; A1 missing Plot utilities; desktop invented; placeholders. |
| **Engineering** | **7** | `tsc`, `next build`, 265 vitest, 8/8 reader-ds Playwright pass after fixes. |
| **Accessibility** | **6** | Landmarks/named controls/dialogs covered; no axe; duplicate nav. |
| **Performance** | **5** | No Lighthouse artifact this gate; placeholder media risk; flag-gated codepath OK. |
| **SEO** | **6** | Metadata/JSON-LD/robots disallow for QA paths; Hindi-first titles uneven. |
| **Backend Integrity** | **4** | Success now gated; checkout not live; local Supabase often unconfigured. |
| **Security** | **6** | Spoofable success closed; demo brands removed; QA galleries blocked when `VERCEL_ENV=production`. |
| **Code Quality** | **6** | Feature-isolated `reader-ds`; residual debt (payment theater, dual chrome, invented desktop). |
| **Overall (weighted)** | **~4.5** | Not production-certifiable. |

---

## Step results

### 1 — Requirements vs promises

Re-checked docs audits, production RC, implementation report, and code — **not** prior narrative.

| Promise area | Verdict |
|--------------|---------|
| A–F screen matrix (54) | ~partial: many shells exist; D27 Plot onboarding incomplete (legacy V3 remounted on DS except `/system`); D28 missing DS redesign |
| Hindi-first | Mostly yes on DS |
| No fake news / brands / payments | Improved after gatekeeper (ads/weather/rates/success); checkout still theater by design |
| Flag + no Production merge | Honored on Production target |
| Plot visual parity | Phone directionally close; not pixel-certified; desktop not Plot-sourced |

### 2 — Visual audit (fresh captures)

Saved under `docs/jandarpan-reader-redesign/screenshots/gatekeeper/`:

- `a1-home-390.png`
- `a1-home-tablet-768.png`
- `e-membership-390.png`
- `e40-success-unguarded-check-390.png` (pre/post guard verification)
- `f48-error-390.png`
- `d28-login-legacy-390.png`

**Mismatch highlights:** missing A1 weather + market tiles; lead image placeholder; sticky ad house slot only; login not DS; tablet shows derived primary nav.

### 3 — Functional audit (sampled, not assumed)

| Flow | Result |
|------|--------|
| Homepage DS shell | Works (`jd-ds`, bottom nav) |
| Search overlay / district link | Present |
| Membership landing | Renders DS |
| Checkout | Routes to not-live failure (honest) |
| `/membership/success?plan=&order=` | **No longer claims premium** — redirects/shows failure when unverified |
| Login | Legacy page; auth blocked when Supabase unset |
| System F48/F51 | Work after `useSupabase` snapshot fix |
| Save / audio / share | Wired in ActionRow; not end-to-end payment/offline proven |

### 4 — Engineering audit

| Check | Result |
|-------|--------|
| Scoped eslint (changed files) | Pass (warning cleared) |
| `npm run typecheck` | Pass |
| `npm run build` | Pass |
| `npm test` (vitest) | 63 files / 265 tests Pass |
| `npm run test:reader-ds` | 8/8 Pass (after gatekeeper fixes) |
| axe-core full | **Not run** |
| Bundle analysis | **Not run** |
| Lighthouse | **Not run** |

### 5 — Production audit

| Item | Result |
|------|--------|
| Vercel project | `newspaper-motion` (`prj_kJbD8R5jMyugTUpK4V95ZqhMI0YZ`) |
| Production latest | `main` deploy READY — DS must stay flag-off |
| Feature Preview (pre-gatekeeper) | Branch alias `newspaper-motion-git-feat-jandarpan-b9dd37-jack160699s-projects.vercel.app` @ `e30a25c` |
| Domains | `jandarpan.news` / `www.jandarpan.news` on project |
| Rollback branch | Exists (`rollback/reader-design-20260719`) |
| Env safety | Production must keep `NEXT_PUBLIC_READER_DS` unset/`0` |

### 6 — Gatekeeper remediation applied (this review)

1. Restore `ReaderAccountProvider` (+ listen/speech/nav) on DS routes in `AppChrome`
2. Remount onboarding on DS except `/system` + `/maintenance`
3. Wrap A1 `ReaderHomepage` in `ReaderShell`
4. Gate `/membership/success` to active `reader_subscriptions` (or failure)
5. Disable demo `getNativeAdCreative` (returns `null`)
6. Remove fake weather default + fake UtilTiles defaults
7. Stop fabricating multi-slide photo galleries / staggered live timestamps
8. Fix `useSupabase` unstable `getServerSnapshot` infinite loop

### 7 — Self-critique (brutal)

Previous phases shipped **integrity shortcuts** that looked complete in screenshots:

- Account context stripped “to avoid legacy chrome” broke premium/sign-in.
- Success page trusted query params — payment theater with a green check.
- Homepage bypassed the shell that every other screen used.
- Demo Unsplash “State Partner” ads violated the no-fake-brands rule.
- Fake `32°` and market prices sold Plot fidelity with invented data.
- Reports declared READY while D27/D28 and payments were incomplete.

Those were release-blocking. Several remain.

---

## Inventory (certification snapshot)

### Implemented / partial screens (DS flag)

Homepage A1; district/latest/trending/search/live; category/topics; story templates B11–B20 (partial honesty); listen/queue/downloads; archive hubs; membership E36–E43 (checkout not live); system F46–F54; maintenance; desktop nav (derived).

### Reusable components (primary)

`ReaderShell`, `Masthead`, `BottomNav`, `DesktopPrimaryNav`, `UtilityRow`, `UtilTiles`, story cards, monetization cards, system states, `ExperienceChrome` audio, permission sheets, network guards.

### Changed routes (feature-gated)

`/`, `/district*`, `/latest`, `/trending`, `/search`, `/live*`, `/category/*`, `/topics/*`, `/story/*`, `/listen*`, `/archive*`, `/membership*`, `/system/*`, `/maintenance`, global `error`/`loading`/`not-found` when flag on.

### Tests

- Vitest: 265 unit/integration
- Playwright: `e2e/reader-ds-smoke.spec.ts`, `e2e/reader-ds-a11y.spec.ts`

### Screenshots

- Phase folders under `docs/jandarpan-reader-redesign/screenshots/` (prior phases)
- Gatekeeper folder: `docs/jandarpan-reader-redesign/screenshots/gatekeeper/`

### Preview URL

- Branch alias: https://newspaper-motion-git-feat-jandarpan-b9dd37-jack160699s-projects.vercel.app  
- **Note:** Push gatekeeper commits before treating Preview as certified. Local verification used `http://localhost:3000` with `NEXT_PUBLIC_READER_DS=1`.

### Production readiness

**Not ready.** Keep flag off on Production. Do not merge to `main` for DS go-live until HIGH blockers are closed.

---

## Final answer

**Would you personally approve deploying this to production for millions of readers?**

# NO

Remaining blockers: **checkout / Razorpay deferred and open**; non-Plot desktop grid; non-real offline downloads; **A1 market tiles still open** (weather closed via Open-Meteo — see `docs/jandarpan-release-blocker-a1-weather-market.md`). Production Reader DS must stay off. No payment implementation in the A1 utilities pass.
