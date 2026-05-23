/** Route transition timings — GPU-safe, premium feel */

export const ROUTE_EXIT_MS = 160;
export const ROUTE_ENTER_MS = 280;
export const ROUTE_TOTAL_MS = ROUTE_EXIT_MS + ROUTE_ENTER_MS;

export function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function supportsViewTransitions(): boolean {
  if (typeof document === "undefined") return false;
  return typeof document.startViewTransition === "function";
}
