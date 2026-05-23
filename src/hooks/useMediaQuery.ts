"use client";

import { useEffect, useState } from "react";
import { RF_MEDIA } from "@/lib/layout/breakpoints";

export function useMediaQuery(query: string) {
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
  return useMediaQuery(RF_MEDIA.mobile);
}

/** ≥768px */
export function useIsTabletUp() {
  return useMediaQuery(RF_MEDIA.tablet);
}

/** ≥1024px */
export function useIsLaptopUp() {
  return useMediaQuery(RF_MEDIA.laptop);
}

/** ≥1440px */
export function useIsDesktop() {
  return useMediaQuery(RF_MEDIA.desktop);
}
