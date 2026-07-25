/**
 * Canonical Jan Darpan brand asset paths.
 *
 * Source of truth: approved brand handoff ("Jan Darpan Logo Motion Production
 * Handoff"). Assets live under public/brand/jan-darpan/. Wordmark lockups are
 * rasterised (Tiro Devanagari Hindi + Marcellus) so they are next/image-safe and
 * render the approved Devanagari typography reliably without a runtime font
 * dependency. Keep in sync with:
 *   - src/lib/tenant/presets/jan-darpan-chhattisgarh.ts (tenant branding)
 *   - public/site.webmanifest (PWA icons)
 *   - src/app/{favicon.ico,icon.svg,icon.png,apple-icon.png} (Next icon convention)
 */
const ROOT = "/brand/jan-darpan";

export const JAN_DARPAN_BRAND_ASSETS = {
  /** Horizontal wordmark lockup (banner) — rasterised approved artwork, light bg. */
  logo: `${ROOT}/logo/raster/horizontal-light.png`,
  /** Horizontal wordmark lockup for dark surfaces. */
  logoDark: `${ROOT}/logo/raster/horizontal-dark.png`,
  /**
   * Compact lockup for sticky/condensed phone masthead on navy.
   * Approved surface: public/brand/jan-darpan/asset-manifest.json → compact-dark.
   * Do not substitute favicon / app-icon assets for masthead.
   */
  logoCompactDark: `${ROOT}/logo/compact-dark.svg`,
  /** Compact lockup for light sticky headers. */
  logoCompactLight: `${ROOT}/logo/compact-light.svg`,
  /** Raster compact (light) — next/image-safe Devanagari. */
  logoCompactLightRaster: `${ROOT}/logo/raster/compact-light.png`,
  /** Square sunrise/mirror mark (transparent) — raster for next/image. */
  mark: `${ROOT}/mark/raster/mark-512.png`,
  /** App icon (navy rounded square) — raster. */
  appIcon: `${ROOT}/icons/raster/app-icon-512.png`,
  /** Open Graph / social share card 1200×630. */
  og: `${ROOT}/social/og-default.png`,
  /** Square social/profile card 1200×1200. */
  ogSquare: `${ROOT}/social/og-square.png`,

  /** Scalable vector sources (inline / non-next/image use). */
  logoSvg: `${ROOT}/logo/horizontal-light.svg`,
  logoDarkSvg: `${ROOT}/logo/horizontal-dark.svg`,
  markSvg: `${ROOT}/mark/mark.svg`,
  faviconSvg: `${ROOT}/icons/favicon.svg`,

  paperTexture: "/backgrounds/newspaper-light-texture.png",
} as const;

/** Paths that must never be used as the reader masthead wordmark. */
export const JAN_DARPAN_MASTHEAD_FORBIDDEN_ASSETS = [
  `${ROOT}/icons/favicon.svg`,
  `${ROOT}/icons/app-icon.svg`,
  `${ROOT}/icons/apple-icon.svg`,
  `${ROOT}/icons/pwa-icon.svg`,
  `${ROOT}/icons/browser-tab.svg`,
  `${ROOT}/icons/raster/app-icon-96.png`,
  `${ROOT}/icons/raster/app-icon-192.png`,
  `${ROOT}/icons/raster/app-icon-256.png`,
  `${ROOT}/icons/raster/app-icon-512.png`,
  `${ROOT}/icons/raster/app-icon-1024.png`,
] as const;

/** Banner intrinsic ratio for next/image (approved horizontal lockup viewBox 390×80). */
export const JAN_DARPAN_LOGO_INTRINSIC = {
  width: 390,
  height: 80,
} as const;

/** Compact sticky masthead lockup (viewBox 230×48). */
export const JAN_DARPAN_COMPACT_LOGO_INTRINSIC = {
  width: 230,
  height: 48,
} as const;

/** Square mark intrinsic (viewBox 100×100). */
export const JAN_DARPAN_MARK_INTRINSIC = {
  width: 512,
  height: 512,
} as const;
