# Release blocker #1 — D28 Sign in / Sign up

**Branch:** `feat/jandarpan-reader-design-system`  
**Flag:** `NEXT_PUBLIC_READER_DS=1`  
**Date:** 2026-07-20

## Root cause

`/login` was outside the reader-design chrome list and always rendered the legacy `PageShell` form (stone/rounded UI). Plot **D28** (Hindi welcome, `+91` field, OTP CTA, Google CTA, guest continue, navy/red/cream) was never implemented under the DS flag. Visual review scored D28 at **48**.

## Auth capabilities discovered

| Method | Status | Notes |
|--------|--------|-------|
| Google OAuth | **Working** | `ReaderAccountProvider.signInWithGoogle` → `signInWithOAuth({ provider: "google", redirectTo: /login?oauth=1 })` |
| Email magic link | **Working** | `client.auth.signInWithOtp({ email, emailRedirectTo: /login })` — retained under DS as optional secondary panel (not in Plot) |
| Phone OTP | **Incomplete** | Legacy could call `signInWithOtp({ phone })` but **no verify OTP UI** exists. DS shows Plot OTP CTA **disabled** with honest Hindi note — no fake success |
| Guest | **Working** | Link to `/` with **no** session creation; stays local guest profile |
| Forgot / reset password | **Admin only** | Unchanged at `/admin/forgot-password` — not part of reader Plot D28 |
| Fake sessions | **Not introduced** | No bypass of Supabase |

## Files changed

- `src/features/reader-ds/experience/pages/SignInPage.tsx` — new Plot D28 page
- `src/features/reader-ds/experience/index.ts` — export
- `src/app/login/page.tsx` — flag gate → `SignInPage` vs legacy
- `src/app/login/LegacyLoginPage.tsx` — previous login UI (flag off)
- `src/app/login/layout.tsx` — metadata copy
- `src/components/navigation/AppChrome.tsx` — `/login` in `READER_DS_EXACT`
- `e2e/reader-ds-smoke.spec.ts` — D28 smoke coverage
- `scripts/capture-d28-fidelity.mjs` — evidence capture
- `docs/jandarpan-reader-redesign/screenshots/release-blockers/d28-login/` — visual evidence

## Functional behavior retained

- Google sign-in invokes real OAuth when Supabase is configured
- Email magic link still available (collapsed “ईमेल लिंक से साइन इन”)
- Legacy `/login` unchanged when `NEXT_PUBLIC_READER_DS` ≠ `1`
- OAuth / magic-link return to `/login` (existing redirect URLs)
- Signed-in state shows DS confirmation + home CTA
- Guest continue does not grant authenticated or premium privileges

## Unsupported / honest limitations

- **Mobile OTP verification** is not implemented end-to-end; Plot “OTP भेजें” is **disabled** with clear Hindi copy
- Phone SMS provider may still be unset in some environments (irrelevant while CTA disabled)
- Optional email panel is below the Plot fold (content variance vs mock)

## Visual evidence

Directory: `docs/jandarpan-reader-redesign/screenshots/release-blockers/d28-login/`

| Asset | File |
|-------|------|
| Approved Plot D28 | `approved-d28-390x844.png` |
| Legacy before | `legacy-d28-before-390x844.png` |
| Corrected 390×844 | `corrected-d28-390x844.png` |
| Corrected 430×932 | `corrected-d28-430x932.png` |
| Side-by-side | `side-by-side-d28-390x844.png` |
| Overlay | `overlay-d28-390x844.png` |
| Pixel diff | `diff-d28-390x844.png` |
| Score JSON | `fidelity-d28.json` |

Source of truth: `docs/jandarpan-reader-redesign/source-design/` + extracted `extracted/html/D28.png`.

## Fidelity score

**D28 total: 84 / 100** (`close_with_minor_gaps`, confidence high)  
Acceptance target ≥80 — **met**.

## Tests

- `git diff --check`
- ESLint on changed files
- `npm run typecheck`
- `npm run build` with `NEXT_PUBLIC_READER_DS=1`
- `npm run build` with `NEXT_PUBLIC_READER_DS=0`
- Playwright: `e2e/reader-ds-smoke.spec.ts` — D28 login case
- Local capture against `http://127.0.0.1:3000/login`

## Remaining limitations (out of scope for this blocker)

- Checkout / payments (blocker #2)
- Language switching on DS chrome
- A1 weather / rates feeds
- Tablet / desktop Plot SoT
- Full phone OTP verify UI (requires product + SMS provider work)
