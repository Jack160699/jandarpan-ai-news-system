"use client";

import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "@/design-system/hooks/useReducedMotion";

const HYSTERESIS = 8;
const COLLAPSE_FLOOR = 24;

/**
 * Header collapse state — 56px rest / 44px collapsed.
 * Collapses on scroll-down past the floor, restores on scroll-up.
 * rAF-throttled with a hysteresis band so it doesn't flicker mid-scroll.
 */
export function useHeaderCollapse(): boolean {
  const reduced = useReducedMotion();
  const [collapsed, setCollapsed] = useState(false);
  const lastY = useRef(0);
  const ticking = useRef(false);

  useEffect(() => {
    if (reduced) {
      setCollapsed(false);
      return;
    }

    lastY.current = window.scrollY;

    const onScroll = () => {
      if (ticking.current) return;
      ticking.current = true;
      requestAnimationFrame(() => {
        const y = window.scrollY;
        const delta = y - lastY.current;
        if (y <= COLLAPSE_FLOOR) {
          setCollapsed(false);
        } else if (delta > HYSTERESIS) {
          setCollapsed(true);
        } else if (delta < -HYSTERESIS) {
          setCollapsed(false);
        }
        lastY.current = y;
        ticking.current = false;
      });
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [reduced]);

  return collapsed;
}
