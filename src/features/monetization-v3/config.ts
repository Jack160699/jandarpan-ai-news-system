/**
 * JDP-020 — Monetization UI V3 feature flags
 */

/** Enable Monetization UI V3 (default OFF — set NEXT_PUBLIC_MONETIZATION_V3=1) */
export function isMonetizationV3Enabled(): boolean {
  return process.env.NEXT_PUBLIC_MONETIZATION_V3 === "1";
}
