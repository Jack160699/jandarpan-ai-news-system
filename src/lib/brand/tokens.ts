/**
 * Approved Jan Darpan brand tokens (source of truth: brand handoff
 * `handoff/css/brand-tokens.css` + `typescript/brand.ts`).
 *
 * These are the EXACT approved identity values, used by brand-mark rendering and
 * asset generation. They are intentionally kept separate from the live reader
 * design-system palette in `src/features/reader-ds/styles/tokens.css`, which uses
 * slightly softened in-product shades. Do not overwrite the reader-ds tokens with
 * these values without a deliberate design decision — doing so restyles the whole
 * reader UI. The logo assets themselves already embed these exact colours.
 */
export const JAN_DARPAN_BRAND_COLORS = {
  /** Sunrise red — the rising sun in the mirror mark. */
  red: "#C8102E",
  /** Deep navy — Devanagari wordmark + icon background. */
  navy: "#0B1E3B",
  /** Warm white — light canvas. */
  white: "#FBF8F2",
  /** Mirror gold — ring, horizon line, Latin wordmark. */
  gold: "#C9A24B",
  /** Dark canvas — dark-theme background. */
  canvasDark: "#081426",
} as const;

export const JAN_DARPAN_BRAND_TYPOGRAPHY = {
  /** Devanagari wordmark ("जन दर्पण"). */
  devanagari: "'Tiro Devanagari Hindi', 'Noto Serif Devanagari', serif",
  /** Latin wordmark ("JAN DARPAN"). */
  latin: "'Marcellus', serif",
} as const;

/** Master brand tagline (approved). */
export const JAN_DARPAN_TAGLINE = {
  hi: "हर जिले की अपनी आवाज़",
  /** Approx. English rendering for alt text / non-Devanagari contexts. */
  enApprox: "Every district, its own voice",
} as const;

/** Motion durations / easings from the approved motion system (ms). */
export const JAN_DARPAN_MOTION = {
  easeStandard: "cubic-bezier(.22, 1, .36, 1)",
  easeSpring: "cubic-bezier(.34, 1.56, .64, 1)",
  durCinematic: 5000,
  durSignature: 2400,
  durMicro: 900,
} as const;

/** Minimum clear-space + sizing guidance for the mark (px), from the brand guide. */
export const JAN_DARPAN_LOGO_RULES = {
  /** Minimum rendered mark size for legibility. */
  minMarkPx: 24,
  /** Minimum horizontal-lockup width where the Latin sub-wordmark stays legible. */
  minHorizontalPx: 140,
  /** Clear space around the lockup = this fraction of the mark height. */
  clearSpaceRatio: 0.4,
} as const;
