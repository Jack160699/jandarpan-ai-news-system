/**
 * CSS variable name helpers for programmatic theme access.
 * @module design-system/theme/css-vars
 */

import type { CSSProperties } from "react";
import { spacing } from "../tokens/spacing";
import { radius } from "../tokens/radius";
import { elevation } from "../tokens/elevation";
import { durations } from "../tokens/durations";
import { colorVars } from "../tokens/colors";

/** All semantic CSS variable references grouped by category */
export const cssVars = {
  colors: colorVars,
  spacing,
  radius,
  elevation,
  durations,
} as const;

/** Apply a subset of CSS variables to an inline style object */
export function cssVarStyle(vars: Record<string, string>): CSSProperties {
  const style: Record<string, string> = {};
  for (const [key, value] of Object.entries(vars)) {
    style[key.startsWith("--") ? key : `--${key}`] = value;
  }
  return style as CSSProperties;
}
