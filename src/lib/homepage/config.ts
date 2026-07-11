/**
 * JDP-003 — Homepage feature flags
 */

/** Enable Home Experience V3 (default OFF — set NEXT_PUBLIC_HOME_V3=1) */
export function isHomeV3Enabled(): boolean {
  return process.env.NEXT_PUBLIC_HOME_V3 === "1";
}
