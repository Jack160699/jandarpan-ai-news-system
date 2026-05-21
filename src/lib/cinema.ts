"use client";

import { gsap } from "@/lib/gsap";

/** Batch ScrollTrigger refresh after lazy media (reduces layout thrash) */
export function refreshCinemaLayout(delayMs = 120) {
  if (typeof window === "undefined") return;
  const run = () => {
    import("@/lib/gsap").then(({ ScrollTrigger }) => ScrollTrigger.refresh());
  };
  window.setTimeout(run, delayMs);
}

export function prefersCinemaMotion(): boolean {
  if (typeof window === "undefined") return false;
  return !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/** Shared cleanup-friendly context helper */
export function withCinemaContext(
  scope: Element | string,
  fn: () => void
): () => void {
  const ctx = gsap.context(fn, scope);
  return () => ctx.revert();
}
