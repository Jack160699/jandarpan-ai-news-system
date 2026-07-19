# Jan Darpan Public Reader Redesign — Final Implementation Report

**Document type:** Engineering handoff / production release review  
**Scope:** Phases 1–8 (foundation through production release candidate)  
**Date:** 2026-07-20  
**Repository:** `newspaper-motion` (GitHub: `Jack160699/jandarpan-ai-news-system`)  
**Feature branch HEAD:** `47ca9e6`  
**Merge base with `main`:** `33d1cb1`  
**Diff vs `main`:** 441 files changed · +16,538 / −19 lines  
**Feature flag:** `NEXT_PUBLIC_READER_DS=1`  
**Production merge / Production deploy:** **Not performed**

---

## 1. Executive summary

This program delivered a flag-gated recreation of the approved **Ultimate Jan Darpan** public reader (navy `#0a2550` / sindoor red `#9e1b22` / gold `#c19a3e` / paper `#f7f4ec`) across the Plot Design inventory of **54 mobile screens** (groups A–F), plus tablet/desktop editorial grids (Phase 6), system-state product polish (Phase 7), and a production release candidate package (Phase 8).

Work lives exclusively on `feat/jandarpan-reader-design-system`. With the flag **off** (Production default), the legacy reader is unchanged. With the flag **on** (Preview / local), routes render the new design system under `src/features/reader-ds/`.

**Verified on the feature branch:** typecheck pass · production build with flag ON pass · Vitest 264 pass · Playwright reader-ds smoke + a11y 8/8 pass · 259 screenshot artifacts · Preview deployments READY with branch alias.

**Not done (by design):** merge to `main`, Production promote, Production `NEXT_PUBLIC_READER_DS=1`, live payment processor.

**Release posture:** the redesign is **Preview-ready and merge-eligible as a flag-gated Release Candidate**. Enabling the flag on Production should wait for product/design/eng sign-off and completion of the go-live checklist in §24. See §27 for the production-readiness recommendation.

---

## 2. Branch names

| Branch | Purpose | Tip / notes |
|--------|---------|-------------|
| `feat/jandarpan-reader-design-system` | All redesign work (Phases 1–8) | HEAD `47ca9e6` |
| `main` | Production line — **untouched by merge** | Merge base `33d1cb1` |
| `rollback/reader-design-20260719` | Pre-feature safety branch | Points at `33d1cb1` |

**Remote tracking:** `origin/feat/jandarpan-reader-design-system`  
**Vercel project:** `newspaper-motion` (`prj_kJbD8R5jMyugTUpK4V95ZqhMI0YZ`)  
**Vercel team:** `team_UWCzHaOLdAOtezWqRxYNxdYf`

---

## 3. Commit history

All commits on `feat/jandarpan-reader-design-system` not in `origin/main` (19 commits):

| SHA | Message | Phase |
|-----|---------|-------|
| `1275475` | feat(reader): add navy/red/gold reader design system foundation (flag-gated) | 1 |
| `2f867ff` | docs(reader): add Phase 1 final report (foundation, preview, rollback) | 1 |
| `eca51fb` | docs(reader): record READY preview deployment in final report | 1 |
| `39fac46` | fix(reader): visually correct homepage to match approved A1 mockup | 1 correction |
| `67b49e7` | docs(reader): record visual-correction preview smoke evidence | 1 correction |
| `563d36a` | feat(reader): implement Phase 2 discovery screens on reader design system | 2 |
| `f51362f` | fix(reader): complete Phase 2 discovery screens with visual audit | 2 |
| `5e461a2` | feat(reader): implement Phase 3 editorial article templates | 3 |
| `b4788e0` | fix(reader): resolve Phase 3 TypeScript build errors | 3 |
| `ab4416c` | feat(reader): implement Phase 4 audio and personalization screens | 4 |
| `080dbb2` | docs(reader): add Phase 4 Preview URL to visual audit | 4 |
| `7527abf` | feat(reader): implement Phase 5 monetization screens | 5 |
| `3a9fe7b` | docs(reader): add Phase 5 Preview URL to visual audit | 5 |
| `7fcb377` | feat(reader): implement Phase 6 tablet and desktop editorial grid | 6 |
| `8002225` | docs(reader): add Phase 6 Preview URL to visual audit | 6 |
| `726b8ca` | feat(reader): implement Phase 7 system states and product polish | 7 |
| `7fdcefb` | docs(reader): add Phase 7 Preview URL to visual audit | 7 |
| `e92f34d` | chore(reader): prepare Phase 8 production release candidate | 8 |
| `47ca9e6` | docs(reader): pin Phase 8 RC HEAD commit in release doc | 8 |

---

## 4. Changed files

### 4.1 Aggregate

| Metric | Value |
|--------|-------|
| Files changed vs `main` | **441** |
| Insertions | **+16,538** |
| Deletions | **−19** |
| New feature root | `src/features/reader-ds/` (**107** files at HEAD) |

### 4.2 Categories

| Category | Paths |
|----------|-------|
| Feature implementation | `src/features/reader-ds/**` |
| App Router wiring | `src/app/page.tsx`, `src/app/story/[slug]/page.tsx`, `src/app/district/**`, `src/app/category/**`, `src/app/latest/page.tsx`, `src/app/trending/page.tsx`, `src/app/search/page.tsx`, `src/app/topics/**`, `src/app/live/**`, `src/app/listen/**`, `src/app/archive/**`, `src/app/membership/**`, `src/app/premium/**`, `src/app/loading.tsx`, `src/app/error.tsx`, `src/app/not-found.tsx`, `src/app/maintenance/page.tsx`, `src/app/system/preview/**`, `src/app/robots.ts`, `src/app/saved/page.tsx`, `src/app/notifications/page.tsx` |
| Chrome opt-out | `src/components/navigation/AppChrome.tsx` |
| Minor data helpers | `src/lib/news/fallback/wire-articles.ts`, `src/lib/newsroom/generated/read.ts`, `src/lib/story/get-story-data.ts` |
| Styles | `src/styles/globals.css` (font/var hook) |
| Tests | `e2e/reader-ds-smoke.spec.ts`, `e2e/reader-ds-a11y.spec.ts`, `src/features/reader-ds/config.test.ts`, `playwright.config.ts`, `package.json` scripts |
| Design refs | `public/design-refs/**` |
| Capture scripts | `scripts/capture-phase-{2–7}-screens.mjs`, `scripts/decode-cdp-shot.mjs`, `scripts/recapture-phase-2-impl.mjs` |
| Documentation | `docs/jandarpan-*.md`, `docs/jandarpan-reader-redesign/**` |
| Screenshots | `docs/jandarpan-reader-redesign/screenshots/**` (259 PNG) |

Full path list for `src/features/reader-ds` and `src/app` is enumerated in §5 and §6. Complete git name-only list: `git diff --name-only origin/main...HEAD`.

---

## 5. New components

Root: `src/features/reader-ds/`

### 5.1 Config / fonts / utils

| File | Role |
|------|------|
| `config.ts` | `isReaderDesignSystemEnabled()`, `isReaderDesignSystemQaEnabled()` |
| `config.test.ts` | Flag + QA Production-block unit tests |
| `fonts.ts` | Mukta + Tiro className helper |
| `utils.ts` | Hindi relative time, story href, `ReaderStory` mapping |
| `styles.ts` | Side-effect import of tokens + responsive CSS |

### 5.2 Design tokens & responsive CSS

| File | Role |
|------|------|
| `styles/tokens.css` | Colours, type, spacing, data-saving, high-contrast, font-scale, focus-visible, skeleton |
| `styles/responsive.css` | Tablet ≥768 / desktop ≥1024 / wide ≥1280 newspaper grid |

### 5.3 Shared atoms & chrome (`components/`)

`JdIcon` / `icons.tsx` · `ArticleImage` · `Tag` · `SectionHeader` · `AiSummary` · `ActionRow` · `Masthead` · `MastheadSearchButton` · `UtilityRow` · `BreakingStrip` · `LeadStory` · `SecondaryStory` · `ChronoStory` · `TrendingRankRow` · `Ad` · `DismissibleAd` · `UtilTiles` · `ChipRow` · `BottomNav` · `DesktopPrimaryNav` · `navItems` · `ReaderShell` · `SearchOverlay` · `DistrictSelector` · `DistrictContextBar` · `LatestRefreshBar` · `primitives.tsx`

*(Removed in Phase 8: dead `AudioBriefingCta`)*

### 5.4 Homepage

| File | Role |
|------|------|
| `homepage/ReaderHomepage.tsx` | A1 assembly from live `GeneratedHomepageFeed` |

### 5.5 Discovery pages (`pages/`)

`DistrictHomepage` · `DistrictSelectorPage` · `CategoryPage` · `LatestPage` · `TrendingPage` · `SearchLandingPage` · `SearchResultsPage` · `TopicPage` · `LiveNewsPage` · `pages/index.ts`

### 5.6 Article / storytelling (`article/`)

`ReaderArticlePage` · `ReaderLiveBlogPage` · `ReaderPremiumReportPage` · `buildArticleModel` · `resolveVariant` · `types` · components: `ArticleBanners` · `ArticleShareBar` · `AudioInline` · `Byline` · `ExplainerBody` · `KeyPoints` · `LiveBlogTimeline` · `NoImagePlaceholder` · `OpinionBody` · `PhotoGallery` · `VideoPlayer`

### 5.7 Experience / audio / prefs (`experience/`)

`ExperienceChrome` · `prefs.ts` · `catalog` / `loadCatalog` / `loadListenTracks` · audio: `AudioProvider` · `MiniPlayer` · `FullPlayer` · `tracksFromShorts` · `types` · UI: `SettingRow` · `Toggle` · pages: `ListenBriefingPage` · `AudioQueuePage` · `DownloadsPage` · `LanguagePage` · `ProfileHubPage` · `SavedStoriesPage` · `ReadingHistoryPage` · `FollowedTopicsPage` · `NotificationPrefsPage` · `DistrictPrefsPage` · `AccessibilityPage`

### 5.8 Monetization (`monetization/`)

Pages: `MembershipLandingPage` · `PlanComparisonPage` · `PremiumPaywallPage` · `CheckoutPage` · `PaymentSuccessPage` · `PaymentFailurePage` · `ManageSubscriptionPage`  
Components: `ArticleInlineAd` · `NativeSponsoredCard` · `PremiumExclusiveStrip` · `planHelpers.ts`

### 5.9 System states (`system/`)

`LoadingSkeleton` · `EmptyState` · `StateBody` · `ErrorStatePage` · `NotFoundStatePage` · `MaintenancePage` · `NetworkGuards` · `PermissionSheet` · `ForceNetworkDemo` (QA)

---

## 6. Routes implemented

### 6.1 Flag ON — DS UI swap

| Route | Implementation |
|-------|----------------|
| `/` | `ReaderHomepage` |
| `/district` | `DistrictSelectorPage` |
| `/district/[slug]` | `DistrictHomepage` |
| `/category/[slug]` | `CategoryPage` |
| `/latest` | `LatestPage` |
| `/trending` | `TrendingPage` |
| `/search` | Landing / results |
| `/topics/[slug]` | `TopicPage` |
| `/live`, `/live/[slug]` | `LiveNewsPage` / live blog |
| `/story/[slug]` | Article variants B11–B20 |
| `/premium/[slug]` | Premium + paywall |
| `/listen` | Briefing |
| `/listen/queue` | Queue |
| `/listen/downloads` | Downloads |
| `/archive` | Profile hub |
| `/archive/saved` | Saved |
| `/archive/history` | History |
| `/archive/followed` | Followed |
| `/archive/notifications` | Notification prefs |
| `/archive/language` | Language |
| `/archive/districts` | District prefs |
| `/archive/accessibility` | Accessibility / data-saving |
| `/membership` | Landing |
| `/membership/plans` | Plans |
| `/membership/checkout` | Checkout shell |
| `/membership/success` | Success |
| `/membership/failure` | Failure |
| `/membership/manage` | Manage |

### 6.2 Global boundaries (flag ON)

| Route / file | Screen |
|--------------|--------|
| `src/app/loading.tsx` | F46 skeleton |
| `src/app/error.tsx` | F48 error |
| `src/app/not-found.tsx` | F54 404 |
| `/maintenance` | F53 |

### 6.3 Redirect helpers (flag ON)

| From | To |
|------|-----|
| `/saved` | `/archive/saved` |
| `/notifications` | `/archive/notifications` |

### 6.4 Preview-only QA (blocked when `VERCEL_ENV=production`)

| Route | Purpose |
|-------|---------|
| `/system/preview?state=…` | F46–F54 gallery |
| `/membership/paywall-preview` | Paywall design QA |

### 6.5 AppChrome

`src/components/navigation/AppChrome.tsx` skips legacy chrome for DS exact routes and prefixes (`/district/`, `/category/`, `/story/`, `/membership/`, `/system/`, `/archive/`, …) when the flag is on.

---

## 7. Shared design system

### 7.1 Tokens (`styles/tokens.css`)

| Token | Value |
|-------|-------|
| Navy | `#0a2550` |
| Navy deep | `#081b3a` |
| Red | `#9e1b22` |
| Gold | `#c19a3e` |
| Gold soft | `#e7d6a4` |
| Paper | `#f7f4ec` |
| Ink | `#16130d` |
| Green / OK | `#2f7d52` |
| Amber | `#c07a1e` |
| Spacing | 2 · 4 · 8 · 12 · 14 · 18 · 24 · 32 |
| Radius | 2px editorial · touch ≥44px |
| Fonts | Tiro Devanagari Hindi · Noto Serif Devanagari · Mukta |
| Scope | `.jd-ds` only — no global leak |

Also: dark theme vars · `html[data-data-saving]` · `html[data-high-contrast]` · `html[data-font-scale]` · `:focus-visible` gold ring · skeleton shimmer · `prefers-reduced-motion`.

### 7.2 Responsive (`styles/responsive.css`)

| Breakpoint | Behavior |
|------------|----------|
| &lt;768 mobile | Phone column; bottom nav |
| ≥768 tablet | Centered shell; `DesktopPrimaryNav`; bottom nav hidden |
| ≥1024 desktop | Lead+rail · article reading column + related rail |
| ≥1280 wide | 3-column section feeds |

### 7.3 Icons

Line set in `components/icons.tsx` (no emoji UI icons): home, pin, bolt, headphone, search, user, bell, bookmark, share, play, more, clock, eye, download, wifiOff, wifi, globe, filter, fire, mic, rupee, lock, star, arrows/chevrons, refresh, close, rain, check, flag, pause, prev/next, list, plus, cog, sun, alert.

### 7.4 AI transparency

Mandatory label on AI summaries: **✦ संक्षेप में · AI-सहायता, संपादक-सत्यापित** (`AiSummary`).

---

## 8. Homepage completion

| Item | Status |
|------|--------|
| Route | `/` → `ReaderHomepage` when flag ON |
| Data | `getCachedGeneratedHomepageFeed()` — real feed only |
| Masthead | Navy sticky · Tiro wordmark · search / bell / profile |
| Utility row | District · date · weather |
| Breaking strip | Conditional on real breaking data |
| Lead | 190px / 3:2 · kicker · serif 22 · AI summary · ActionRow |
| Secondary rows | Thumb + kicker + title + time |
| Sections | Category streams / regional — collapse when empty |
| Util tiles | Rates / fuel / weather tiles |
| Ads | Labeled विज्ञापन · dismissible · native प्रायोजित · hidden for premium |
| Premium strip | When applicable |
| Bottom nav | 5 destinations |
| Tablet/desktop | Lead+rail + multi-column sections (Phase 6) |
| Visual correction | A1 mockup parity after `39fac46` |

**Screenshots:**  
- `docs/jandarpan-reader-redesign/screenshots/mobile-homepage-masthead.png`  
- `docs/jandarpan-reader-redesign/screenshots/homepage-full-width.png`  
- `docs/jandarpan-reader-redesign/screenshots/visual-correction/*`  
- Phase 6/7 home captures under `…/screenshots/phase-6/` and `…/screenshots/phase-7/`

**Approved ref:** `public/design-refs/approved-a1-homepage.html` · `docs/jandarpan-reader-redesign/approved-a1-homepage.html`

---

## 9. All 54 screen implementation status

Legend: **Done** = DS UI implemented behind flag · **Preserved** = existing product surface retained (not redesigned in `reader-ds`) · **Partial** = DS chrome with honest empty / non-live payment / session-dependent visual.

| # | ID | Screen | Route / surface | Status | Evidence |
|---|-----|--------|-----------------|--------|----------|
| 1 | A1 | Homepage | `/` | **Done** | Phase 1 + visual-correction + P6/P7 home shots |
| 2 | A2 | District homepage | `/district/[slug]` | **Done** | Phase 2 + P5 sponsor honesty + P6 desktop |
| 3 | A3 | Category | `/category/[slug]` | **Done** | Phase 2 + P6 |
| 4 | A4 | Latest | `/latest` | **Done** | Phase 2 |
| 5 | A5 | Trending | `/trending` | **Done** | Phase 2 |
| 6 | A6 | Search overlay | Masthead overlay | **Done** | Phase 2 |
| 7 | A7 | Search results | `/search` | **Done** | Phase 2 + P6 |
| 8 | A8 | Topic | `/topics/[slug]` | **Done** | Phase 2 |
| 9 | A9 | Live news | `/live` | **Done** | Phase 2 + P6 |
| 10 | A10 | District selector | `/district` | **Done** | Phase 2 |
| 11 | B11 | Standard article | `/story/[slug]` | **Done** | Phase 3 |
| 12 | B12 | Breaking article | `/story/[slug]` variant | **Done** | Phase 3 |
| 13 | B13 | Live blog | `/live/[slug]` / story live | **Done** | Phase 3 |
| 14 | B14 | Photo story | `/story/[slug]` variant | **Done** | Phase 3 |
| 15 | B15 | Video story | `/story/[slug]` variant | **Done** | Phase 3 |
| 16 | B16 | Explainer | `/story/[slug]` variant | **Done** | Phase 3 |
| 17 | B17 | Opinion / editorial | `/story/[slug]` variant | **Done** | Phase 3 |
| 18 | B18 | Sponsored article | `/story/[slug]` + label | **Done** | Phase 3 |
| 19 | B19 | Premium article | `/premium/[slug]` | **Done** | Phase 3 + P5 paywall |
| 20 | B20 | Article without image | `/story/[slug]` variant | **Done** | Phase 3 |
| 21 | C21 | Top-10 audio briefing | `/listen` | **Done** | Phase 4 |
| 22 | C22 | Mini player | Shell chrome | **Done** | Phase 4 |
| 23 | C23 | Full player | Shell chrome | **Done** | Phase 4 |
| 24 | C24 | Audio queue & settings | `/listen/queue` | **Done** | Phase 4 |
| 25 | C25 | Downloaded / offline audio | `/listen/downloads` | **Done** | Phase 4 |
| 26 | D26 | Language selection | `/archive/language` | **Done** | Phase 4 |
| 27 | D27 | Onboarding | `onboarding-v3` (existing) | **Preserved** | Out of DS redesign scope; existing flow retained |
| 28 | D28 | Sign in / sign up | `/login` (existing) | **Preserved** | Out of DS redesign scope; existing auth retained |
| 29 | D29 | Reader profile | `/archive` | **Done** | Phase 4 |
| 30 | D30 | Saved stories | `/archive/saved` | **Done** | Phase 4 + F47 empty |
| 31 | D31 | Reading history | `/archive/history` | **Done** | Phase 4 |
| 32 | D32 | Followed topics | `/archive/followed` | **Done** | Phase 4 |
| 33 | D33 | Notification preferences | `/archive/notifications` | **Done** | Phase 4 |
| 34 | D34 | District preferences | `/archive/districts` | **Done** | Phase 4 |
| 35 | D35 | Accessibility & data-saving | `/archive/accessibility` | **Done** | Phase 4 |
| 36 | E36 | Membership landing | `/membership` | **Done** | Phase 5 |
| 37 | E37 | Plan comparison | `/membership/plans` | **Done** | Phase 5 |
| 38 | E38 | Premium content gate | `/premium/[slug]` | **Done** | Phase 5 |
| 39 | E39 | Checkout | `/membership/checkout` | **Partial** | UI Done; **no live charges** (`checkout-not-live`) |
| 40 | E40 | Payment success | `/membership/success` | **Done** | Phase 5 |
| 41 | E41 | Payment failure | `/membership/failure` | **Done** | Phase 5 |
| 42 | E42 | Manage subscription | `/membership/manage` | **Done** | Phase 5 (local cancel confirm) |
| 43 | E43 | Ad-free member state | `/` when premium | **Partial** | Code path Done; visual needs premium session |
| 44 | E44 | Native sponsored | Homepage | **Done** | Phase 5 |
| 45 | E45 | Display ads | Homepage sticky/mid | **Done** | Phase 5 |
| 46 | F46 | Loading | `loading.tsx` | **Done** | Phase 7 |
| 47 | F47 | Empty | Saved empty / `EmptyState` | **Done** | Phase 7 |
| 48 | F48 | General error | `error.tsx` | **Done** | Phase 7 |
| 49 | F49 | Offline | `NetworkGuards` | **Done** | Phase 7 |
| 50 | F50 | Slow connection | `NetworkGuards` | **Done** | Phase 7 |
| 51 | F51 | Notification permission | `PermissionSheet` | **Done** | Phase 7 |
| 52 | F52 | Location permission | `PermissionSheet` | **Done** | Phase 7 |
| 53 | F53 | Maintenance | `/maintenance` | **Done** | Phase 7 |
| 54 | F54 | 404 | `not-found.tsx` | **Done** | Phase 7 (trending rail may be empty) |

**Counts:** Done **50** · Partial **2** (E39, E43) · Preserved **2** (D27, D28).

---

## 10. Responsive implementation status

| Viewport | Width | Status | Evidence |
|----------|-------|--------|----------|
| Mobile | 390×844 (design) | **Done** — phone atoms, bottom nav | Phases 1–5, 7 screenshots |
| Mobile wide | 430 | Captured in visual-correction | `visual-correction/after-impl-430.png` |
| Tablet | 768 | **Done** — top nav, shell, 2-col | Phase 6 audit + shots |
| Desktop | 1280 | **Done** — lead+rail, article rail | Phase 6 |
| Wide | 1440 | **Done** — 3-col sections | Phase 6 |
| Plot desktop mocks | — | **N/A** — Plot gallery is mobile-only; desktop grid derived from tokens + audit | Phase 6 design note |

CSS: `src/features/reader-ds/styles/responsive.css`  
Approved desktop refs: `public/design-refs/phase-6/approved-phase-6-desktop.html`

---

## 11. Backend systems preserved

No redesign of admin. No destructive migrations. No invented news brands or live payments.

| System | Status |
|--------|--------|
| Next.js App Router + TypeScript | Preserved |
| Supabase (articles, generated, auth) | Preserved — clients in `src/lib/supabase/*` |
| Auth / RBAC / admin | Preserved — `/admin` unchanged |
| Publishing / ingest / QStash crons | Preserved — `vercel.json` crons intact |
| SEO (metadata, JSON-LD, sitemaps) | Preserved + robots QA disallow added |
| ISR / edge cache helpers | Preserved |
| Audio / shorts feeds | Reused for listen tracks |
| Monetization payload / plans | Reused; checkout intentionally not live |
| Analytics collector + admin analytics | Preserved |
| Sentry | Preserved |
| i18n LanguageProvider | Preserved; DS Hindi-first UI strings |
| Onboarding v3 / login | Preserved (D27/D28) |

---

## 12. SEO verification

| Asset | Location | Result |
|-------|----------|--------|
| Root / tenant metadata | `src/app/layout.tsx`, `src/lib/tenant/metadata.ts` | Pass — unchanged contract |
| Page builders | `src/lib/seo/metadata.ts` | Pass — home/category/hub/utility |
| JSON-LD | `src/lib/seo/json-ld.ts`, story helpers | Pass — homepage + article scripts retained |
| `robots.txt` | `src/app/robots.ts` | Pass — disallow admin/debug/dashboard/api **+ `/system/` + `/membership/paywall-preview`** (Phase 8) |
| `sitemap.xml` | `src/app/sitemap.ts` | Pass — `revalidate` 3600 |
| `news-sitemap.xml` | `src/app/news-sitemap.xml/route.ts` | Pass — `revalidate` 300 |
| Canonical / OG | Per-route `generateMetadata` | Pass |
| DS impact | Flag swaps presentation only | Pass — SEO data paths not replaced with mocks |

---

## 13. Accessibility verification

| Check | Result |
|-------|--------|
| Main landmark `#main-content` / `role="main"` | Pass — Playwright a11y |
| Bottom nav accessible names | Pass — Playwright |
| Error retry control named | Pass — Playwright |
| Permission dialog `role="dialog"` + labelled heading | Pass — Playwright |
| Focus-visible gold ring | Pass — tokens CSS |
| Touch targets ≥44px | Pass — design system rule on controls |
| High contrast / font scale prefs | Pass — `applyExperienceToDocument` |
| Reduced motion | Pass — tokens media query |
| AI summary transparency | Pass — mandatory label |
| Full axe-core CI | **Not installed** — listed as follow-up |

Specs: `e2e/reader-ds-a11y.spec.ts` · command `npm run test:a11y`

---

## 14. Performance metrics

| Metric / practice | Result |
|-------------------|--------|
| New heavy client libraries for DS | None (no new analytics SDKs) |
| Loading UX | Content-shaped skeleton (F46) over spinner |
| Images (DS) | CDN `optimizeCdnUrl` + native `<img>` + data-saving hide |
| Images (legacy cards) | `next/image` via JDS |
| ISR homepage / story | `revalidate = 60` |
| Bundle analyzer automation | **Not present** — recommend post-RC |
| Production build (flag ON) | Pass (2026-07-20 local) |
| Middleware | Present |

**Known gap:** `next.config.ts` has no `images.remotePatterns`; DS path does not depend on Next Image optimizer.

---

## 15. Build results

| Command | Environment | Result |
|---------|-------------|--------|
| `npm run build` | `NEXT_PUBLIC_READER_DS=1` | **Pass** (2026-07-20) |
| Vercel Preview builds | Feature branch | **READY** (multiple phase deploys) |

Build lists DS routes including `/`, `/story/[slug]`, `/membership/*`, `/system/preview`, `/maintenance`, archive/listen hubs.

---

## 16. Lint results

| Scope | Result |
|-------|--------|
| Scoped eslint on `src/features/reader-ds` + system/app wiring | **0 errors** (Phase 7); existing react-hooks warnings in older experience pages |
| Full-repo `npm run lint` | **Unreliable** — may hang on `.claude/worktrees` (documented Phase 7/8) |

Recommendation: add worktree ignore to eslint config before CI relies on full-repo lint.

---

## 17. Typecheck results

| Command | Result |
|---------|--------|
| `npm run typecheck` (`tsc --noEmit`) | **Pass** (Phases 3 fix `b4788e0` onward; reconfirmed Phase 7/8) |

---

## 18. Test results

| Suite | Command | Result |
|-------|---------|--------|
| Unit (Vitest) | `npm test` | **Pass — 264 tests** (Phase 7 run) |
| Config unit | `npm test -- src/features/reader-ds/config.test.ts` | **Pass — 2 tests** (flag + QA Production block) |

---

## 19. Playwright results

| Suite | Specs | Result |
|-------|-------|--------|
| Reader DS smoke | `e2e/reader-ds-smoke.spec.ts` | **Pass** |
| Reader DS a11y | `e2e/reader-ds-a11y.spec.ts` | **Pass** |
| Combined | `npm run test:reader-ds` | **8/8 Pass** (Phase 7; requires `NEXT_PUBLIC_READER_DS=1`) |

`playwright.config.ts` defaults `NEXT_PUBLIC_READER_DS` to `1` for local webServer.

Admin Phase 5/6 Playwright suites exist separately and were not the redesign acceptance gate.

---

## 20. Screenshot comparison summary

| Phase | Approved vs implementation | Major diffs | Outcome |
|-------|----------------------------|-------------|---------|
| 1 / A1 correction | Plot A1 vs homepage | Real feed headlines vs mock; brand home glyph | Pass after `39fac46` |
| 2 Discovery | Phase-2 HTML phones | Real empty hubs when no tagged content | Pass |
| 3 Articles | Phase-3 HTML | Variant depends on story fields / `dsVariant` QA | Pass |
| 4 Audio / account | Phase-4 HTML | Real shorts-derived audio; local prefs | Pass |
| 5 Monetization | Phase-5 HTML | No fake sponsors/orders; checkout not live | Pass |
| 6 Desktop | Phase-6 HTML frames | No Plot desktop mocks — editorial grid derived | Pass |
| 7 System | Phase-7 HTML phones | Real chrome icons; F54 trending may be empty | Pass |

**Artifact counts (PNG):**

| Directory | Count |
|-----------|------:|
| `docs/jandarpan-reader-redesign/screenshots/` (root) | 2 |
| `…/visual-correction/` | 6 |
| `…/phase-2/` | 28 |
| `…/phase-3/` | 33 |
| `…/phase-4/` | 39 |
| `…/phase-5/` | 55 |
| `…/phase-6/` | 45 |
| `…/phase-7/` | 51 |
| **Total** | **259** |

Naming convention: `{id}-approved-reference.png`, `{id}-implementation.png`, `{id}-corrected-final.png`, plus Phase 7 `{id}-before.png` and desktop suffixes where applicable.

**Complete path inventory:** Appendix A (every PNG path).

---

## 21. Remaining visual differences

Source of truth: `docs/jandarpan-reader-redesign-phase-7-remaining-issues.md`

1. Bottom-nav home uses production brand mark (“N” / logo tile) instead of Plot line-home icon — intentional brand continuity.  
2. F54 trending rail empty when no catalog on not-found path — honest degradation.  
3. F51/F52 sheets appear after client mount (one frame) — SSR/localStorage safety.  
4. Static HTML design refs may use emoji icons; production uses line SVG icons.  
5. Phase 6 desktop is not pixel-matched to Plot (Plot is mobile-only).  
6. Real editorial headlines/images differ from gallery mock copy (required — no fake news).  
7. District/category empty when feed pools lack tags.  
8. E43 ad-free visual needs a premium session to screenshot.

No major structural visual blockers remain for Preview ship.

---

## 22. Remaining functional issues

1. **Checkout not live** — paid path returns `checkout-not-live` / failure UI. Intentional honesty.  
2. **Manage subscription cancel** — local confirmation only; no invented cancel API.  
3. **Offline package listing** — banner + saved link; full offline library depends on real downloads.  
4. **D27 Onboarding / D28 Login** — not redesigned in DS; existing flows preserved.  
5. **English UI string pass** — language page exists; most DS chrome remains Hindi-first.  
6. **axe-core CI** — not wired; Playwright landmark/name gates only.  
7. **Bundle analyzer** — not automated.  
8. **`images.remotePatterns`** — not configured in `next.config.ts`.  
9. **Full-repo lint hang** risk with `.claude/worktrees`.  
10. **QA routes** — available on Preview; hard-blocked on Vercel Production via `isReaderDesignSystemQaEnabled()`.

---

## 23. Preview deployment URL

### Current / Phase 7–8 (use this for review)

| Item | URL |
|------|-----|
| **Primary Preview (Phase 7 feature READY)** | https://newspaper-motion-faumlh45l-jack160699s-projects.vercel.app |
| **Stable branch alias** | https://newspaper-motion-git-feat-jandarpan-b9dd37-jack160699s-projects.vercel.app |
| Inspector (Phase 7) | https://vercel.com/jack160699s-projects/newspaper-motion/A4QKFusqv56Az7nnY3KqKqV6Qzdp |
| Phase 7 docs Preview note | Also `dpl_G9HnAuDUtKqVAKcjvfu9M5cguVpp` → https://newspaper-motion-5cgesfhrg-jack160699s-projects.vercel.app |

Phase 8 pushes (`e92f34d` / `47ca9e6`) trigger newer Preview builds; prefer the **branch alias** for the latest READY commit.

### Historical phase Previews (audit trail)

| Phase | Preview URL |
|-------|-------------|
| 6 | https://newspaper-motion-g2wbv0e9a-jack160699s-projects.vercel.app |
| 5 | https://newspaper-motion-b10lvl6wn-jack160699s-projects.vercel.app |
| 4 | https://newspaper-motion-aky60zk57-jack160699s-projects.vercel.app (feature) / docs `080dbb2` |
| 2 | https://newspaper-motion-6klyrexx4-jack160699s-projects.vercel.app |

**Flag:** Preview must have `NEXT_PUBLIC_READER_DS=1` (branch-scoped).  
**QA:** `/system/preview?state=loading|empty|error|offline|slow|notify|location|404` · `/maintenance`

---

## 24. Production readiness checklist

Authoritative checklist also in `docs/jandarpan-production-release.md` §11.

### Pre-merge

- [ ] Product / design / eng sign-off on Preview (390 / 768 / 1280)
- [ ] Accept remaining visual/functional issues (§21–§22)
- [ ] Confirm Production **does not** have `NEXT_PUBLIC_READER_DS=1`
- [ ] Confirm QA galleries blocked on Production (`VERCEL_ENV=production`)
- [ ] Spot-check `/robots.txt`, `/sitemap.xml`, `/news-sitemap.xml`
- [ ] Spot-check home metadata + one story JSON-LD
- [ ] Admin login + editorial queue smoke (unchanged)
- [ ] Cron health green
- [ ] Checkout still fails closed

### Merge (human only)

- [ ] PR `feat/jandarpan-reader-design-system` → `main`
- [ ] CI green
- [ ] Merge (no force-push)

### Enable flag (human only — last)

- [ ] Set Production `NEXT_PUBLIC_READER_DS=1`
- [ ] Redeploy Production
- [ ] Smoke `/`, story, listen, membership, mobile + desktop
- [ ] Monitor Sentry / analytics 24h

### Explicit non-actions already held

- [x] No merge performed in this program  
- [x] No Production promote performed  
- [x] No live payment processor invented  

---

## 25. Rollback procedure

### A. Before Production flag enable (current state)

Production is unaffected. Discard Preview or keep branch; no Production rollback needed.

### B. Instant UI kill-switch (after flag enable)

1. Vercel → Environment Variables → Production  
2. Unset `NEXT_PUBLIC_READER_DS` or set `0`  
3. Redeploy Production  
4. Confirm `/` has no `.jd-ds`

### C. Git revert (if merged)

```text
git checkout main
git pull
git revert -m 1 <merge-commit-sha>
git push origin main
```

Emergency tip: `rollback/reader-design-20260719` → `33d1cb1` (only with explicit approval).

### D. Vercel Instant Rollback

Deployments → prior Production READY → **Promote to Production**.

### E. Payments / data

No live charges introduced; no schema migrations in Phases 1–8.

---

## 26. Known limitations

1. Checkout / billing processor not integrated (honest failure path).  
2. Onboarding (D27) and login (D28) not restyled to DS.  
3. Desktop layouts are editorial-grid specs, not Plot pixel desktop mocks.  
4. Hindi-first UI; English string parity incomplete.  
5. No `@next/bundle-analyzer` gate.  
6. No axe-core CI dependency.  
7. Offline content depth limited to saved/downloads actually present on device.  
8. District sponsor strip omitted without real affiliate placement.  
9. Full-repo eslint may hang on nested worktrees.  
10. Production go-live still requires human checklist (§24).

---

## 27. Recommendation: Is the redesign production-ready?

### Verdict

**Yes — as a flag-gated Release Candidate for merge review and Preview validation.  
Not yet recommended to enable `NEXT_PUBLIC_READER_DS=1` on Production until sign-off completes the §24 checklist.**

### Why it is RC / Preview ready

1. **52/54 design screens** have DS implementations (50 Done + 2 honest Partial); 2 account screens intentionally preserved.  
2. **Flag isolation** keeps Production legacy UI safe with zero flag.  
3. **Build / typecheck / unit / Playwright** gates green on the feature branch.  
4. **259 screenshot artifacts** + phase visual audits document approved vs implementation.  
5. **Backend, SEO, ISR, admin, crons, Supabase** contracts preserved.  
6. **Payments honesty** — no fake charges.  
7. **Phase 8 RC** hard-blocks QA galleries on Vercel Production and documents rollback.

### Why Production flag enable should wait

1. Explicit product/design/eng sign-off not yet recorded in this document.  
2. Live membership charging is still out of scope — product must accept fail-closed checkout.  
3. Follow-ups (axe CI, bundle analyzer, `images.remotePatterns`, English string pass, F54 trending feed) are non-blocking for Preview but should be scheduled.  
4. Merge to `main` and Production promote were **explicitly out of scope** for Phases 1–8 automation.

### Recommended next human actions

1. Review Preview on branch alias with flag ON.  
2. Complete sign-off table in `docs/jandarpan-production-release.md`.  
3. Open PR → merge.  
4. Keep Production flag **off** until go-live window; then enable last.

---

## 28. Documentation index (all redesign docs)

| Document | Path |
|----------|------|
| **This report** | `docs/jandarpan-reader-redesign-implementation-report.md` |
| Production RC | `docs/jandarpan-production-release.md` |
| Living audit | `docs/jandarpan-reader-redesign-audit.md` |
| Phase 1 final report | `docs/jandarpan-reader-redesign-final-report.md` |
| Phase 1 visual audit | `docs/jandarpan-reader-redesign-visual-audit.md` |
| Phase 2 visual audit | `docs/jandarpan-reader-redesign-phase-2-visual-audit.md` |
| Phase 3 visual audit | `docs/jandarpan-reader-redesign-phase-3-visual-audit.md` |
| Phase 4 visual audit | `docs/jandarpan-reader-redesign-phase-4-visual-audit.md` |
| Phase 5 visual audit | `docs/jandarpan-reader-redesign-phase-5-visual-audit.md` |
| Phase 6 visual audit | `docs/jandarpan-reader-redesign-phase-6-visual-audit.md` |
| Phase 7 visual audit | `docs/jandarpan-reader-redesign-phase-7-visual-audit.md` |
| Phase 7 remaining issues | `docs/jandarpan-reader-redesign-phase-7-remaining-issues.md` |
| Approved A1 HTML (docs copy) | `docs/jandarpan-reader-redesign/approved-a1-homepage.html` |
| Approved refs (public) | `public/design-refs/approved-a1-homepage.html` |
| | `public/design-refs/phase-2/approved-phase-2-screens.html` |
| | `public/design-refs/phase-3/approved-phase-3-screens.html` |
| | `public/design-refs/phase-4/approved-phase-4-screens.html` |
| | `public/design-refs/phase-5/approved-phase-5-screens.html` |
| | `public/design-refs/phase-6/approved-phase-6-desktop.html` |
| | `public/design-refs/phase-7/approved-phase-7-system.html` |
| Capture scripts | `scripts/capture-phase-2-screens.mjs` … `scripts/capture-phase-7-screens.mjs` |
| Env reference | `docs/ENVIRONMENT.md` |
| Design source (workspace) | `design-decoded.html` (Desktop `newspaper-motion/`) |

---

## Appendix A — Complete screenshot inventory (259 PNG files)

Paths are relative to the repository root `newspaper-motion/`.

### `docs/jandarpan-reader-redesign/screenshots/`

- `docs/jandarpan-reader-redesign/screenshots/homepage-full-width.png`
- `docs/jandarpan-reader-redesign/screenshots/mobile-homepage-masthead.png`

### `docs/jandarpan-reader-redesign/screenshots/phase-2/`

- `docs/jandarpan-reader-redesign/screenshots/phase-2/_debug-latest.png`
- `docs/jandarpan-reader-redesign/screenshots/phase-2/a10-district-selector-approved-reference.png`
- `docs/jandarpan-reader-redesign/screenshots/phase-2/a10-district-selector-corrected-final.png`
- `docs/jandarpan-reader-redesign/screenshots/phase-2/a10-district-selector-implementation.png`
- `docs/jandarpan-reader-redesign/screenshots/phase-2/a2-district-home-approved-reference.png`
- `docs/jandarpan-reader-redesign/screenshots/phase-2/a2-district-home-corrected-final.png`
- `docs/jandarpan-reader-redesign/screenshots/phase-2/a2-district-home-implementation.png`
- `docs/jandarpan-reader-redesign/screenshots/phase-2/a3-category-approved-reference.png`
- `docs/jandarpan-reader-redesign/screenshots/phase-2/a3-category-corrected-final.png`
- `docs/jandarpan-reader-redesign/screenshots/phase-2/a3-category-implementation.png`
- `docs/jandarpan-reader-redesign/screenshots/phase-2/a4-latest-approved-reference.png`
- `docs/jandarpan-reader-redesign/screenshots/phase-2/a4-latest-corrected-final.png`
- `docs/jandarpan-reader-redesign/screenshots/phase-2/a4-latest-implementation.png`
- `docs/jandarpan-reader-redesign/screenshots/phase-2/a5-trending-approved-reference.png`
- `docs/jandarpan-reader-redesign/screenshots/phase-2/a5-trending-corrected-final.png`
- `docs/jandarpan-reader-redesign/screenshots/phase-2/a5-trending-implementation.png`
- `docs/jandarpan-reader-redesign/screenshots/phase-2/a6-search-overlay-approved-reference.png`
- `docs/jandarpan-reader-redesign/screenshots/phase-2/a6-search-overlay-corrected-final.png`
- `docs/jandarpan-reader-redesign/screenshots/phase-2/a6-search-overlay-implementation.png`
- `docs/jandarpan-reader-redesign/screenshots/phase-2/a7-search-results-approved-reference.png`
- `docs/jandarpan-reader-redesign/screenshots/phase-2/a7-search-results-corrected-final.png`
- `docs/jandarpan-reader-redesign/screenshots/phase-2/a7-search-results-implementation.png`
- `docs/jandarpan-reader-redesign/screenshots/phase-2/a8-topic-approved-reference.png`
- `docs/jandarpan-reader-redesign/screenshots/phase-2/a8-topic-corrected-final.png`
- `docs/jandarpan-reader-redesign/screenshots/phase-2/a8-topic-implementation.png`
- `docs/jandarpan-reader-redesign/screenshots/phase-2/a9-live-approved-reference.png`
- `docs/jandarpan-reader-redesign/screenshots/phase-2/a9-live-corrected-final.png`
- `docs/jandarpan-reader-redesign/screenshots/phase-2/a9-live-implementation.png`

### `docs/jandarpan-reader-redesign/screenshots/phase-3/`

- `docs/jandarpan-reader-redesign/screenshots/phase-3/b11-standard-approved-reference.png`
- `docs/jandarpan-reader-redesign/screenshots/phase-3/b11-standard-corrected-final.png`
- `docs/jandarpan-reader-redesign/screenshots/phase-3/b11-standard-implementation.png`
- `docs/jandarpan-reader-redesign/screenshots/phase-3/b12-breaking-approved-reference.png`
- `docs/jandarpan-reader-redesign/screenshots/phase-3/b12-breaking-corrected-final.png`
- `docs/jandarpan-reader-redesign/screenshots/phase-3/b12-breaking-implementation.png`
- `docs/jandarpan-reader-redesign/screenshots/phase-3/b13-live-blog-approved-reference.png`
- `docs/jandarpan-reader-redesign/screenshots/phase-3/b13-live-blog-corrected-final.png`
- `docs/jandarpan-reader-redesign/screenshots/phase-3/b13-live-blog-implementation.png`
- `docs/jandarpan-reader-redesign/screenshots/phase-3/b14-photo-approved-reference.png`
- `docs/jandarpan-reader-redesign/screenshots/phase-3/b14-photo-corrected-final.png`
- `docs/jandarpan-reader-redesign/screenshots/phase-3/b14-photo-implementation.png`
- `docs/jandarpan-reader-redesign/screenshots/phase-3/b15-video-approved-reference.png`
- `docs/jandarpan-reader-redesign/screenshots/phase-3/b15-video-corrected-final.png`
- `docs/jandarpan-reader-redesign/screenshots/phase-3/b15-video-implementation.png`
- `docs/jandarpan-reader-redesign/screenshots/phase-3/b16-explainer-approved-reference.png`
- `docs/jandarpan-reader-redesign/screenshots/phase-3/b16-explainer-corrected-final.png`
- `docs/jandarpan-reader-redesign/screenshots/phase-3/b16-explainer-implementation.png`
- `docs/jandarpan-reader-redesign/screenshots/phase-3/b17-editorial-approved-reference.png`
- `docs/jandarpan-reader-redesign/screenshots/phase-3/b17-editorial-corrected-final.png`
- `docs/jandarpan-reader-redesign/screenshots/phase-3/b17-editorial-implementation.png`
- `docs/jandarpan-reader-redesign/screenshots/phase-3/b17-opinion-approved-reference.png`
- `docs/jandarpan-reader-redesign/screenshots/phase-3/b17-opinion-corrected-final.png`
- `docs/jandarpan-reader-redesign/screenshots/phase-3/b17-opinion-implementation.png`
- `docs/jandarpan-reader-redesign/screenshots/phase-3/b18-sponsored-approved-reference.png`
- `docs/jandarpan-reader-redesign/screenshots/phase-3/b18-sponsored-corrected-final.png`
- `docs/jandarpan-reader-redesign/screenshots/phase-3/b18-sponsored-implementation.png`
- `docs/jandarpan-reader-redesign/screenshots/phase-3/b19-premium-approved-reference.png`
- `docs/jandarpan-reader-redesign/screenshots/phase-3/b19-premium-corrected-final.png`
- `docs/jandarpan-reader-redesign/screenshots/phase-3/b19-premium-implementation.png`
- `docs/jandarpan-reader-redesign/screenshots/phase-3/b20-no-image-approved-reference.png`
- `docs/jandarpan-reader-redesign/screenshots/phase-3/b20-no-image-corrected-final.png`
- `docs/jandarpan-reader-redesign/screenshots/phase-3/b20-no-image-implementation.png`

### `docs/jandarpan-reader-redesign/screenshots/phase-4/`

- `docs/jandarpan-reader-redesign/screenshots/phase-4/c21-briefing-approved-reference.png`
- `docs/jandarpan-reader-redesign/screenshots/phase-4/c21-briefing-corrected-final.png`
- `docs/jandarpan-reader-redesign/screenshots/phase-4/c21-briefing-implementation.png`
- `docs/jandarpan-reader-redesign/screenshots/phase-4/c22-mini-player-approved-reference.png`
- `docs/jandarpan-reader-redesign/screenshots/phase-4/c22-mini-player-corrected-final.png`
- `docs/jandarpan-reader-redesign/screenshots/phase-4/c22-mini-player-implementation.png`
- `docs/jandarpan-reader-redesign/screenshots/phase-4/c23-full-player-approved-reference.png`
- `docs/jandarpan-reader-redesign/screenshots/phase-4/c23-full-player-corrected-final.png`
- `docs/jandarpan-reader-redesign/screenshots/phase-4/c23-full-player-implementation.png`
- `docs/jandarpan-reader-redesign/screenshots/phase-4/c24-queue-approved-reference.png`
- `docs/jandarpan-reader-redesign/screenshots/phase-4/c24-queue-corrected-final.png`
- `docs/jandarpan-reader-redesign/screenshots/phase-4/c24-queue-implementation.png`
- `docs/jandarpan-reader-redesign/screenshots/phase-4/c25-downloads-approved-reference.png`
- `docs/jandarpan-reader-redesign/screenshots/phase-4/c25-downloads-corrected-final.png`
- `docs/jandarpan-reader-redesign/screenshots/phase-4/c25-downloads-implementation.png`
- `docs/jandarpan-reader-redesign/screenshots/phase-4/d26-language-approved-reference.png`
- `docs/jandarpan-reader-redesign/screenshots/phase-4/d26-language-corrected-final.png`
- `docs/jandarpan-reader-redesign/screenshots/phase-4/d26-language-implementation.png`
- `docs/jandarpan-reader-redesign/screenshots/phase-4/d29-profile-approved-reference.png`
- `docs/jandarpan-reader-redesign/screenshots/phase-4/d29-profile-corrected-final.png`
- `docs/jandarpan-reader-redesign/screenshots/phase-4/d29-profile-implementation.png`
- `docs/jandarpan-reader-redesign/screenshots/phase-4/d30-saved-approved-reference.png`
- `docs/jandarpan-reader-redesign/screenshots/phase-4/d30-saved-corrected-final.png`
- `docs/jandarpan-reader-redesign/screenshots/phase-4/d30-saved-implementation.png`
- `docs/jandarpan-reader-redesign/screenshots/phase-4/d31-history-approved-reference.png`
- `docs/jandarpan-reader-redesign/screenshots/phase-4/d31-history-corrected-final.png`
- `docs/jandarpan-reader-redesign/screenshots/phase-4/d31-history-implementation.png`
- `docs/jandarpan-reader-redesign/screenshots/phase-4/d32-followed-approved-reference.png`
- `docs/jandarpan-reader-redesign/screenshots/phase-4/d32-followed-corrected-final.png`
- `docs/jandarpan-reader-redesign/screenshots/phase-4/d32-followed-implementation.png`
- `docs/jandarpan-reader-redesign/screenshots/phase-4/d33-notifications-approved-reference.png`
- `docs/jandarpan-reader-redesign/screenshots/phase-4/d33-notifications-corrected-final.png`
- `docs/jandarpan-reader-redesign/screenshots/phase-4/d33-notifications-implementation.png`
- `docs/jandarpan-reader-redesign/screenshots/phase-4/d34-districts-approved-reference.png`
- `docs/jandarpan-reader-redesign/screenshots/phase-4/d34-districts-corrected-final.png`
- `docs/jandarpan-reader-redesign/screenshots/phase-4/d34-districts-implementation.png`
- `docs/jandarpan-reader-redesign/screenshots/phase-4/d35-accessibility-approved-reference.png`
- `docs/jandarpan-reader-redesign/screenshots/phase-4/d35-accessibility-corrected-final.png`
- `docs/jandarpan-reader-redesign/screenshots/phase-4/d35-accessibility-implementation.png`

### `docs/jandarpan-reader-redesign/screenshots/phase-5/`

- `docs/jandarpan-reader-redesign/screenshots/phase-5/a2-district-sponsor-approved-reference.png`
- `docs/jandarpan-reader-redesign/screenshots/phase-5/a2-district-sponsor-corrected-final.png`
- `docs/jandarpan-reader-redesign/screenshots/phase-5/a2-district-sponsor-corrected-final-desktop.png`
- `docs/jandarpan-reader-redesign/screenshots/phase-5/a2-district-sponsor-implementation.png`
- `docs/jandarpan-reader-redesign/screenshots/phase-5/a2-district-sponsor-implementation-desktop.png`
- `docs/jandarpan-reader-redesign/screenshots/phase-5/e36-membership-approved-reference.png`
- `docs/jandarpan-reader-redesign/screenshots/phase-5/e36-membership-corrected-final.png`
- `docs/jandarpan-reader-redesign/screenshots/phase-5/e36-membership-corrected-final-desktop.png`
- `docs/jandarpan-reader-redesign/screenshots/phase-5/e36-membership-implementation.png`
- `docs/jandarpan-reader-redesign/screenshots/phase-5/e36-membership-implementation-desktop.png`
- `docs/jandarpan-reader-redesign/screenshots/phase-5/e37-plans-approved-reference.png`
- `docs/jandarpan-reader-redesign/screenshots/phase-5/e37-plans-corrected-final.png`
- `docs/jandarpan-reader-redesign/screenshots/phase-5/e37-plans-corrected-final-desktop.png`
- `docs/jandarpan-reader-redesign/screenshots/phase-5/e37-plans-implementation.png`
- `docs/jandarpan-reader-redesign/screenshots/phase-5/e37-plans-implementation-desktop.png`
- `docs/jandarpan-reader-redesign/screenshots/phase-5/e38-paywall-approved-reference.png`
- `docs/jandarpan-reader-redesign/screenshots/phase-5/e38-paywall-corrected-final.png`
- `docs/jandarpan-reader-redesign/screenshots/phase-5/e38-paywall-corrected-final-desktop.png`
- `docs/jandarpan-reader-redesign/screenshots/phase-5/e38-paywall-implementation.png`
- `docs/jandarpan-reader-redesign/screenshots/phase-5/e38-paywall-implementation-desktop.png`
- `docs/jandarpan-reader-redesign/screenshots/phase-5/e39-checkout-approved-reference.png`
- `docs/jandarpan-reader-redesign/screenshots/phase-5/e39-checkout-corrected-final.png`
- `docs/jandarpan-reader-redesign/screenshots/phase-5/e39-checkout-corrected-final-desktop.png`
- `docs/jandarpan-reader-redesign/screenshots/phase-5/e39-checkout-implementation.png`
- `docs/jandarpan-reader-redesign/screenshots/phase-5/e39-checkout-implementation-desktop.png`
- `docs/jandarpan-reader-redesign/screenshots/phase-5/e40-success-approved-reference.png`
- `docs/jandarpan-reader-redesign/screenshots/phase-5/e40-success-corrected-final.png`
- `docs/jandarpan-reader-redesign/screenshots/phase-5/e40-success-corrected-final-desktop.png`
- `docs/jandarpan-reader-redesign/screenshots/phase-5/e40-success-implementation.png`
- `docs/jandarpan-reader-redesign/screenshots/phase-5/e40-success-implementation-desktop.png`
- `docs/jandarpan-reader-redesign/screenshots/phase-5/e41-failure-approved-reference.png`
- `docs/jandarpan-reader-redesign/screenshots/phase-5/e41-failure-corrected-final.png`
- `docs/jandarpan-reader-redesign/screenshots/phase-5/e41-failure-corrected-final-desktop.png`
- `docs/jandarpan-reader-redesign/screenshots/phase-5/e41-failure-implementation.png`
- `docs/jandarpan-reader-redesign/screenshots/phase-5/e41-failure-implementation-desktop.png`
- `docs/jandarpan-reader-redesign/screenshots/phase-5/e42-manage-approved-reference.png`
- `docs/jandarpan-reader-redesign/screenshots/phase-5/e42-manage-corrected-final.png`
- `docs/jandarpan-reader-redesign/screenshots/phase-5/e42-manage-corrected-final-desktop.png`
- `docs/jandarpan-reader-redesign/screenshots/phase-5/e42-manage-implementation.png`
- `docs/jandarpan-reader-redesign/screenshots/phase-5/e42-manage-implementation-desktop.png`
- `docs/jandarpan-reader-redesign/screenshots/phase-5/e43-adfree-approved-reference.png`
- `docs/jandarpan-reader-redesign/screenshots/phase-5/e43-adfree-corrected-final.png`
- `docs/jandarpan-reader-redesign/screenshots/phase-5/e43-adfree-corrected-final-desktop.png`
- `docs/jandarpan-reader-redesign/screenshots/phase-5/e43-adfree-implementation.png`
- `docs/jandarpan-reader-redesign/screenshots/phase-5/e43-adfree-implementation-desktop.png`
- `docs/jandarpan-reader-redesign/screenshots/phase-5/e44-native-approved-reference.png`
- `docs/jandarpan-reader-redesign/screenshots/phase-5/e44-native-corrected-final.png`
- `docs/jandarpan-reader-redesign/screenshots/phase-5/e44-native-corrected-final-desktop.png`
- `docs/jandarpan-reader-redesign/screenshots/phase-5/e44-native-implementation.png`
- `docs/jandarpan-reader-redesign/screenshots/phase-5/e44-native-implementation-desktop.png`
- `docs/jandarpan-reader-redesign/screenshots/phase-5/e45-display-ads-approved-reference.png`
- `docs/jandarpan-reader-redesign/screenshots/phase-5/e45-display-ads-corrected-final.png`
- `docs/jandarpan-reader-redesign/screenshots/phase-5/e45-display-ads-corrected-final-desktop.png`
- `docs/jandarpan-reader-redesign/screenshots/phase-5/e45-display-ads-implementation.png`
- `docs/jandarpan-reader-redesign/screenshots/phase-5/e45-display-ads-implementation-desktop.png`

### `docs/jandarpan-reader-redesign/screenshots/phase-6/`

- `docs/jandarpan-reader-redesign/screenshots/phase-6/article-desktop-corrected-final.png`
- `docs/jandarpan-reader-redesign/screenshots/phase-6/article-desktop-implementation.png`
- `docs/jandarpan-reader-redesign/screenshots/phase-6/article-mobile-corrected-final.png`
- `docs/jandarpan-reader-redesign/screenshots/phase-6/article-mobile-implementation.png`
- `docs/jandarpan-reader-redesign/screenshots/phase-6/article-tablet-corrected-final.png`
- `docs/jandarpan-reader-redesign/screenshots/phase-6/article-tablet-implementation.png`
- `docs/jandarpan-reader-redesign/screenshots/phase-6/category-desktop-corrected-final.png`
- `docs/jandarpan-reader-redesign/screenshots/phase-6/category-desktop-implementation.png`
- `docs/jandarpan-reader-redesign/screenshots/phase-6/category-mobile-corrected-final.png`
- `docs/jandarpan-reader-redesign/screenshots/phase-6/category-mobile-implementation.png`
- `docs/jandarpan-reader-redesign/screenshots/phase-6/category-tablet-corrected-final.png`
- `docs/jandarpan-reader-redesign/screenshots/phase-6/category-tablet-implementation.png`
- `docs/jandarpan-reader-redesign/screenshots/phase-6/district-desktop-corrected-final.png`
- `docs/jandarpan-reader-redesign/screenshots/phase-6/district-desktop-implementation.png`
- `docs/jandarpan-reader-redesign/screenshots/phase-6/district-mobile-corrected-final.png`
- `docs/jandarpan-reader-redesign/screenshots/phase-6/district-mobile-implementation.png`
- `docs/jandarpan-reader-redesign/screenshots/phase-6/district-tablet-corrected-final.png`
- `docs/jandarpan-reader-redesign/screenshots/phase-6/district-tablet-implementation.png`
- `docs/jandarpan-reader-redesign/screenshots/phase-6/g-article-desktop-approved-reference.png`
- `docs/jandarpan-reader-redesign/screenshots/phase-6/g-category-desktop-approved-reference.png`
- `docs/jandarpan-reader-redesign/screenshots/phase-6/g-district-desktop-approved-reference.png`
- `docs/jandarpan-reader-redesign/screenshots/phase-6/g-home-desktop-approved-reference.png`
- `docs/jandarpan-reader-redesign/screenshots/phase-6/g-home-tablet-approved-reference.png`
- `docs/jandarpan-reader-redesign/screenshots/phase-6/g-live-desktop-approved-reference.png`
- `docs/jandarpan-reader-redesign/screenshots/phase-6/g-search-desktop-approved-reference.png`
- `docs/jandarpan-reader-redesign/screenshots/phase-6/home-desktop-corrected-final.png`
- `docs/jandarpan-reader-redesign/screenshots/phase-6/home-desktop-implementation.png`
- `docs/jandarpan-reader-redesign/screenshots/phase-6/home-mobile-corrected-final.png`
- `docs/jandarpan-reader-redesign/screenshots/phase-6/home-mobile-implementation.png`
- `docs/jandarpan-reader-redesign/screenshots/phase-6/home-tablet-corrected-final.png`
- `docs/jandarpan-reader-redesign/screenshots/phase-6/home-tablet-implementation.png`
- `docs/jandarpan-reader-redesign/screenshots/phase-6/home-wide-corrected-final.png`
- `docs/jandarpan-reader-redesign/screenshots/phase-6/home-wide-implementation.png`
- `docs/jandarpan-reader-redesign/screenshots/phase-6/live-desktop-corrected-final.png`
- `docs/jandarpan-reader-redesign/screenshots/phase-6/live-desktop-implementation.png`
- `docs/jandarpan-reader-redesign/screenshots/phase-6/live-mobile-corrected-final.png`
- `docs/jandarpan-reader-redesign/screenshots/phase-6/live-mobile-implementation.png`
- `docs/jandarpan-reader-redesign/screenshots/phase-6/live-tablet-corrected-final.png`
- `docs/jandarpan-reader-redesign/screenshots/phase-6/live-tablet-implementation.png`
- `docs/jandarpan-reader-redesign/screenshots/phase-6/search-desktop-corrected-final.png`
- `docs/jandarpan-reader-redesign/screenshots/phase-6/search-desktop-implementation.png`
- `docs/jandarpan-reader-redesign/screenshots/phase-6/search-mobile-corrected-final.png`
- `docs/jandarpan-reader-redesign/screenshots/phase-6/search-mobile-implementation.png`
- `docs/jandarpan-reader-redesign/screenshots/phase-6/search-tablet-corrected-final.png`
- `docs/jandarpan-reader-redesign/screenshots/phase-6/search-tablet-implementation.png`

### `docs/jandarpan-reader-redesign/screenshots/phase-7/`

- `docs/jandarpan-reader-redesign/screenshots/phase-7/f46-loading-approved-reference.png`
- `docs/jandarpan-reader-redesign/screenshots/phase-7/f46-loading-before.png`
- `docs/jandarpan-reader-redesign/screenshots/phase-7/f46-loading-corrected-final.png`
- `docs/jandarpan-reader-redesign/screenshots/phase-7/f46-loading-implementation.png`
- `docs/jandarpan-reader-redesign/screenshots/phase-7/f47-empty-approved-reference.png`
- `docs/jandarpan-reader-redesign/screenshots/phase-7/f47-empty-before.png`
- `docs/jandarpan-reader-redesign/screenshots/phase-7/f47-empty-corrected-final.png`
- `docs/jandarpan-reader-redesign/screenshots/phase-7/f47-empty-implementation.png`
- `docs/jandarpan-reader-redesign/screenshots/phase-7/f48-error-approved-reference.png`
- `docs/jandarpan-reader-redesign/screenshots/phase-7/f48-error-before.png`
- `docs/jandarpan-reader-redesign/screenshots/phase-7/f48-error-corrected-final.png`
- `docs/jandarpan-reader-redesign/screenshots/phase-7/f48-error-implementation.png`
- `docs/jandarpan-reader-redesign/screenshots/phase-7/f49-offline-approved-reference.png`
- `docs/jandarpan-reader-redesign/screenshots/phase-7/f49-offline-before.png`
- `docs/jandarpan-reader-redesign/screenshots/phase-7/f49-offline-corrected-final.png`
- `docs/jandarpan-reader-redesign/screenshots/phase-7/f49-offline-implementation.png`
- `docs/jandarpan-reader-redesign/screenshots/phase-7/f50-slow-approved-reference.png`
- `docs/jandarpan-reader-redesign/screenshots/phase-7/f50-slow-before.png`
- `docs/jandarpan-reader-redesign/screenshots/phase-7/f50-slow-corrected-final.png`
- `docs/jandarpan-reader-redesign/screenshots/phase-7/f50-slow-implementation.png`
- `docs/jandarpan-reader-redesign/screenshots/phase-7/f51-notify-approved-reference.png`
- `docs/jandarpan-reader-redesign/screenshots/phase-7/f51-notify-before.png`
- `docs/jandarpan-reader-redesign/screenshots/phase-7/f51-notify-corrected-final.png`
- `docs/jandarpan-reader-redesign/screenshots/phase-7/f51-notify-implementation.png`
- `docs/jandarpan-reader-redesign/screenshots/phase-7/f52-location-approved-reference.png`
- `docs/jandarpan-reader-redesign/screenshots/phase-7/f52-location-before.png`
- `docs/jandarpan-reader-redesign/screenshots/phase-7/f52-location-corrected-final.png`
- `docs/jandarpan-reader-redesign/screenshots/phase-7/f52-location-implementation.png`
- `docs/jandarpan-reader-redesign/screenshots/phase-7/f53-maintenance-approved-reference.png`
- `docs/jandarpan-reader-redesign/screenshots/phase-7/f53-maintenance-before.png`
- `docs/jandarpan-reader-redesign/screenshots/phase-7/f53-maintenance-corrected-final.png`
- `docs/jandarpan-reader-redesign/screenshots/phase-7/f53-maintenance-implementation.png`
- `docs/jandarpan-reader-redesign/screenshots/phase-7/f54-404-approved-reference.png`
- `docs/jandarpan-reader-redesign/screenshots/phase-7/f54-404-before.png`
- `docs/jandarpan-reader-redesign/screenshots/phase-7/f54-404-corrected-final.png`
- `docs/jandarpan-reader-redesign/screenshots/phase-7/f54-404-implementation.png`
- `docs/jandarpan-reader-redesign/screenshots/phase-7/home-desktop-before.png`
- `docs/jandarpan-reader-redesign/screenshots/phase-7/home-desktop-corrected-final.png`
- `docs/jandarpan-reader-redesign/screenshots/phase-7/home-desktop-implementation.png`
- `docs/jandarpan-reader-redesign/screenshots/phase-7/home-mobile-before.png`
- `docs/jandarpan-reader-redesign/screenshots/phase-7/home-mobile-corrected-final.png`
- `docs/jandarpan-reader-redesign/screenshots/phase-7/home-mobile-implementation.png`
- `docs/jandarpan-reader-redesign/screenshots/phase-7/home-tablet-before.png`
- `docs/jandarpan-reader-redesign/screenshots/phase-7/home-tablet-corrected-final.png`
- `docs/jandarpan-reader-redesign/screenshots/phase-7/home-tablet-implementation.png`
- `docs/jandarpan-reader-redesign/screenshots/phase-7/listen-before.png`
- `docs/jandarpan-reader-redesign/screenshots/phase-7/listen-corrected-final.png`
- `docs/jandarpan-reader-redesign/screenshots/phase-7/listen-implementation.png`
- `docs/jandarpan-reader-redesign/screenshots/phase-7/membership-before.png`
- `docs/jandarpan-reader-redesign/screenshots/phase-7/membership-corrected-final.png`
- `docs/jandarpan-reader-redesign/screenshots/phase-7/membership-implementation.png`

### `docs/jandarpan-reader-redesign/screenshots/visual-correction/`

- `docs/jandarpan-reader-redesign/screenshots/visual-correction/after-impl-390.png`
- `docs/jandarpan-reader-redesign/screenshots/visual-correction/after-impl-430.png`
- `docs/jandarpan-reader-redesign/screenshots/visual-correction/approved-a1-390.png`
- `docs/jandarpan-reader-redesign/screenshots/visual-correction/approved-a1-390-full.png`
- `docs/jandarpan-reader-redesign/screenshots/visual-correction/before-impl-390.png`
- `docs/jandarpan-reader-redesign/screenshots/visual-correction/preview-after-390.png`

