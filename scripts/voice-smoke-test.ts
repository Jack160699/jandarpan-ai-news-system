/**
 * Voice smoke test — generates the four verification samples with REAL Google credentials and
 * writes MP3 files locally so a human can listen (pronunciation, pauses, naturalness, clarity, speed).
 * No database or Supabase needed.
 *
 *   # credentials come from the environment; never paste them into source or commit them
 *   GOOGLE_TTS_SERVICE_ACCOUNT_JSON="$(cat ./sa-key.json)" GOOGLE_CLOUD_PROJECT=<billing-project> \
 *     pnpm exec tsx scripts/voice-smoke-test.ts [outDir]
 *
 * Optional: TTS_PRIMARY=chirp3_hd to audition the fallback voice, VOICE_GEMINI_HI_STANDARD=Orus
 * (etc.) to try other voices, GOOGLE_TTS_GEMINI_MODEL to pin a model.
 */

import fs from "node:fs";
import path from "node:path";
import { googleTtsConfigured } from "../src/lib/voice/google-auth";
import { VOICE_SAMPLES } from "../src/lib/voice/samples-data";
import { buildNewsScript } from "../src/lib/voice/script/news-script";
import { synthesizeWithFallback } from "../src/lib/voice/synthesize";
import { validateGeneratedAudio } from "../src/lib/voice/validate-audio";
import { estimateTtsCostUsd } from "../src/lib/voice/providers";

async function main() {
  if (!googleTtsConfigured()) {
    console.error("GOOGLE_TTS_SERVICE_ACCOUNT_JSON is not set (raw JSON or base64). Nothing to test.");
    process.exit(2);
  }
  const outDir = path.resolve(process.argv[2] ?? "voice-samples");
  fs.mkdirSync(outDir, { recursive: true });

  let failures = 0;
  for (const spec of VOICE_SAMPLES) {
    const script = buildNewsScript(spec.input);
    console.log(`\n▶ ${spec.label}  (${script.wordCount} words, ~${script.estimatedSeconds}s expected)`);
    console.log(script.text.split("\n").map((l) => `   ${l}`).join("\n"));

    const outcome = await synthesizeWithFallback({ script, language: spec.language, style: spec.style });
    if (!outcome.ok) {
      failures++;
      console.log(`   ✗ FAILED: ${outcome.error}`);
      for (const a of outcome.attempts) console.log(`     attempt ${a.attempt} ${a.provider}: ${a.error ?? "ok"} (${a.latencyMs}ms)`);
      continue;
    }
    const r = outcome.result;
    const v = validateGeneratedAudio({ audio: r.audio, script: script.text, language: spec.language, expectedSeconds: script.estimatedSeconds });
    const file = path.join(outDir, `${spec.name}.mp3`);
    fs.writeFileSync(file, r.audio);
    const cost = estimateTtsCostUsd(r.provider, r.characters, (v.durationMs ?? 0) / 1000);
    console.log(
      `   ${v.ok ? "✓" : "✗"} ${r.provider} / ${r.model} / ${r.voiceName}${outcome.fallbackUsed ? "  (FALLBACK used)" : ""}\n` +
        `     ${(r.audio.byteLength / 1024).toFixed(0)} kB, ${((v.durationMs ?? 0) / 1000).toFixed(1)}s audio, ${r.latencyMs}ms latency, ` +
        `${r.characters} chars, est $${cost.toFixed(5)} → ${file}`
    );
    if (!v.ok) {
      failures++;
      console.log(`     validation: ${v.failures.join("; ")}`);
    }
  }
  console.log(`\n${failures === 0 ? "All samples generated and validated." : `${failures} sample(s) failed.`} Now LISTEN to the files in ${outDir}.`);
  process.exit(failures === 0 ? 0 : 1);
}

void main();
