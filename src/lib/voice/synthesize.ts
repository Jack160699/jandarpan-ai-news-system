/**
 * TTS with automatic failover: Gemini-TTS (primary) → Chirp 3 HD (fallback).
 *
 * Provider health uses the SAME persisted circuit breaker as the chat providers
 * (health.ts / ai_provider_circuit), keyed "tts:<provider>", so a provider that returns 401 /
 * 429 / model-unavailable / repeated timeouts is skipped by every serverless instance until its
 * cooldown ends — instead of burning a request timeout per article. One provider failing never
 * fails the run; every attempt is recorded (provider, model, attempt, latency, error, fallback).
 */

import { hydrateProviderHealth, isProviderHealthy, markProviderUnhealthy, recordProviderSuccess } from "@/lib/ai/providers/health";
import { renderForChirp, renderForGemini, type NewsScript } from "@/lib/voice/script/news-script";
import {
  createChirp3HdProvider,
  createGeminiTtsProvider,
  type TtsProvider,
} from "@/lib/voice/providers";
import type { DeliveryStyle, SynthesisOutcome, TtsAttemptLog, TtsFailure, TtsProviderId, VoiceLanguage } from "@/lib/voice/types";

const healthKey = (id: TtsProviderId) => `tts:${id}`;

export function defaultProviders(env: Record<string, string | undefined> = process.env): TtsProvider[] {
  const gemini = createGeminiTtsProvider();
  const chirp = createChirp3HdProvider();
  return env.TTS_PRIMARY === "chirp3_hd" ? [chirp, gemini] : [gemini, chirp];
}

function recordFailure(f: TtsFailure): void {
  markProviderUnhealthy(healthKey(f.provider), {
    reason: `${f.code}: ${f.message}`,
    httpStatus: f.httpStatus,
    authFailure: f.code === "unauthorized",
    rateLimited: f.code === "quota",
    invalidRequest: f.code === "model_unavailable",
    code: f.code === "timeout" ? "ai_timeout" : f.code,
  });
}

export async function synthesizeWithFallback(input: {
  script: NewsScript;
  language: VoiceLanguage;
  style: DeliveryStyle;
  providers?: TtsProvider[];
  timeoutMs?: number;
}): Promise<SynthesisOutcome> {
  await hydrateProviderHealth();
  const providers = input.providers ?? defaultProviders();
  const attempts: TtsAttemptLog[] = [];
  let attemptNo = 0;

  for (let i = 0; i < providers.length; i++) {
    const provider = providers[i]!;
    if (!provider.isConfigured()) {
      attempts.push({ provider: provider.id, model: null, attempt: ++attemptNo, ok: false, latencyMs: 0, error: "not_configured", fallbackUsed: i > 0 });
      continue;
    }
    if (!isProviderHealthy(healthKey(provider.id))) {
      attempts.push({ provider: provider.id, model: null, attempt: ++attemptNo, ok: false, latencyMs: 0, error: "circuit_open", fallbackUsed: i > 0 });
      continue;
    }

    const text = provider.id === "chirp3_hd" ? renderForChirp(input.script) : renderForGemini(input.script);
    const result = await provider.synthesize({
      text,
      markup: provider.id === "chirp3_hd" ? text : undefined,
      language: input.language,
      style: input.style,
      kind: input.script.kind,
      timeoutMs: input.timeoutMs,
    });

    if (result.ok) {
      recordProviderSuccess(healthKey(provider.id), result.latencyMs);
      attempts.push({ provider: provider.id, model: result.model, attempt: ++attemptNo, ok: true, latencyMs: result.latencyMs, fallbackUsed: i > 0 });
      return { ok: true, result, attempts, fallbackUsed: i > 0 };
    }

    recordFailure(result);
    attempts.push({
      provider: provider.id,
      model: null,
      attempt: ++attemptNo,
      ok: false,
      latencyMs: result.latencyMs,
      error: `${result.code}: ${result.message}`,
      fallbackUsed: i > 0,
    });
  }

  const last = [...attempts].reverse().find((a) => a.error && a.error !== "not_configured" && a.error !== "circuit_open");
  const allSkipped = attempts.every((a) => a.error === "not_configured" || a.error === "circuit_open");
  return {
    ok: false,
    attempts,
    error: last?.error ?? (allSkipped ? "no_healthy_tts_provider" : "all_providers_failed"),
  };
}
