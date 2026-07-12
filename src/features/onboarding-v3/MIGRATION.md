# JDP-019 — Premium Onboarding V3 Migration Guide

## Overview

Onboarding V3 is a **presentation-layer** first-run experience delivered as an accessible bottom sheet. It collects district, interests, notification preferences, and optional Google sign-in — then marks onboarding complete using the existing personalization storage layer.

**Default:** OFF. Production is unchanged until you opt in.

---

## Activation

Set in `.env.local` or Vercel environment variables:

```bash
NEXT_PUBLIC_ONBOARDING_V3=1
```

Restart the dev server after changing public env vars.

| Value | Behavior |
|-------|----------|
| unset / `0` | Legacy `PersonalizationOnboarding` on homepage (if not already done) |
| `1` | `OnboardingExperienceV3` bottom sheet in `AppChrome` |

---

## Flow (6 steps)

1. **Welcome** — value proposition, Get started / Skip
2. **Choose District** — `CG_DISTRICTS` chips via `ReaderPreferencesProvider`
3. **Choose Interests** — `FEED_INTERESTS` chips via `ReaderAccountProvider`
4. **Notifications** — toggle prefs + optional browser permission request
5. **Save with Google** — calls existing `signInWithGoogle()` (no auth logic changes)
6. **Complete** — marks `onboardingDone` and dismisses

**Skip:** Available on every step except Complete. Welcome skip exits the full flow. Escape key advances via skip on the current step.

**Progress:** Bar + step dots with `role="progressbar"` and screen-reader step label.

---

## Architecture

```
AppChrome (after LanguageGate)
  └─ [V3 OFF] no onboarding shell
  └─ [V3 ON]  OnboardingExperienceV3
                └─ OnboardingSheet (useModalA11y)
                     └─ step components
```

### File structure

```
src/features/onboarding-v3/
├── OnboardingExperienceV3.tsx
├── index.ts
├── config.ts
├── types.ts
├── MIGRATION.md
├── hooks/
│   └── useOnboardingV3State.ts
├── components/
│   ├── OnboardingSheet.tsx
│   ├── OnboardingProgress.tsx
│   └── OnboardingStepFrame.tsx
├── steps/
│   ├── WelcomeStep.tsx
│   ├── DistrictStep.tsx
│   ├── InterestsStep.tsx
│   ├── NotificationsStep.tsx
│   ├── SaveWithGoogleStep.tsx
│   └── CompleteStep.tsx
├── lib/
│   └── notification-prefs.ts
└── styles/
    └── onboarding-v3.css
```

---

## Persistence (existing APIs only)

| Step | API |
|------|-----|
| District | `useReaderPreferences().setHomeDistrict()` |
| Interests | `useReaderAccount().setInterests()` / `toggleInterest()` |
| Notifications | `localStorage` key `cgb-onboarding-notifications` |
| Complete | `useHomepageLayout().persist({ onboardingDone: true })` → `cgb-onboarding-done` cookie |

**Do not modify** authentication logic. Google sign-in uses `ReaderAccountProvider.signInWithGoogle()` unchanged.

---

## Accessibility

- `role="dialog"` + `aria-modal="true"` bottom sheet
- Focus trap, Tab cycle, Escape → skip current step (`useModalA11y`)
- Body scroll lock + inert backdrop content
- Progress bar with `aria-valuenow`
- Toggle checkboxes with associated `<label>`
- `aria-live="polite"` on notification permission status

---

## Rollout checklist

- [ ] Set `NEXT_PUBLIC_ONBOARDING_V3=1` in Preview
- [ ] Complete language gate, verify sheet appears
- [ ] Walk all 6 steps + skip paths
- [ ] Verify district/interests persist after dismiss
- [ ] Verify legacy homepage onboarding is hidden when V3 is on
- [ ] Test light + dark mode, mobile + desktop
- [ ] Run `npm run typecheck` and `npm run build`

---

## Rollback

Remove or set `NEXT_PUBLIC_ONBOARDING_V3=0`. Legacy homepage onboarding resumes for users who have not completed onboarding.
