/**
 * JDP-031 — Homepage feature flags
 */

/** Enable Jan Darpan V3.1 homepage (default OFF — set NEXT_PUBLIC_HOME_V3=1) */
export function isHomeV3Enabled(): boolean {
  return process.env.NEXT_PUBLIC_HOME_V3 === "1";
}
