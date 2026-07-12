/**
 * Jan Darpan Design System — Responsive Breakpoints
 *
 * Canonical source for all responsive logic.
 * Pixel values align with `src/styles/platform/tokens.css`:
 * mobile <768 · tablet 768–1023 · desktop ≥1024
 *
 * @module design-system/tokens/breakpoints
 */

/** Tailwind-style scale (px) */
export const sm = 480;
export const md = 768;
export const lg = 1024;
export const xl = 1280;
/** @alias 2xl */
export const bp2xl = 1536;

/** Semantic layout tiers (px) — mobile-first base is 0 */
export const mobile = 0;
export const tablet = md;
export const desktop = lg;

/** Full pixel scale for tooling, docs, and shell layout */
export const breakpointsPx = {
  sm,
  md,
  lg,
  xl,
  "2xl": bp2xl,
  mobile,
  tablet,
  desktop,
} as const;

/** CSS media query strings — mobile-first */
export const breakpoints = {
  sm: `(min-width: ${sm}px)`,
  md: `(min-width: ${md}px)`,
  lg: `(min-width: ${lg}px)`,
  xl: `(min-width: ${xl}px)`,
  "2xl": `(min-width: ${bp2xl}px)`,
  mobile: `(max-width: ${md - 1}px)`,
  tablet: `(min-width: ${md}px)`,
  tabletOnly: `(min-width: ${md}px) and (max-width: ${lg - 1}px)`,
  desktop: `(min-width: ${lg}px)`,
  belowDesktop: `(max-width: ${lg - 1}px)`,
  wide: `(min-width: ${xl}px)`,
} as const;

/** Media query presets for hooks and `window.matchMedia` */
export const breakpointQueries = {
  sm: breakpoints.sm,
  md: breakpoints.md,
  lg: breakpoints.lg,
  xl: breakpoints.xl,
  "2xl": breakpoints["2xl"],
  mobile: breakpoints.mobile,
  tablet: breakpoints.tablet,
  tabletOnly: breakpoints.tabletOnly,
  desktop: breakpoints.desktop,
  belowDesktop: breakpoints.belowDesktop,
  wide: breakpoints.wide,
  hover: "(hover: hover) and (pointer: fine)",
  reducedMotion: "(prefers-reduced-motion: reduce)",
} as const;

export type Breakpoint = keyof typeof breakpoints;
export type BreakpointPx = keyof typeof breakpointsPx;
