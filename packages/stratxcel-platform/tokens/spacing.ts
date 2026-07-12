/**
 * Jan Darpan Design System — Spacing Scale
 *
 * 4px base grid: 4 · 8 · 12 · 16 · 24 · 32 · 48 · 64 · 96
 *
 * @module design-system/tokens/spacing
 */

export const spacingPx = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  "2xl": 32,
  "3xl": 48,
  "4xl": 64,
  "5xl": 96,
} as const;

/** CSS custom property references (aligned with variables.css) */
export const spacing = {
  xs: "var(--jds-space-xs)",
  sm: "var(--jds-space-sm)",
  md: "var(--jds-space-md)",
  lg: "var(--jds-space-lg)",
  xl: "var(--jds-space-xl)",
  "2xl": "var(--jds-space-2xl)",
  "3xl": "var(--jds-space-3xl)",
  "4xl": "var(--jds-space-4xl)",
  "5xl": "var(--jds-space-5xl)",
  /** Numeric aliases matching the 4px grid spec */
  4: "var(--jds-space-xs)",
  8: "var(--jds-space-sm)",
  12: "var(--jds-space-md)",
  16: "var(--jds-space-lg)",
  24: "var(--jds-space-xl)",
  32: "var(--jds-space-2xl)",
  48: "var(--jds-space-3xl)",
  64: "var(--jds-space-4xl)",
  96: "var(--jds-space-5xl)",
} as const;

export type SpacingToken = keyof typeof spacing;
