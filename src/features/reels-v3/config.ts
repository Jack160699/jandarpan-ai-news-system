/**
 * JDP-017 — Reels Experience V3 feature flags
 */

/** Reels Experience V3 — default ON (set NEXT_PUBLIC_REELS_V3=0 to roll back) */
export function isReelsV3Enabled(): boolean {
  return process.env.NEXT_PUBLIC_REELS_V3 !== "0";
}
