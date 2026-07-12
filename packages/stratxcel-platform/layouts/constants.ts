/**
 * Stratxcel platform — layout constants (generic, app-agnostic)
 */

/** Maximum content widths per surface */
export const maxContentWidth = {
  article: 760,
  homepage: 1280,
  dashboard: 1440,
  default: 1280,
} as const;

/** Chrome dimensions */
export const shellDimensions = {
  topBarDesktop: 64,
  topBarMobile: 56,
  bottomNav: 56,
  sidebarCollapsed: 72,
  sidebarExpanded: 260,
  sidebarMin: 200,
  sidebarMax: 360,
} as const;

export const SIDEBAR_STORAGE_KEY = "stratxcel-sidebar-state";
export const SCROLL_POSITIONS_KEY = "stratxcel-scroll-positions";
