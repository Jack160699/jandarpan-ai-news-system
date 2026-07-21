# Release blocker #3 — Language switching (Reader Design System)

**Status:** Closed for primary Reader DS chrome (behind `NEXT_PUBLIC_READER_DS=1`).  
**Branch:** `feat/jandarpan-reader-design-system`  
**Scope:** Interface chrome only — CMS article headlines/bodies are not auto-translated.

## Root cause

1. **D26 did not drive the live locale.** `LanguagePage` wrote reader preferences / storage but never called `LanguageProvider.confirmLanguage`, so in-memory language (and `router.refresh`) stayed Hindi after selecting English.
2. **Reader DS had no string dictionary.** `src/features/reader-ds` hard-coded Devanagari chrome (~hundreds of UI tokens) and did not use the existing `LanguageProvider` / cookie pipeline for labels.
3. **Legacy dictionaries alone were insufficient** for Plot DS surfaces; those dictionaries cover older shell chrome, not the redesign components.

## Localization architecture

```
Cookie cgb-language (+ cgb-language-chosen)
        │
        ▼
getServerReaderLanguage()  ──►  LanguageProvider(defaultLanguage)
        │                              │
        │                              ▼
        │                       language: hi | en
        │                              │
        └──────────────────────────────┼──► useJdDsT()
                                       │
                                       ▼
                              jdDsT(locale, key)  ◄── JD_DS_STRINGS
                              (Hindi fallback)
```

| Piece | Role |
|--------|------|
| `LanguageProvider` | Source of truth; `confirmLanguage` persists cookie + localStorage + prefs and refreshes |
| `src/features/reader-ds/i18n/strings.ts` | Single typed `hi`/`en` dictionary (`JdDsStringKey`) |
| `useJdDsT` | Client hook; locale from provider (SSR-seeded) — safe first paint |
| D26 `LanguagePage` | Calls `confirmLanguage(selected)` then navigates |

**Locales:** `hi` (default), `en`. Missing English keys fall back to Hindi via `jdDsT`.  
**Flag-off:** Legacy routes unchanged; DS modules are only mounted when `NEXT_PUBLIC_READER_DS=1`.

## Files changed (summary)

- **New:** `src/features/reader-ds/i18n/{strings,useJdDsT,index,strings.test}.ts`
- **Critical fix:** `experience/pages/LanguagePage.tsx` → `confirmLanguage`
- **Chrome wiring:** masthead, bottom/desktop nav, search overlay/results, utility/district chrome, homepage section labels, profile/saved/history/followed/notifications/district prefs/a11y, sign-in, listen + players, membership landing/plans/paywall/manage/payment states/checkout chrome, system empty/error/404/maintenance/permissions/network
- **Tests:** `e2e/reader-ds-language.spec.ts`, screenshot helper spec
- **This doc** + screenshots under `docs/jandarpan-reader-redesign/screenshots/release-blockers/language/`

## Key coverage

- **`JD_DS_KEY_COUNT`:** **369** typed keys (identical hi/en sets).
- Domains: `nav.*`, `masthead.*`, `brand.*`, `util.*`, `action.*`, `search.*`, `district.*`, `profile.*`, `language.*`, `signin.*`, `saved.*`, `history.*`, `followed.*`, `notify.*`, `districtPrefs.*`, `a11y.*`, `listen.*`, `membership.*`, `system.*`, `article.*` (controls), `common.*`, `home.*`.

## Untranslated intentional content

- CMS **headlines, summaries, and article bodies** (existing locale/data behavior)
- CMS **category / desk labels** on home streams (`stream.labelHi || stream.label`)
- **Plan names / blurbs / price labels** from monetization data
- **Brand glyph “ज”** in masthead mark
- Optional **Odia “coming soon”** row on D26 (not selectable)
- Some deep article variant chrome (live blog timestamps, photo credits already keyed where primary) may still show Hindi on secondary article templates — not primary nav/search/membership chrome

## Test evidence

| Check | Result |
|--------|--------|
| `git diff --check` | Pass (no whitespace errors) |
| ESLint (changed DS i18n + critical pages) | Pass |
| `tsc --noEmit` | Pass |
| Vitest `strings.test.ts` + `config.test.ts` | Pass |
| Playwright `e2e/reader-ds-language.spec.ts` | Run with `NEXT_PUBLIC_READER_DS=1` |
| Build flag on / flag off | Run before commit |

Acceptance covered by Playwright:

1. Default Hindi chrome  
2. D26 → English updates nav + persists reload  
3. Switch back to Hindi  
4. No mixed primary nav (होम vs Home)  
5. No hydration error with English cookie  

## Screenshot paths

`docs/jandarpan-reader-redesign/screenshots/release-blockers/language/`

- `home-hi|en-{390x844,430x932}.png`
- `search-hi|en-*.png`
- `article-hi-*.png` / `article-en-chrome-*.png`
- `membership-hi|en-*.png`
- `d26-before-*.png` / `d26-after-en-*.png`

Capture: `npx playwright test e2e/reader-ds-language-screenshots.spec.ts`

## Remaining limitations

- Not every tertiary label inside long article variants / ad creatives is dictionary-driven.
- English category section titles still follow CMS Hindi labels when editors only publish `labelHi`.
- Dismissible ad chrome (`रिपोर्ट` / `बंद करें` / `विज्ञापन बंद करें`) and some relative-time chips can still show Hindi in English mode.
- Weather/rate tiles and tablet/desktop Plot fidelity are **out of scope** (other blockers).
- Checkout remains preview-only (blocker #2); only chrome strings localized.

## Blocker #3 closure

**Yes — closed for primary Reader DS routes** listed in the release brief: home, search, district/category chrome, article controls, saved/history/notifications, D26, membership chrome, system states, login — Hindi default, English consistent chrome, persist + reload, flag-off untouched.

**Preview verified** on commit `d48daf27f372b3b2476f0cb777f2e404d4c4e83d`: Hindi default chrome, D26 → English updates nav/masthead/section labels without mixed primary nav.