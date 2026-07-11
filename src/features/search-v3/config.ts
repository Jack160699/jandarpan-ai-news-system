/**
 * JDP-008 — Global Search V3 feature flags
 */

/** Enable Search Experience V3 (default OFF — set NEXT_PUBLIC_SEARCH_V3=1) */
export function isSearchV3Enabled(): boolean {
  return process.env.NEXT_PUBLIC_SEARCH_V3 === "1";
}
