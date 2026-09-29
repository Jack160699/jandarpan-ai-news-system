/**
 * Post-generation audio validation: exists, plausible duration for the script, not obviously
 * corrupted, and the SCRIPT (not the audio — a TTS engine cannot be asked which language it spoke)
 * is in the right language script. Pronunciation and naturalness need human listening; the
 * checks here catch empty, truncated, mis-timed, and wrong-language output automatically.
 */

import { parseMp3 } from "@/lib/voice/mp3";
import { validateLanguageScript } from "@/lib/news/quality/script-detect";
import type { VoiceLanguage } from "@/lib/voice/types";

export type AudioValidation = {
  ok: boolean;
  durationMs: number | null;
  failures: string[];
  checks: {
    exists: boolean;
    parseable: boolean;
    durationInRange: boolean;
    notTruncated: boolean;
    languageScript: boolean;
  };
};

export const MIN_AUDIO_BYTES = 4_000;
export const MAX_AUDIO_SECONDS = 240;
export const MIN_AUDIO_SECONDS = 3;

export function validateGeneratedAudio(input: {
  audio: Uint8Array | null | undefined;
  script: string;
  language: VoiceLanguage;
  /** Duration the script should take, from news-script estimateSeconds. */
  expectedSeconds: number;
}): AudioValidation {
  const failures: string[] = [];
  const checks = { exists: false, parseable: false, durationInRange: false, notTruncated: false, languageScript: false };

  const audio = input.audio;
  checks.exists = Boolean(audio && audio.byteLength >= MIN_AUDIO_BYTES);
  if (!checks.exists) failures.push(`audio_missing_or_tiny:${audio?.byteLength ?? 0}b`);

  let durationMs: number | null = null;
  if (audio && checks.exists) {
    const info = parseMp3(audio);
    checks.parseable = info !== null && info.frames >= 5;
    if (!checks.parseable) failures.push("audio_not_parseable_mp3");
    if (info) {
      durationMs = info.durationMs;
      const secs = info.durationMs / 1000;
      // Broadcast pacing is steady: allow 0.45x–2.2x of the estimate (accent/pauses/rate vary).
      const lo = Math.max(MIN_AUDIO_SECONDS, input.expectedSeconds * 0.45);
      const hi = Math.min(MAX_AUDIO_SECONDS, Math.max(input.expectedSeconds * 2.2, 8));
      checks.durationInRange = secs >= lo && secs <= hi;
      if (!checks.durationInRange) failures.push(`duration_out_of_range:${secs.toFixed(1)}s_expected_${lo.toFixed(0)}-${hi.toFixed(0)}s`);
      checks.notTruncated = info.validRatio >= 0.9;
      if (!checks.notTruncated) failures.push(`audio_corrupted:valid_ratio_${info.validRatio.toFixed(2)}`);
    }
  }

  const lang = input.language === "hi-IN" ? "hi" : "en";
  const scriptCheck = validateLanguageScript(input.script, lang, "body");
  checks.languageScript = scriptCheck.ok;
  if (!scriptCheck.ok) failures.push(`script_language_mismatch:${scriptCheck.code}`);

  return { ok: failures.length === 0, durationMs, failures, checks };
}
