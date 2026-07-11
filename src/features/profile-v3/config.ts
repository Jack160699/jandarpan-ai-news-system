/**
 * JDP-014 — Profile Experience V3
 */

/** Enable Profile Experience V3 (default OFF — set NEXT_PUBLIC_PROFILE_V3=1) */
export function isProfileV3Enabled(): boolean {
  return process.env.NEXT_PUBLIC_PROFILE_V3 === "1";
}
