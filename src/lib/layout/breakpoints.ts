/** Canonical breakpoints — must match responsive-foundation.css */
export const RF_BREAKPOINTS = {
  mobileMax: 767,
  tablet: 768,
  laptop: 1024,
  desktop: 1440,
} as const;

export type RfBreakpoint = keyof typeof RF_BREAKPOINTS;

export const RF_MEDIA = {
  mobile: `(max-width: ${RF_BREAKPOINTS.mobileMax}px)`,
  tablet: `(min-width: ${RF_BREAKPOINTS.tablet}px)`,
  tabletOnly: `(min-width: ${RF_BREAKPOINTS.tablet}px) and (max-width: ${RF_BREAKPOINTS.laptop - 1}px)`,
  laptop: `(min-width: ${RF_BREAKPOINTS.laptop}px)`,
  laptopOnly: `(min-width: ${RF_BREAKPOINTS.laptop}px) and (max-width: ${RF_BREAKPOINTS.desktop - 1}px)`,
  desktop: `(min-width: ${RF_BREAKPOINTS.desktop}px)`,
} as const;
