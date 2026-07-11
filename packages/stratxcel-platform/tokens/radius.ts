/**
 * Jan Darpan Design System — Border Radius Tokens
 *
 * Scale: 4 · 8 · 12 · 16 · 20 · 999 (pill)
 *
 * @module design-system/tokens/radius
 */

export const radiusPx = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  full: 999,
} as const;

export const radius = {
  xs: "var(--jds-radius-xs)",
  sm: "var(--jds-radius-sm)",
  md: "var(--jds-radius-md)",
  lg: "var(--jds-radius-lg)",
  xl: "var(--jds-radius-xl)",
  full: "var(--jds-radius-full)",
} as const;

export type RadiusToken = keyof typeof radius;
