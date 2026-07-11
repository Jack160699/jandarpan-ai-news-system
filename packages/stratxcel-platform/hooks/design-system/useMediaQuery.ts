"use client";

import { useEffect, useState } from "react";
import { breakpointQueries } from "../../tokens/breakpoints";

/**
 * Subscribe to a CSS media query. Returns false during SSR.
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia(query);
    setMatches(mq.matches);
    const handler = (e: MediaQueryListEvent) => setMatches(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, [query]);

  return matches;
}

/** ≤767px — mobile chrome, bottom nav, stacked layout */
export function useIsMobile() {
  return useMediaQuery(breakpointQueries.mobile);
}

/** ≥768px */
export function useIsTabletUp() {
  return useMediaQuery(breakpointQueries.tablet);
}

/** ≥768px (alias) */
export function useIsTablet() {
  return useMediaQuery(breakpointQueries.md);
}

/** ≥1024px */
export function useIsLaptopUp() {
  return useMediaQuery(breakpointQueries.lg);
}

/** ≥1024px — matches CSS `--bp-desktop-min` */
export function useIsDesktop() {
  return useMediaQuery(breakpointQueries.desktop);
}

export function usePrefersHover() {
  return useMediaQuery(breakpointQueries.hover);
}
