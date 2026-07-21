# Phase 3 visual audit — Editorial storytelling (B11–B20)

**Branch:** `feat/jandarpan-reader-design-system`  
**Flag:** `NEXT_PUBLIC_READER_DS=1`  
**Viewport:** 390×844  
**Design source:** Plot Design `groupB()` atoms B11–B20  
**Approved static HTML:** `public/design-refs/phase-3/approved-phase-3-screens.html`  
**Screenshot dir:** `docs/jandarpan-reader-redesign/screenshots/phase-3/`  
**Template system:** `src/features/reader-ds/article/` (`ReaderArticlePage` + shared atoms)

## Architecture

| Concern | Implementation |
|---------|----------------|
| Reusable templates | One `ReaderArticlePage` + variant resolver; live blog also on `/live/[slug]` via `ReaderLiveBlogPage`; premium reports on `/premium/[slug]` via `ReaderPremiumReportPage` |
| Variant selection | `resolveArticleVariant()` priority: live-blog → premium → sponsored → breaking → video → photo → explainer → opinion → editorial → no-image → standard |
| QA override | `?dsVariant=` on `/story/[slug]` (flag-gated, presentation only — content stays real) |
| SEO / SSR | Existing `generateMetadata`, canonical redirects, `LiveStoryJsonLd` / `LiveBlogPosting` retained |
| Real data | Generated/fallback articles, takeaways, related stories, sponsored meta when present — no invented viewer counts or cricket scores |

## Screen-by-screen

| Screen | Design ref | Route | Screenshots | Major differences found | Fixes made | Remaining mismatch | Functional verification |
|--------|------------|-------|-------------|-------------------------|------------|--------------------|-------------------------|
| B11 Standard | groupB B11 | `/story/{slug}` or `?dsVariant=standard` | `b11-standard-{approved-reference,implementation,corrected-final}.png` | Missing lead plane when `image_url` null; English “Editorial Desk” | Always render `ArticleImage` (tinted editorial fallback); Hindi author normalize | Fallback body is shorter than mockup sample copy (real data) | Pass — AI summary, audio, share bar, related |
| B12 Breaking | groupB B12 | `?dsVariant=breaking` or meta `is_breaking` | `b12-breaking-*` | No मुख्य बिंदु; share bar vs bottom nav; missing lead | `KeyPoints` from takeaways/paragraph splits; bottom nav latest; court-tone image | Update label uses real `updatedAtLabel` (“अभी”) not mock “2 मिनट” | Pass — red banner + key points |
| B13 Live blog | groupB B13 | `/live/{slug}` or `?dsVariant=live-blog` | `b13-live-blog-*` | Pin strip cricket scores are mock-only | Pin metrics = real `source_count` / category / status only; story paragraphs → timeline when no live event | No fake match scoreboard | Pass — LIVE header + reverse-chrono timeline |
| B14 Photo | groupB B14 | `?dsVariant=photo` | `b14-photo-*` | Captions derived from body when gallery meta absent | Dark immersive `PhotoGallery` 4:5 + dots | Multi-frame gallery reuses hero when no gallery assets | Pass — swipe / counter |
| B15 Video | groupB B15 | `?dsVariant=video` | `b15-video-*` | Duration from read-time when no media meta | 16:9 player chrome + AI summary + related “आगे देखें” | Scrub progress decorative until real playback wired | Pass — player + related |
| B16 Explainer | groupB B16 | `?dsVariant=explainer` | `b16-explainer-*` | Generic “मुख्य बिंदु N” when takeaways aren’t Q&A | Numbered Q&A from takeaways/paras; progress bar; navy badge | Stats box only when real `stats` present (none invented) | Pass — numbered structure |
| B17 Opinion | groupB B17 | `?dsVariant=opinion` | `b17-opinion-*` | Pull-quote from why-this-matters / 2nd para | Drop-cap + gold pull-quote + opinion badge | Author card uses real attribution | Pass |
| B17 Editorial | groupB B17 | `?dsVariant=editorial` | `b17-editorial-*` | Same shell as opinion with editorial badge copy | `OpinionBadge editorial` | Same as opinion | Pass |
| B18 Sponsored | groupB B18 | `?dsVariant=sponsored` or sponsored meta | `b18-sponsored-*` | Tint + CTA without inventing sponsor brand | Sponsored banner + `#faf6ec` body + field image + CTA | Sponsor name only when `SponsoredStoryMeta` exists | Pass — disclosure chrome |
| B19 Premium | groupB B19 | `?dsVariant=premium` or `/premium/{slug}` | `b19-premium-*` | Mock GST chart invents numbers | Premium ribbon + analysis box from real takeaways (no fake chart values) | Chart bars omitted when no real series | Pass — ad-free ribbon |
| B20 No-image | groupB B20 | `?dsVariant=no-image` or missing image | `b20-no-image-*` | Extra AI/byline vs sparse mock | Dashed placeholder + load CTA; skip AI/byline/audio | Bottom-nav active tab may be latest vs district | Pass — body remains readable |

## Shared fixes

1. **Story data without Supabase:** `getGeneratedArticleBySlug` resolves static Hindi fallback pool so `/story/*` DS templates work locally and on Preview when DB is empty.
2. **AppChrome:** `/story/` and `/premium/` added to `READER_DS_PREFIXES` so legacy chrome does not wrap DS articles.
3. **Token CSS:** Reuses Phase 2 `reader-ds/styles` side-effect import via `ReaderShell`.
4. **Long Hindi headlines:** `overflowWrap: anywhere` on all article H1s.

## Functional checklist

| Check | Result |
|-------|--------|
| SSR article HTML | Pass |
| Metadata / canonical redirect | Pass (existing story helpers) |
| JSON-LD (`LiveStoryJsonLd` / LiveBlogPosting) | Pass |
| Real backend / fallback content | Pass |
| Long Hindi headline wrap | Pass |
| Audio / save / share chrome | Pass (standard share bar; actions data-* hooks) |
| Related stories | Pass when pool available |
| AI summary | Pass when summary present |
| Variant templates reusable (no duplicate page trees) | Pass |

## Limitations (genuine)

- Photo galleries without multi-asset metadata reuse the hero / tinted plane with caption frames from body copy.
- Video player is editorial chrome over still/hero until real playback assets exist.
- Premium analysis chart from the mockup is not rendered with invented GST series; takeaways drive the analysis box instead.
- Live pin strip never fabricates sports scores — only real event fields.
- `?dsVariant=` is a Preview/QA presentation override, not a production CMS field.
