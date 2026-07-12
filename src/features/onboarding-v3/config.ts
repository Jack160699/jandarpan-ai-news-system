/**
 * JDP-019 — Premium Onboarding V3 feature flag
 */

/** Enable Onboarding Experience V3 (default OFF — set NEXT_PUBLIC_ONBOARDING_V3=1) */
export function isOnboardingV3Enabled(): boolean {
  return process.env.NEXT_PUBLIC_ONBOARDING_V3 === "1";
}
