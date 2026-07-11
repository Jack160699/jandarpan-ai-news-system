/**
 * JDP-017 — Reels Experience V3 feature flags
 */

/** Enable Reels Experience V3 (default OFF — set NEXT_PUBLIC_REELS_V3=1) */
export function isReelsV3Enabled(): boolean {
  return process.env.NEXT_PUBLIC_REELS_V3 === "1";
}
