/**
 * @deprecated Import from `@/design-system/tokens/breakpoints` instead.
 * Re-exported for backward compatibility during migration.
 */
import {
  md,
  lg,
  xl,
  breakpointQueries,
  breakpointsPx,
} from "@/design-system/tokens/breakpoints";

export const RF_BREAKPOINTS = {
  mobileMax: md - 1,
  tablet: md,
  laptop: lg,
  desktop: lg,
} as const;

export type RfBreakpoint = keyof typeof RF_BREAKPOINTS;

/** @deprecated Use `breakpointQueries` from `@/design-system/tokens/breakpoints` */
export const RF_MEDIA = {
  mobile: breakpointQueries.mobile,
  tablet: breakpointQueries.tablet,
  tabletOnly: breakpointQueries.tabletOnly,
  laptop: breakpointQueries.lg,
  laptopOnly: `(min-width: ${lg}px) and (max-width: ${xl - 1}px)`,
  desktop: breakpointQueries.desktop,
} as const;

/** @deprecated Use `breakpointsPx` from `@/design-system/tokens/breakpoints` */
export const RS_BREAKPOINTS = RF_BREAKPOINTS;
/** @deprecated Use `breakpointQueries` from `@/design-system/tokens/breakpoints` */
export const RS_MEDIA = RF_MEDIA;

export { breakpointsPx, breakpointQueries };
