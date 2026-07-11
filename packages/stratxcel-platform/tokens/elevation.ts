/**
 * JDP-001 — Elevation system
 * Maps semantic elevation levels to shadow tokens. No random shadows in components.
 */
import { shadows, shadowsDark } from "./shadows";

export const elevation = {
  none: shadows.none,
  sm: shadows.sm,
  md: shadows.md,
  lg: shadows.lg,
  xl: shadows.xl,
} as const;

export const elevationDark = {
  none: shadowsDark.none,
  sm: shadowsDark.sm,
  md: shadowsDark.md,
  lg: shadowsDark.lg,
  xl: shadowsDark.xl,
} as const;

export type ElevationToken = keyof typeof elevation;

export const elevationCssVars = {
  "--jds-elevation-none": elevation.none,
  "--jds-elevation-sm": elevation.sm,
  "--jds-elevation-md": elevation.md,
  "--jds-elevation-lg": elevation.lg,
  "--jds-elevation-xl": elevation.xl,
} as const;
