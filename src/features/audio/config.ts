/**
 * JDP-016 — Audio Experience V3 feature flags
 */

/** Enable Audio Experience V3 (default OFF — set NEXT_PUBLIC_AUDIO_V3=1) */
export function isAudioV3Enabled(): boolean {
  return process.env.NEXT_PUBLIC_AUDIO_V3 === "1";
}
