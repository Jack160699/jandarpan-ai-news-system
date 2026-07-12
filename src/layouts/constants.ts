/**
 * JDP-002 — Application shell layout constants
 * Uses design-system breakpoint scale; max widths per surface type.
 */

/** @see {@link @/design-system/tokens/breakpoints} for canonical breakpoint scale */

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

export const SIDEBAR_STORAGE_KEY = "jdp-sidebar-state";
export const SCROLL_POSITIONS_KEY = "jdp-scroll-positions";

/** Bottom navigation — five items per JDP-002 spec */
export const SHELL_BOTTOM_NAV = [
  { id: "home", href: "/", icon: "home" as const },
  { id: "district", href: "/district", icon: "district" as const, dynamic: true },
  { id: "ai", href: "#ai", icon: "ai" as const, action: "command-palette" as const },
  { id: "alerts", href: "/live", icon: "alerts" as const },
  { id: "you", href: "#you", icon: "you" as const, action: "menu" as const },
] as const;

/** Command palette static navigation targets */
export const SHELL_COMMANDS = [
  { id: "cmd-home", label: "Go to Home", href: "/", group: "commands" },
  { id: "cmd-live", label: "Live Updates", href: "/live", group: "live" },
  { id: "cmd-search", label: "Search News", href: "/search", group: "commands" },
  { id: "cmd-archive", label: "Saved Stories", href: "/archive", group: "commands" },
  { id: "cmd-listen", label: "Listen to Headlines", href: "/listen", group: "commands" },
] as const;

export const SHELL_DISTRICTS = [
  { id: "raipur", label: "Raipur", href: "/district/raipur" },
  { id: "bilaspur", label: "Bilaspur", href: "/district/bilaspur" },
  { id: "bastar", label: "Bastar", href: "/district/bastar" },
  { id: "durg", label: "Durg", href: "/district/durg" },
] as const;

export const SHELL_TOPICS = [
  { id: "politics", label: "Politics", href: "/category/politics" },
  { id: "sports", label: "Sports", href: "/category/sports" },
  { id: "business", label: "Business", href: "/category/business" },
  { id: "crime", label: "Crime", href: "/category/crime" },
] as const;
