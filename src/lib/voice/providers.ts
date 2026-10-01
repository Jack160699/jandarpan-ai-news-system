/**
 * Google Cloud TTS providers behind one interface, executed server-side only.
 *
 *   gemini_tts   Gemini-TTS (primary)  — natural-language style prompt controls delivery
 *   chirp3_hd    Chirp 3 HD (fallback) — pause tags + speaking rate
 *
 * Both call texttospeech.googleapis.com/v1/text:synthesize with a service-account access token.
 * Failures are classified so the circuit breaker can fail over correctly.
 */

import { getGoogleAccessToken, GoogleAuthError, googleProjectId, googleTtsConfigured } from "@/lib/voice/google-auth";
import {
  buildGeminiStylePrompt,
  CHIRP_RATE,
  geminiModel,
  resolveChirpVoice,
  resolveGeminiVoice,
} from "@/lib/voice/voice-config";
import type { ScriptKind, TtsFailure, TtsProviderId, TtsRequest, TtsResult } from "@/lib/voice/types";

const ENDPOINT = "https://texttospeech.googleapis.com/v1/text:synthesize";
const DEFAULT_TIMEOUT_MS = 60_000;

export type TtsProvider = {
  id: TtsProviderId;
  isConfigured(): boolean;
  synthesize(req: TtsRequest & { kind: ScriptKind; markup?: string }): Promise<TtsResult>;
};

export function classifyTtsHttpFailure(
  provider: TtsProviderId,
  status: number,
  body: string,
  latencyMs: number
): TtsFailure {
  let message = `HTTP ${status}`;
  try {
    const j = JSON.parse(body) as { error?: { message?: string; status?: string } };
    message = (j.error?.message ?? message).slice(0, 240);
  } catch {
    /* keep default */
  }
  const lower = message.toLowerCase();
  const base = { ok: false as const, provider, message, httpStatus: status, latencyMs };
  if (status === 401 || status === 403) return { ...base, code: "unauthorized" };
  if (status === 429 || /quota|rate limit|resource_exhausted/.test(lower)) return { ...base, code: "quota" };
  if (status === 404 || (status === 400 && /model|voice/.test(lower) && /(not found|not supported|unavailable|unknown|invalid|does not exist)/.test(lower))) {
    return { ...base, code: "model_unavailable" };
  }
  if (status === 400) return { ...base, code: "invalid_request" };
  if (status >= 500) return { ...base, code: "upstream" };
  return { ...base, code: "invalid_request" };
}

async function callSynthesize(
  provider: TtsProviderId,
  model: string,
  voiceName: string,
  payload: Record<string, unknown>,
  req: TtsRequest,
  fetchImpl: typeof fetch
): Promise<TtsResult> {
  const started = Date.now();
  const fail = (code: TtsFailure["code"], message: string, httpStatus?: number): TtsFailure => ({
    ok: false,
    provider,
    code,
    message,
    httpStatus,
    latencyMs: Date.now() - started,
  });

  let token: string;
  try {
    token = await getGoogleAccessToken(process.env, fetchImpl);
  } catch (err) {
    if (err instanceof GoogleAuthError) {
      return fail(err.kind === "not_configured" ? "not_configured" : err.kind === "network" ? "network" : "unauthorized", err.message);
    }
    return fail("network", "token acquisition failed");
  }

  const project = googleProjectId();
  try {
    const res = await fetchImpl(ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "content-type": "application/json",
        ...(project ? { "x-goog-user-project": project } : {}),
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(req.timeoutMs ?? DEFAULT_TIMEOUT_MS),
    });
    const text = await res.text();
    if (!res.ok) return classifyTtsHttpFailure(provider, res.status, text, Date.now() - started);

    let audioContent: string | undefined;
    try {
      audioContent = (JSON.parse(text) as { audioContent?: string }).audioContent;
    } catch {
      return fail("upstream", "non-JSON response from TTS", res.status);
    }
    if (!audioContent) return fail("empty_audio", "TTS returned no audioContent", res.status);
    const audio = new Uint8Array(Buffer.from(audioContent, "base64"));
    if (!audio.byteLength) return fail("empty_audio", "TTS audioContent decoded to 0 bytes", res.status);

    return {
      ok: true,
      provider,
      model,
      voiceName,
      audio,
      mimeType: "audio/mpeg",
      latencyMs: Date.now() - started,
      characters: req.text.length,
      requestId: res.headers.get("x-goog-request-id") ?? res.headers.get("x-request-id"),
    };
  } catch (err) {
    if (err instanceof Error && (err.name === "TimeoutError" || err.name === "AbortError")) {
      return fail("timeout", `no response within ${req.timeoutMs ?? DEFAULT_TIMEOUT_MS}ms`);
    }
    return fail("network", err instanceof Error ? err.message.slice(0, 200) : "network error");
  }
}

export function createGeminiTtsProvider(fetchImpl: typeof fetch = fetch): TtsProvider {
  return {
    id: "gemini_tts",
    isConfigured: () => googleTtsConfigured(),
    async synthesize(req) {
      const model = geminiModel();
      const voiceName = req.voiceName ?? resolveGeminiVoice(req.language, req.style);
      const payload = {
        input: { prompt: buildGeminiStylePrompt(req.language, req.style, req.kind), text: req.text },
        voice: { languageCode: req.language, name: voiceName, modelName: model },
        audioConfig: { audioEncoding: "MP3" },
      };
      return callSynthesize("gemini_tts", model, voiceName, payload, req, fetchImpl);
    },
  };
}

export function createChirp3HdProvider(fetchImpl: typeof fetch = fetch): TtsProvider {
  return {
    id: "chirp3_hd",
    isConfigured: () => googleTtsConfigured(),
    async synthesize(req) {
      const voiceName = req.voiceName ?? resolveChirpVoice(req.language, req.style);
      const payload = {
        input: { markup: req.markup ?? req.text },
        voice: { languageCode: req.language, name: voiceName },
        audioConfig: { audioEncoding: "MP3", speakingRate: CHIRP_RATE[req.style] },
      };
      return callSynthesize("chirp3_hd", "chirp-3-hd", voiceName, payload, req, fetchImpl);
    },
  };
}

/** Cost estimate in USD (env-tunable; label as an estimate wherever displayed). */
export function estimateTtsCostUsd(
  provider: TtsProviderId,
  characters: number,
  audioSeconds: number,
  env: Record<string, string | undefined> = process.env
): number {
  const num = (k: string, d: number) => {
    const v = Number(env[k]);
    return Number.isFinite(v) && v >= 0 ? v : d;
  };
  if (provider === "chirp3_hd") {
    return (characters / 1_000_000) * num("TTS_COST_CHIRP3_PER_M_CHARS", 30);
  }
  const inTokens = characters / 4;
  const outTokens = audioSeconds * 25;
  return (inTokens / 1_000_000) * num("TTS_COST_GEMINI_IN_PER_M_TOKENS", 0.5) + (outTokens / 1_000_000) * num("TTS_COST_GEMINI_OUT_PER_M_TOKENS", 10);
}
