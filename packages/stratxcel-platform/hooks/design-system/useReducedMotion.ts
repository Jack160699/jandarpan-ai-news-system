"use client";

import { useEffect, useState } from "react";
import { breakpointQueries } from "../../tokens/breakpoints";

/**
 * Returns true when the user prefers reduced motion.
 * Components should skip animations when this is true.
 */
export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia(breakpointQueries.reducedMotion);
    setReduced(mq.matches);
    const handler = (e: MediaQueryListEvent) => setReduced(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  return reduced;
}
