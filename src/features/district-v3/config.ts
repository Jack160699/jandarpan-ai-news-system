/**
 * JDP-012 — District Experience V3 feature flags
 */

/** Enable District Experience V3 (default OFF — set NEXT_PUBLIC_DISTRICT_V3=1) */
export function isDistrictV3Enabled(): boolean {
  return process.env.NEXT_PUBLIC_DISTRICT_V3 === "1";
}
