# Jan Darpan Brand Implementation

**Branch:** `feat/jan-darpan-brand-implementation`
**Baseline:** `f4792e82c3de0cdd37cb29e61f4c98d39b66e99e` (main)
**Rollback branch:** `backup/pre-jan-darpan-brand-implementation`
**Source of truth:** approved handoff `Jan Darpan Logo Animation 14.zip`
("Jan Darpan Logo Motion Production Handoff").

> Implemented in an isolated git worktree (`.claude/worktrees/jan-darpan-brand`)
> because a concurrent agent works in the main checkout. **Not deployed.**

---

## 1. Approved master identity

| Element | Value |
| --- | --- |
| Primary name (Devanagari) | जन दर्पण |
| Secondary name (Latin) | JAN DARPAN |
| Master tagline | हर जिले की अपनी आवाज़ |
| Mark | Sunrise/mirror — gold ring, red rising sun, gold horizon line, soft reflection |
| Colours | Red `#C8102E` · Navy `#0B1E3B` · Gold `#C9A24B` · White `#FBF8F2` · Canvas-dark `#081426` |
| Type | Devanagari: Tiro Devanagari Hindi · Latin: Marcellus |

The mark is pure vector geometry (renders identically everywhere). The wordmark
lockups use the approved Devanagari + Latin typography.

## 2. Final asset directory

```
public/brand/jan-darpan/
  logo/
    horizontal-{light,dark}.svg      # primary banner lockup (vB 390×80)
    stacked-{light,dark}.svg         # vertical lockup (vB 280×200)
    compact-{light,dark}.svg         # condensed / sticky header (vB 230×48)
    district-{light,dark}.svg        # district lockup (vB 280×210)
    breaking.svg  live.svg           # breaking / live states
    raster/
      horizontal-{light,dark}.png    # rasterised @3x — next/image-safe banner
      stacked-{light,dark}.png  compact-light.png  district-light.png
  mark/
    mark.svg  mark-mono-{black,navy,white}.svg
    raster/ mark-{256,512,1024}.png  mark-{256,512}.webp
  icons/
    favicon.svg app-icon.svg apple-icon.svg browser-tab.svg pwa-icon.svg
    adaptive-{background,foreground}.svg
    raster/ app-icon-{96,192,256,512,1024}.png  app-icon-{192,512}.webp
  motion/
    mark-animated.svg (SMIL)  flagship-static-frame.svg
  social/
    og-default.png  (1200×630)   og-square.png (1200×1200)
```

Next.js icon file-conventions (replaced with approved marks):
`src/app/favicon.ico` · `src/app/icon.svg` · `src/app/icon.png` · `src/app/apple-icon.png`
Plus `public/favicon.png` and `public/site.webmanifest`.

### Why the wordmark is rastered

The approved wordmark SVGs render "जन दर्पण" as live SVG `<text>` with external
font classes. As an `<img>`/`next/image` source those fonts do **not** apply, so
Devanagari would fall back to a system face. `next/image` also rejects `.svg`
sources here (`dangerouslyAllowSVG` is not enabled). Both problems are solved by
rasterising the lockups once, in headless Chromium, with **Tiro Devanagari Hindi +
Marcellus loaded** — producing pixel-faithful, next/image-safe PNGs with no runtime
font dependency. The scalable SVGs are retained for inline/scalable use. The pure
mark and icons ship as both SVG and PNG.

## 3. Brand system integration (no parallel system)

The repo already has a clean, centralised, tenant-driven brand architecture. We
integrated into it rather than adding a parallel design system:

- `src/lib/brand/assets.ts` — **canonical asset registry** (`JAN_DARPAN_BRAND_ASSETS`).
  All logo/mark/OG paths repointed here; everything downstream inherits.
- `src/lib/tenant/presets/jan-darpan-chhattisgarh.ts` — `branding.*` reference the
  registry keys, so no edit was needed; it now resolves to the approved assets.
- `src/components/tenant/TenantLogo.tsx` — unchanged; renders the new banner/mark.
- `src/lib/brand/tokens.ts` — **new**: approved colours, typography, tagline, motion
  and clear-space rules as TS constants (used by generation + brand rendering).

### Placement matrix (how each surface resolves)

| Surface | Renders | Source |
| --- | --- | --- |
| Desktop/mobile masthead, super-menu, language gate | `TenantLogo` (mark + wordmark) | registry `logo`/`mark` |
| Sticky top bar | `TenantLogo variant="banner"` | registry `logo` (horizontal raster) |
| Reader-DS masthead | live HTML wordmark (Tiro) + mark | reader-ds (already approved typography) |
| Route loading | horizontal lockup | registry `logo` |
| Admin login / forgot / reset | approved mark + lockup | registry `logo` + mark raster |
| Admin dashboard shell | mark + lockup | registry `mark`/`logo` |
| Favicon / browser icon | approved favicon | `src/app/favicon.ico` + `icon.svg` + `icon.png` |
| Apple touch icon | approved app icon (navy) | `src/app/apple-icon.png` |
| PWA manifest (192/512 + maskable) | approved app icons | `public/site.webmanifest` |
| Open Graph / Twitter | approved 1200×630 card | registry `og` → `og-default.png` |
| JSON-LD publisher logo | approved mark | `PUBLISHER_LOGO_URL` = SITE_URL + registry `mark` |
| Article share fallback image | approved OG card | `editorial-images.ts` |

## 4. Old assets removed + database-backed identity handling

**Old assets removed (8 — confirmed dead, no code/DB/content reference):**
```
public/brand/jan-darpan-chhattisgarh-logo.svg   public/brand/jan-darpan-mark.svg
public/brand/jan-darpan-chhattisgarh-og.svg     public/brand/cg-bhaskar-logo.svg
public/brand/hamar-chhattisgarh-og.svg          public/brand/cg-bhaskar-mark.svg
public/brand/hamar-chhattisgarh-logo.svg        public/brand/hamar-chhattisgarh-mark.svg
```
The `cg-bhaskar-*` / `hamar-chhattisgarh-*` files are old Jan Darpan **alias**
identities — their presets `...spread` the Jan Darpan preset and never referenced
these SVGs, and no DB tenant row exists for those slugs, so they were dead.

**Compatibility aliases — 3 old `.png` paths retained, now serving APPROVED content:**
```
public/brand/jan-darpan-chhattisgarh-logo.png  ← approved horizontal lockup
public/brand/jan-darpan-mark.png               ← approved mark
public/brand/jan-darpan-chhattisgarh-og.png    ← approved OG card
```
**Why:** the live identity is **database-backed**. `newsroom_tenants.config.branding`
(logoUrl / logoMarkUrl / faviconUrl / ogImageUrl), `platform_config[organization_settings].logoUrl`,
and stored article `og_image` fields all point at these `.png` paths (Supabase
project `giiuqshoconjbpiueasp`, shared by preview + production). Because the DB is
shared, repointing it to the canonical `/brand/jan-darpan/**` paths *before* the
new assets are live would 404 the current production masthead/OG. The zero-downtime
fix is to keep these 3 paths resolving to the **approved** images. The old visual
identity is fully gone; only the path strings remain, serving approved assets.

**Exact DB references covered by the aliases (Supabase `giiuqshoconjbpiueasp`):**
- `newsroom_tenants` — 1 row (`jan-darpan-chhattisgarh`): `config.branding.{logoUrl,logoMarkUrl,faviconUrl,ogImageUrl}`
- `platform_config` — 1 row (`organization_settings`): `config_value.logoUrl`
- `generated_articles` — 38 of 902 rows: `hero_image_url` = old OG path

**Deferred safe follow-up (post-deploy, optional):** repoint those DB rows to the
canonical `/brand/jan-darpan/**` paths (snapshot the tenant `config` jsonb + org
`config_value` first), then remove the 3 alias files in a follow-up deploy. Doing
this before the canonical assets are live would 404 production (shared DB).

## 5. Preserved third-party / tenant assets (NOT touched)

- `public/brand/pioneer-post-logo.svg`, `public/brand/pioneer-post-mark.svg` —
  the **example white-label demo tenant** (`src/lib/tenant/presets/pioneer-post.ts`),
  which demonstrates multi-tenant SaaS theming. It intentionally keeps its own
  identity so Jan Darpan branding does not leak into the white-label demo.
- All advertiser / IPL team / provider / social-network icons and user/article
  imagery — untouched.

## 6. Tenant / fallback behavior

Jan Darpan is the canonical default. Per-tenant favicon overrides via
`metadata.icons` were removed in favour of the Next.js file convention, so the
whole app has one consistent, correctly-backgrounded icon set. Trade-off: the
`pioneer-post` demo now shares the Jan Darpan browser favicon (its in-page logo is
still its own). This is acceptable for a demo tenant and documented here.

## 7. Brand tokens & typography

Approved values are centralised in `src/lib/brand/tokens.ts`. The live in-product
palette (`src/features/reader-ds/styles/tokens.css`) uses slightly softened shades
of the same hues and was **left unchanged** — overwriting it would restyle the
entire just-shipped reader UI. The logo assets embed the exact approved colours, so
the identity is exact regardless. Fonts use the existing `next/font` strategy
(`src/lib/fonts/reader-fonts.ts`); no external fonts are hotlinked at runtime.

## 8. Motion & accessibility

- Static-first: every surface uses a static approved asset; the animated mark
  (`motion/mark-animated.svg`, SMIL) and `flagship-static-frame.svg` are available
  but not wired into standard headers (no infinite header animation, no layout
  shift, no blocking JS, no Claude-Design runtime).
- Reduced motion respected by the reader-ds system already in place.

## 9. Metadata & platform assets

favicon.ico (multi-size), icon.svg + icon.png, apple-icon.png, PWA manifest
(192/512 + maskable, theme `#C8102E`, background `#FBF8F2`), Open Graph +
Twitter `summary_large_image` (1200×630 approved card), JSON-LD publisher logo,
and the article share-fallback image all now resolve to approved assets using the
real production domain (`SITE_URL`, `www.jandarpan.news`). No localhost, no broken
URLs.

## 10. Validation

- **Typecheck:** changed files clean — 0 new errors. 26 pre-existing errors remain
  in test files + `sharp`-dependent modules (unrelated; `sharp` installs on Vercel).
- **Lint:** 6 changed source files — clean (exit 0).
- **Asset existence:** all 15 registry/metadata paths present and valid images
  (PNG/ICO magic bytes verified).
- **Manifest:** valid JSON, all 3 icons resolve.
- **Reference sweep:** 0 references to any old Jan Darpan logo path.
- **Production build:** see the final report / repo build logs (this sandbox lacks
  the native `sharp` module used by unrelated image routes).

## 11. Rejected handoff files (not copied to production)

`*.dc.html` (Claude-Design source), `support.js` (Claude runtime),
`CURSOR_IMPLEMENTATION_PROMPT.md`, the `remotion/` video pipeline and `lottie/`
docs, and the raw social marketing SVGs (kept as source only; not wired to runtime).

## 12. Known limitations / deferred

- Full Playwright visual verification across all 12 breakpoints not run in this
  sandbox (dev server + full build blocked by the pre-existing `sharp`/type issues).
- Email-template hosted-PNG logo, motion splash wiring into live routes, and the
  remotion broadcast video are out of scope for this pass.
- **Decision flagged for the owner:** the master tagline `हर जिले की अपनी आवाज़`
  is used on the OG card and available in `tokens.ts`, but the tenant's existing
  SEO taglines (indexed) were left in place. Swapping them app-wide is a
  content/SEO decision, not a logo change.

## 13. Rollback

```
git checkout main
git reset --hard backup/pre-jan-darpan-brand-implementation   # if merged locally
# or simply do not merge feat/jan-darpan-brand-implementation
git worktree remove .claude/worktrees/jan-darpan-brand
```
