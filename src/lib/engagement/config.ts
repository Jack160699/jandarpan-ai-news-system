/**
 * Engagement Phase 1 — Alive Homepage feature gate.
 * Enabled whenever Reader DS is on, unless explicitly disabled.
 */

import { isReaderDesignSystemEnabled } from "@/features/reader-ds/config";

/** Opt-out: NEXT_PUBLIC_ALIVE_HOME=0. Opt-in forced: NEXT_PUBLIC_ALIVE_HOME=1. */
export function isAliveHomeEnabled(): boolean {
  if (process.env.NEXT_PUBLIC_ALIVE_HOME === "0") return false;
  if (process.env.NEXT_PUBLIC_ALIVE_HOME === "1") return true;
  return isReaderDesignSystemEnabled();
}
