/**
 * Jan Darpan Design System — Opacity Tokens
 *
 * @module design-system/tokens/opacity
 */

export const opacity = {
  disabled: 0.5,
  muted: 0.62,
  subtle: 0.08,
  overlay: 0.72,
  hover: 0.85,
  pressed: 0.92,
} as const;

export const opacityVars = {
  disabled: "var(--jds-opacity-disabled)",
  muted: "var(--jds-opacity-muted)",
  overlay: "var(--jds-opacity-overlay)",
} as const;

export type OpacityToken = keyof typeof opacity;
