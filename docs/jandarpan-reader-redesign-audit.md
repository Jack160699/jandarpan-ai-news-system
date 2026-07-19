# Jan Darpan — Public Reader Redesign Audit

**Status:** Living document · Phase 1 (foundation)
**Branch:** `feat/jandarpan-reader-design-system`
**Rollback branch:** `rollback/reader-design-20260719` → `33d1cb1`
**Rollout strategy:** Feature-flagged (`NEXT_PUBLIC_READER_DS=1`). Production reader UI is untouched until the flag is enabled. No merge-to-main or production deploy without explicit human sign-off.

---

## 1. Purpose & scope

Recreate the **approved public reader frontend** (navy / deep-red / gold "Ultimate Jan Darpan" design system, 54 mobile screens) as reusable, production-quality Next.js components — **without** redesigning the admin platform or disturbing the existing backend, publishing, SEO, auth, membership, or analytics systems.

Design sources (both represent the same approved output):
- **Primary:** `Jandarpan-Design-System.html.html` (bundled canvas design doc; inner markup decoded to `design-decoded.html`).
- **Fallback:** `zxc.pdf` (text extraction) when an HTML section is hard to inspect.

The design doc is a JS-rendered "canvas" (`design_doc_mode=canvas`) organized into 9 parts: strategy, tokens & component system, IA, navigation map, all 54 mobile screens (groups A–F), reusable component inventory, ad & membership rules, accessibility & low-bandwidth spec, and a Next.js implementation handoff. Base viewport **390×844**, Hindi-first with optional English.

---

## 2. Design tokens (extracted verbatim from the approved design)

### 2.1 Colour — light

| Token | Hex | Role |
|-------|-----|------|
| `--jd-navy` | `#0a2550` | Primary ink / masthead / brand |
| `--jd-navy-deep` | `#081b3a` | Masthead gradient end, district bar |
| `--jd-red` | `#9e1b22` | सिंदूर लाल — section accents, primary buttons, active nav, links |
| `--jd-red-deep` | `#7a1319` | Link hover, pressed |
| `--jd-gold` | `#c19a3e` | Restrained gold — membership, AI-summary rule, masthead underline |
| `--jd-gold-soft` | `#e7d6a4` | Light gold on navy |
| `--jd-paper` | `#f7f4ec` | Newsprint background |
| `--jd-paper-2` | `#f2ede1` | Alt surface / ad placeholder |
| `--jd-ink` | `#16130d` | Headline / body ink |
| `--jd-ink-2` | `#3f3a2e` | Body secondary |
| `--jd-ink-3` | `#6a6250` | Meta |
| `--jd-muted` | `#9a917d` | Captions, timestamps |
| `--jd-line` | `#d9d2c2` | Borders |
| `--jd-line-2` | `#e6e0d2` | Hairline separators |
| `--jd-ok` | `#2f7d52` | Success / positive rate |
| `--jd-amber` | `#c07a1e` | Sponsor / warning accent |

### 2.2 Colour — dark

| Token | Hex |
|-------|-----|
| `--jd-d-bg` | `#0e1626` |
| `--jd-d-surface` | `#16233b` |
| `--jd-d-line` | `rgba(150,175,215,.16)` |
| `--jd-d-text` | `#e7edf6` |
| `--jd-d-muted` | `#93a4c2` |
| dark red | `#e05a63` |
| dark gold | `#e7d6a4` |

### 2.3 Typography

| Role | Size / line-height | Family |
|------|--------------------|--------|
| Masthead wordmark (जनदर्पण) | 26 / 30 | **Tiro Devanagari Hindi** |
| Lead headline | 22 / 29 | **Noto Serif Devanagari** |
| Section heading | 16 / 22 | Noto Serif Devanagari |
| Body | 15 / 25 | Noto Serif Devanagari |
| Secondary / summary | 13 / 20 | **Mukta** |
| Caption / label | 11 / 15 | Mukta |

Families: **Tiro Devanagari Hindi** (masthead/brand), **Noto Serif Devanagari** (headlines & body), **Mukta** (UI, labels, metadata). Noto Serif Devanagari already exists in the repo (`--font-hindi`); Mukta and Tiro are added by the feature.

### 2.4 Spacing, grid, radii, ratios

- **Spacing scale:** `2 · 4 · 8 · 12 · 14 · 18 · 24 · 32` px
- **Grid:** 4pt base · gutter 14px · content padding 14px
- **Radius:** `2px` editorial (buttons/chips), `8px` for token/strategy cards; touch targets ≥ **44px**
- **Image ratios:** `3:2` lead · `16:9` video · `1:1` thumb · `4:5` photo-story
- **Phone frame (design canvas only):** 390×844, radius 30, 6px bezel

### 2.5 Controls

- **Primary button:** red bg, white text, Mukta 800 / 13px, padding 10×18, radius 3
- **Secondary button:** transparent, navy text, 1.5px navy border, radius 3
- **Membership button:** gold bg, navy text, radius 3
- **Text link:** red, underline; hover red-deep
- **Toggle:** green when on
- **Chips:** active = navy bg / white; inactive = transparent / `--jd-line` border; radius 2

### 2.6 Icons

Line icons, 22px, stroke ~1.8, **no emoji as UI icons**. Set:
`home, pin, bolt, headphone, search, user, bell, bookmark, share, play, more, clock, eye, download, wifiOff, globe, filter, fire, mic, rupee, lock, star` (+ `arrowL, chevR, refresh, close, rain` used in screens).

### 2.7 AI transparency label (mandatory)

`✦ संक्षेप में · AI-सहायता, संपादक-सत्यापित` — gold left-rule (3px), used on every AI-generated summary.

---

## 3. Navigation & IA

- **Top:** compact sticky masthead — logo · search · notifications · profile. Search opens as an **overlay** from the masthead (not a nav tab).
- **Bottom nav (5 destinations):** होम (home) · मेरा जिला (pin) · ताज़ा (bolt) · सुनें (headphone) · अधिक (user). Active = red. **Never covers content or ads**; sticky ads sit above it.
- **"अधिक" (More):** profile · saved · history · follow · membership · settings.
- **IA groups:** Discovery · Content types · Audio & account · Features (gold/silver/fuel, weather, mandi rates, polls, cartoon, "today in history") · Monetization · System.

---

## 4. Screen inventory → route mapping (54 screens)

Groups from the design: **A** Discovery · **B** Article/Storytelling · **C** Audio · **D** Account/Personalization · **E** Membership/Monetization · **F** System states.

| # | Screen | Target route (existing) | Notes |
|---|--------|-------------------------|-------|
| 1 | Homepage | `/` (`src/app/page.tsx`) | Flag-gated `ReaderHomepage` |
| 2 | District homepage | `/district/[slug]` | + district bar, sponsor strip, local utility grid |
| 3 | Category page | `/category/[slug]` | sub-filter chips, mid-feed ad |
| 4 | Latest news | *(new)* `/latest` or homepage section | no dedicated route yet — see Risks |
| 5 | Trending | *(new)* `/trending` or homepage section | ranked list; data via feed `trending` |
| 6 | Search overlay | masthead overlay (`src/layouts/SearchOverlay`) | navy header, recent + trending |
| 7 | Search results | `/search` | |
| 8 | Topic page | `/topics/[slug]` | |
| 9 | Live-news page | `/live`, `/live/[slug]` | |
| 10 | District selector | `/district` selector / overlay | |
| 11 | Standard article | `/story/[slug]` | |
| 12 | Breaking article | `/story/[slug]` (variant) | breaking treatment |
| 13 | Live blog | `/live/[slug]` | |
| 14 | Photo story | `/story/[slug]` (variant, 4:5) | |
| 15 | Video story | `/story/[slug]` (variant, 16:9) / `/shorts` | |
| 16 | Explainer | `/story/[slug]` (variant) | |
| 17 | Opinion/editorial | `/story/[slug]` (variant) | |
| 18 | Sponsored article | `/story/[slug]` (variant) + sponsor label | |
| 19 | Premium article | `/premium/[slug]` | paywall gate |
| 20 | Article without image | `/story/[slug]` (variant) | text-first fallback |
| 21 | Top-10 audio briefing | `/listen` | |
| 22 | Mini player | global chrome (`HeadlinesMiniPlayer`) | |
| 23 | Full player | `/listen` (expanded) | |
| 24 | Audio queue & settings | `/listen` | speed, queue |
| 25 | Downloaded/offline audio | `/listen` (offline) | |
| 26 | Language selection | language gate (`LanguageProvider`) | |
| 27 | Onboarding | `src/features/onboarding-v3` | |
| 28 | Sign in / sign up | `/login` | |
| 29 | Reader profile | `/archive` (profile) | |
| 30 | Saved stories | `/archive#saved-stories` | |
| 31 | Reading history | `/archive` (history) | |
| 32 | Followed topics | `/archive` (follows) | |
| 33 | Notification preferences | `/notifications` / settings | |
| 34 | District preferences | settings | |
| 35 | Accessibility & data-saving | settings (`ReaderPreferencesProvider`) | |
| 36 | Membership landing | `/membership` | |
| 37 | Plan comparison | `/membership` | |
| 38 | Premium-content gate | `/premium/[slug]` | |
| 39 | Checkout | `/membership` checkout (`api/membership/founding`) | |
| 40 | Payment success | checkout result | |
| 41 | Payment failure | checkout result | |
| 42 | Manage subscription | `/archive` / account | |
| 43 | Ad-free member state | monetization flag | |
| 44 | Native sponsored placement | `AdSlot` native variant | |
| 45 | Display ads (close+report) | `AdSlot` | |
| 46 | Loading | `loading.tsx` + skeletons | |
| 47 | Empty | `EmptyState` | |
| 48 | General error | `error.tsx` | |
| 49 | Offline | offline state | |
| 50 | Slow connection | data-saving degrade | |
| 51 | Notification permission | permission prompt | |
| 52 | Location permission | permission prompt | |
| 53 | Maintenance mode | maintenance page | |
| 54 | 404 | `not-found.tsx` | |

---

## 5. Component mapping (approved → build target)

New shared components live in `src/features/reader-ds/components/` (flag-gated), designed to later graduate into the JDS (`src/design-system`).

| Approved component | Build target | Existing analogue to reconcile |
|--------------------|--------------|-------------------------------|
| Masthead (compact sticky) | `Masthead.tsx` | `src/layouts/TopBar/TopBar.tsx` |
| Utility row (district·date·weather) | `UtilityRow.tsx` | — (new) |
| Breaking strip | `BreakingStrip.tsx` | `breakingTicker` data exists |
| Lead story | `LeadStory.tsx` | `HeroCard`, homepage v3 LeadStory |
| Secondary story row | `SecondaryStory.tsx` | `StoryCard`, `CompactCard` |
| Section header | `SectionHeader.tsx` | homepage section heads |
| AI summary | `AiSummary.tsx` | trust components |
| Action row (listen/share/save) | `ActionRow.tsx` | story toolbar |
| Tag / kicker | `Tag.tsx` | `badge.tsx` |
| Utility tiles (rates) | `UtilTiles.tsx` | — (new) |
| Ad container | `Ad.tsx` | `src/components/monetization/AdSlot.tsx` |
| Sponsored label | in `Ad`/`Tag` | native ad components |
| Membership card / paywall | `MembershipCard.tsx` | `MembershipPlansPage`, `premium/[slug]` |
| Bottom nav (5) | `BottomNav.tsx` | `src/layouts/BottomNavigation` |
| Chip row | `ChipRow.tsx` | `CategoryNavbar` |
| Article image + fallback | `ArticleImage.tsx` | next/image usage |
| Icons (line set) | `icons.tsx` | `lucide-react` (map to approved set) |
| Skeleton/empty/error/offline | reuse | `Skeleton`, `EmptyState`, `error.tsx` |

---

## 6. Data-source mapping (real data, no mocks in prod routes)

| Surface | Data function | File |
|---------|---------------|------|
| Homepage feed | `getCachedGeneratedHomepageFeed()` → `GeneratedHomepageFeed` | `src/lib/homepage/cached-feed.ts` |
| Lead + secondary | `feed.editorsPicks.{lead,supporting}` | `src/lib/homepage/types.ts` |
| Breaking strip | `feed.breakingTicker` / `feed.localBreakingAlerts` | same |
| Section feeds | `feed.categoryStreams[]`, `feed.regionalHighlights` | same |
| Trending | `feed.trending` | same |
| Audio queue | `feed.listenArticleIds`, `/listen` | `src/app/listen/page.tsx` |
| District feed | `filterRowsForDistrict` | `src/lib/regional/hyperlocal-feed.ts` |
| Category hub | `getCategoryHub` | `src/lib/category/get-category-hub.ts` |
| Article by slug | `getStoryArticleBySlug` | `src/lib/story/get-story-data.ts` |
| Search | `executeSearch` | `src/lib/search/search.ts` |
| Membership | `fetch-payload` | `src/lib/monetization/fetch-payload.ts` |
| i18n | `getDictionary`, `LanguageProvider` | `src/lib/i18n/*` |

Empty sections must degrade gracefully (render nothing or an empty state), never crash.

---

## 7. Preserved backend / production systems (must remain intact)

Next.js App Router · TypeScript · Supabase (`news_articles`, `generated_articles`) · auth + RBAC · Hindi/English · district & category routes · article routes · publishing & ingestion pipelines · SEO (metadata, canonical, JSON-LD, sitemaps) · audio · advertisements · membership · analytics · admin & editorial workflows · Vercel config · ISR/caching · Sentry.

**Guardrails:** no admin redesign; no Git history reset; no destructive Supabase migrations; no production data deletion; no secrets exposure; no mock data in production routes; feature-flagged rollout only.

---

## 8. Risks & mitigations

| Risk | Mitigation |
|------|------------|
| Two visual identities (existing paper/red/ink vs approved navy/red/gold) | Scope tokens to `.jd-ds` wrapper; flag-gate; no global override |
| No dedicated `/latest`, `/trending`, `/district` selector routes | Phase 2: add routes or homepage sections; documented, non-breaking |
| Font payload (Mukta + Tiro added) | `display: swap`, subset devanagari+latin, lazy weights, system fallback |
| Large existing V3 surfaces already flagged | Reconcile with `NEXT_PUBLIC_HOME_V3` etc.; avoid double-mounting |
| Live production news site | preview-only rollout; rollback branch prepared |
| 54 screens is multi-phase | phased delivery; homepage first, verified before expanding |

---

## 9. Implementation phases

1. **Phase 1 (this session):** audit doc · design tokens (scoped CSS + fonts) · core shared components · faithful homepage behind flag · build + screenshot verification.
2. **Phase 2:** district, category, latest, trending, search results, topic, live, district selector (group A).
3. **Phase 3:** article variants (group B) on `/story/[slug]` + `/premium`.
4. **Phase 4:** audio (group C) + account/personalization (group D).
5. **Phase 5:** membership/monetization (group E).
6. **Phase 6:** system states (group F) + responsive refinement (360–1440) + a11y.
7. **Phase 7:** full test suite, preview deploy, smoke tests, final report. (Merge-to-main + production deploy gated on human sign-off.)

---

---

## 10. Phase 1 verification (evidence)

| Check | Command | Result |
|-------|---------|--------|
| Typecheck | `npm run typecheck` (`tsc --noEmit`) | ✅ pass, 0 errors |
| Lint | `npx eslint src/features/reader-ds src/app/page.tsx src/components/navigation/AppChrome.tsx` | ✅ pass, 0 errors |
| Production build (flag OFF) | `npm run build` | ✅ success — existing reader UI + all routes intact |
| Production build (flag ON) | `NEXT_PUBLIC_READER_DS=1 npm run build` | ✅ success — reader-DS homepage compiles |
| Dev render (flag ON) | `NEXT_PUBLIC_READER_DS=1 npm run dev` | ✅ homepage renders live `GeneratedHomepageFeed` |

**Rendered structure confirmed (accessibility tree + screenshots):** compact navy masthead (Tiro wordmark + gold rule) · district/edition/date/weather utility row · conditional breaking strip · lead story with AI-transparency summary + listen/share/save · secondary story rows · "आज की 10 बड़ी खबरें" audio CTA · 5-item bottom navigation (होम/मेरा जिला/ताज़ा/सुनें/अधिक).

**Screenshots:** `docs/jandarpan-reader-redesign/screenshots/mobile-homepage-masthead.png`, `docs/jandarpan-reader-redesign/screenshots/homepage-full-width.png`.

**Data behaviour:** remote images load through `optimizeCdnUrl` (auto webp/avif); missing/broken images fall back gracefully. Local dev seed only populates `editorsPicks`, so category/trending/regional sections collapse to nothing (correct graceful degradation) — production feed pools are rich.

**Known items for later phases:**
- Desktop (≥1024px) currently renders the mobile column full-bleed; the premium editorial desktop grid is Phase 6.
- Listen/share/save actions are wired as buttons with `data-action` hooks; behaviour integration is a later phase.
- Utility-row rates/weather use static placeholders pending a real data source.

*Subsequent phases append verification evidence (build output, screenshots, test results) to this document and the final report.*
