/**
 * JDP-015 — Live News Experience V3 feature flags
 */

/** Enable Live Experience V3 (default OFF — set NEXT_PUBLIC_LIVE_V3=1) */
export function isLiveV3Enabled(): boolean {
  return process.env.NEXT_PUBLIC_LIVE_V3 === "1";
}
