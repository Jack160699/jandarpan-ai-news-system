/**
 * JDP-014 — Profile Experience V3
 */

/** Profile Experience V3 — default ON (set NEXT_PUBLIC_PROFILE_V3=0 to roll back) */
export function isProfileV3Enabled(): boolean {
  return process.env.NEXT_PUBLIC_PROFILE_V3 !== "0";
}
