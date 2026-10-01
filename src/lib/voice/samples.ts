/**
 * Voice verification samples: Hindi breaking news, Hindi normal bulletin, English breaking news,
 * English normal bulletin. Generated on demand from the admin panel (or scripts/voice-smoke-test.mjs)
 * so a human can listen for pronunciation, pauses, naturalness, clarity and speed before the
 * voice is switched on for real articles. Sample copy is generic public-interest text — no real
 * individuals, no claims.
 */

import { createAdminServerClient } from "@/lib/supabase";
import { estimateTtsCostUsd } from "@/lib/voice/providers";
import { buildNewsScript } from "@/lib/voice/script/news-script";
import { synthesizeWithFallback } from "@/lib/voice/synthesize";
import { validateGeneratedAudio } from "@/lib/voice/validate-audio";
import { AUDIO_BUCKET } from "@/lib/voice/generate-article-audio";
import type { VoiceLanguage } from "@/lib/voice/types";

export { VOICE_SAMPLES, type VoiceSampleSpec } from "@/lib/voice/samples-data";
import { VOICE_SAMPLES } from "@/lib/voice/samples-data";

export type VoiceSampleResult = {
  name: string;
  label: string;
  ok: boolean;
  provider?: string;
  model?: string;
  voiceName?: string;
  latencyMs?: number;
  durationMs?: number | null;
  characters?: number;
  estimatedCostUsd?: number;
  fallbackUsed?: boolean;
  storagePath?: string;
  error?: string;
  validationFailures?: string[];
  script: string;
};

export async function generateVoiceSamples(runId: string): Promise<VoiceSampleResult[]> {
  const supabase = createAdminServerClient();
  const results: VoiceSampleResult[] = [];
  for (const spec of VOICE_SAMPLES) {
    const script = buildNewsScript(spec.input);
    const outcome = await synthesizeWithFallback({ script, language: spec.language, style: spec.style });
    if (!outcome.ok) {
      results.push({ name: spec.name, label: spec.label, ok: false, error: outcome.error, script: script.text });
      continue;
    }
    const r = outcome.result;
    const validation = validateGeneratedAudio({ audio: r.audio, script: script.text, language: spec.language, expectedSeconds: script.estimatedSeconds });
    const path = `tests/${runId}/${spec.name}.mp3`;
    let storagePath: string | undefined;
    if (validation.ok || r.audio.byteLength > 0) {
      const { error } = await supabase.storage.from(AUDIO_BUCKET).upload(path, r.audio, { contentType: "audio/mpeg", upsert: true });
      if (!error) storagePath = path;
    }
    results.push({
      name: spec.name,
      label: spec.label,
      ok: validation.ok && Boolean(storagePath),
      provider: r.provider,
      model: r.model,
      voiceName: r.voiceName,
      latencyMs: r.latencyMs,
      durationMs: validation.durationMs,
      characters: r.characters,
      estimatedCostUsd: Math.round(estimateTtsCostUsd(r.provider, r.characters, (validation.durationMs ?? 0) / 1000) * 1e6) / 1e6,
      fallbackUsed: outcome.fallbackUsed,
      storagePath,
      validationFailures: validation.failures,
      script: script.text,
    });
  }
  return results;
}
