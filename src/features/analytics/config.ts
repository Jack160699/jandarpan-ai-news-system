/**
 * JDP-018 — Executive Analytics V3 feature flags
 */

/** Enable Executive Analytics Dashboard V3 (default OFF — set NEXT_PUBLIC_ANALYTICS_V3=1) */
export function isAnalyticsV3Enabled(): boolean {
  return process.env.NEXT_PUBLIC_ANALYTICS_V3 === "1";
}
