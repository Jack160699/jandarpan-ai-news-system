/**
 * JDP-005 — Morning Brief feature flags
 */

/** Enable Morning Brief experience (default OFF — set NEXT_PUBLIC_MORNING_BRIEF=1) */
export function isMorningBriefEnabled(): boolean {
  return process.env.NEXT_PUBLIC_MORNING_BRIEF === "1";
}
