/**
 * Audio generation master switch.
 *
 * Google TTS credentials being present is NOT enough to start spending: audio is opt-in via
 * AUDIO_GENERATION_ENABLED=true, set intentionally once credentials, quota and voices have been verified.
 * Default is OFF so a stray credential can never start synthesis (and billing) on its own.
 */
export function audioGenerationEnabled(env: Record<string, string | undefined> = process.env): boolean {
  const v = (env.AUDIO_GENERATION_ENABLED ?? "").trim().toLowerCase();
  return v === "true" || v === "1" || v === "yes";
}
