"use client";

import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "@stratxcel/platform/hooks/design-system/useReducedMotion";

const SCROLL_DELTA = 10;
const TOP_REVEAL = 72;

/** Hide bottom nav on scroll down, reveal on scroll up */
export function useShellScrollHide(enabled: boolean): boolean {
  const reduced = useReducedMotion();
  const [hidden, setHidden] = useState(false);
  const lastY = useRef(0);
  const ticking = useRef(false);

  useEffect(() => {
    if (!enabled || reduced) {
      setHidden(false);
      return;
    }

    lastY.current = window.scrollY;

    const onScroll = () => {
      if (ticking.current) return;
      ticking.current = true;
      requestAnimationFrame(() => {
        const y = window.scrollY;
        if (y <= TOP_REVEAL) {
          setHidden(false);
        } else if (y > lastY.current + SCROLL_DELTA) {
          setHidden(true);
        } else if (y < lastY.current - SCROLL_DELTA) {
          setHidden(false);
        }
        lastY.current = y;
        ticking.current = false;
      });
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [enabled, reduced]);

  return hidden;
}
