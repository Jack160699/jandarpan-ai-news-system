# Phase 2 visual audit — Discovery screens (A2–A10)

**Branch:** `feat/jandarpan-reader-design-system`  
**Flag:** `NEXT_PUBLIC_READER_DS=1`  
**Viewport:** 390×844  
**Design source:** `Jandarpan-Design-System` groupA() atoms A2–A10  
**Approved static HTML:** `public/design-refs/phase-2/approved-phase-2-screens.html`  
**Screenshot dir:** `docs/jandarpan-reader-redesign/screenshots/phase-2/`

## Screen-by-screen

| Screen | Design ref | Route | Viewport | Screenshots | Major differences found | Fixes made | Remaining mismatch | Functional verification |
|--------|------------|-------|----------|-------------|-------------------------|------------|--------------------|-------------------------|
| A10 District selector | groupA A10 | `/district?select=1` | 390×844 | `a10-district-selector-{approved-reference,implementation,corrected-final}.png` | Initial capture lacked token CSS (transparent masthead); list uses full CG registry vs design’s short sample | Side-effect import of `tokens.css` via `reader-ds/styles.ts`; selector writes `cgb-home-district` cookie and navigates to `/district/{slug}` | Full district registry is denser than mockup sample (acceptable — real data) | Pass — select district updates preference + opens district home |
| A2 District homepage | groupA A2 | `/district/raipur` | 390×844 | `a2-district-home-*` | Needed district context bar + utility tile grid vs legacy StoryCards | `DistrictHomepage` + `DistrictContextBar`; real ranked district pool | Sponsor strip omitted when no real sponsor (no fake ad copy); utility tile subtitles are generic status labels not live mandi/power APIs | Pass — district context + articles from `filterRowsForDistrict` |
| A3 Category | groupA A3 | `/category/politics` | 390×844 | `a3-category-*` | Lead composition vs editorial StoryCard grid | `CategoryPageView` with chip row + lead + secondary list + mid-feed ad slot | Sub-filter chips are cross-hub shortcuts, not CMS-driven facets | Pass — category hub articles via `getCachedCategoryHubData` |
| A4 Latest | groupA A4 | `/latest` | 390×844 | `a4-latest-*` | Empty feed when pool-only; chrono layout required | Prefer homepage feed slices; `ChronoStory` + `LatestRefreshBar` | Auto-refresh toggle is UI state only (manual refresh via control); AM/PM from article timestamps | Pass — reverse-chron from real feed/pool |
| A5 Trending | groupA A5 | `/trending` | 390×844 | `a5-trending-*` | Rank numerals + growth labels vs generic list | `TrendingRankRow` using `feed.trending` + SEO keyword chips | Growth uses `▲ ट्रेंडिंग` for ranked trending items — not invented % lifts | Pass — ranking from cached homepage trending |
| A6 Search overlay | groupA A6 | `/search` | 390×844 | `a6-search-overlay-*` | Preference-driven overlay failed to stay open on landing | `forceOpen` + `onDismiss` on `SearchOverlay`; landing embeds overlay | Recent searches local-only; trending chips from `/api/search` when available | Pass — Hindi/English input; Esc/back → home |
| A7 Search results | groupA A7 | `/search?q=विधानसभा` | 390×844 | `a7-search-results-*` | Needed result count + secondary rows | `SearchResultsPageView` over `executeSearch` hits; optional topic suggestion | Filter control is visual (not full filter sheet); audio row omitted without real audio hit | Pass — results link to `/story/{slug}` |
| A8 Topic | groupA A8 | `/topics/chhattisgarh-assembly` | 390×844 | `a8-topic-*` | Platform hub → DS hero + list | `TopicPageView` over `fetchTopicFeed` | Follow/bell are non-persistent UI (no fake follower counts) | Pass — topic articles load when slug exists |
| A9 Live | groupA A9 | `/live` | 390×844 | `a9-live-*` | Dark canvas + timeline vs legacy live desk | `LiveNewsPageView`; inactive copy when no live/breaking | No fake viewer counts — LIVE badge only when feed has breaking/liveWire | Pass — active/inactive from real feed signals |

## Shared fixes

1. **Token loading:** `.jd-ds` custom properties were missing from the client bundle despite `globals.css` import. Added `src/features/reader-ds/styles.ts` side-effect import used by `ReaderShell` + `ReaderHomepage`.
2. **AppChrome:** Prefix matching for `/district/*`, `/category/*`, `/topics/*`, `/live/*` plus exact hubs so legacy chrome does not wrap DS pages.
3. **Search:** Masthead opens overlay; `/search` landing is A6; `?q=` is A7.

## Functional checklist

| Check | Result |
|-------|--------|
| District selection changes selected district | Pass |
| District pages show district context | Pass |
| Categories load correct articles | Pass |
| Latest / trending use feed ranking sources | Pass |
| Search accepts Hindi + English | Pass |
| Search results → real article routes | Pass |
| Topic pages load relevant content | Pass |
| Live active/inactive | Pass |
| Back navigation | Pass |
| Bottom nav does not cover content | Pass (shell spacer) |
| Empty / missing-image states | Pass (graceful copy + ArticleImage hatch) |
| SEO / locale / SSR intact | Pass (existing generateMetadata + JsonLd retained) |

## Limitations (genuine)

- Utility tiles on district home are structural labels, not live mandi/power APIs.
- Follow / auto-refresh / filter controls are interaction chrome without backend persistence where none exists.
- Trending growth is a boolean trending marker, not fabricated percentages.
- Topic follow counts from the mockup are not invented when the platform feed lacks them.
