/**
 * Speech-to-text for voice-note submissions (Google Cloud Speech-to-Text v1, synchronous recognition).
 *
 * Uses the SAME service-account credentials as the voice (TTS) system (GOOGLE_TTS_SERVICE_ACCOUNT_JSON), server-side only.
 * Requires the "Cloud Speech-to-Text API" to be ENABLED on the Google Cloud project: that is a one-time manual step (see the
 * founder checklist). Until it is, this returns an honest `unconfigured` / `provider_error`; it never fabricates a transcript.
 *
 * Limits of the synchronous API: audio up to ~60 s and 10 MB. WebM/Ogg Opus and WAV are supported directly; MP3 and Safari's
 * MP4/AAC recordings are not, and are reported as such (the author can type instead).
 */

import { getGoogleAccessToken, googleProjectId, googleTtsConfigured, GoogleAuthError } from "@/lib/voice/google-auth";
import type { SttFn, SttResult, UserNewsLanguage } from "@/lib/user-news/types";

const ENDPOINT = "https://speech.googleapis.com/v1/speech:recognize";
const LANG: Record<UserNewsLanguage, string> = { hi: "hi-IN", en: "en-IN" };

type Env = Record<string, string | undefined>;

export function encodingForMime(mime: string): { encoding?: string } | null {
  const m = mime.toLowerCase().split(";")[0]!.trim();
  if (m === "audio/webm" || m === "video/webm") return { encoding: "WEBM_OPUS" };
  if (m === "audio/ogg") return { encoding: "OGG_OPUS" };
  if (m === "audio/wav") return {}; // encoding/sample rate are read from the WAV header
  return null; // audio/mpeg and Safari's audio/mp4 are not supported by the v1 synchronous API
}

export function createGoogleStt(
  env: Env = process.env,
  deps: { fetchImpl?: typeof fetch; getToken?: () => Promise<string> } = {}
): SttFn {
  const fetchImpl = deps.fetchImpl ?? fetch;
  const getToken = deps.getToken ?? (() => getGoogleAccessToken(env));

  return async ({ bytes, mime, language }): Promise<SttResult> => {
    if (!googleTtsConfigured(env) && !deps.getToken) {
      return { ok: false, error: "unconfigured", message: "Voice notes are not available yet. Please type your report instead." };
    }
    const enc = encodingForMime(mime);
    if (!enc) {
      return { ok: false, error: "unsupported_audio", message: "This recording format is not supported. Record again in Chrome, Edge or Firefox, or type your report." };
    }

    let token: string;
    try {
      token = await getToken();
    } catch (e) {
      const unconfigured = e instanceof GoogleAuthError && e.kind === "not_configured";
      return { ok: false, error: unconfigured ? "unconfigured" : "provider_error", message: unconfigured ? "Voice notes are not available yet. Please type your report instead." : "Could not reach the speech service. Please try again." };
    }

    const project = googleProjectId(env);
    let res: Response;
    try {
      res = await fetchImpl(ENDPOINT, {
        method: "POST",
        headers: { "content-type": "application/json", authorization: `Bearer ${token}`, ...(project ? { "x-goog-user-project": project } : {}) },
        body: JSON.stringify({
          config: { ...enc, languageCode: LANG[language], enableAutomaticPunctuation: true, maxAlternatives: 1 },
          audio: { content: Buffer.from(bytes).toString("base64") },
        }),
        signal: AbortSignal.timeout(45_000),
      });
    } catch {
      return { ok: false, error: "provider_error", message: "The speech service did not answer. Please try again." };
    }

    if (!res.ok) {
      // Never echo the provider's body: it can contain project identifiers. Status only.
      if (res.status === 400) return { ok: false, error: "provider_error", message: "The recording could not be read. It may be longer than one minute." };
      if (res.status === 403 || res.status === 401) return { ok: false, error: "unconfigured", message: "Voice notes are not available yet. Please type your report instead." };
      return { ok: false, error: "provider_error", message: "The speech service is unavailable right now. Please try again." };
    }

    const json = (await res.json().catch(() => null)) as { results?: Array<{ alternatives?: Array<{ transcript?: string; confidence?: number }> }>; totalBilledTime?: string } | null;
    const parts = (json?.results ?? []).map((r) => r.alternatives?.[0]).filter((a): a is { transcript?: string; confidence?: number } => Boolean(a?.transcript?.trim()));
    if (parts.length === 0) return { ok: false, error: "no_speech", message: "We could not hear anything in the recording. Please try again closer to the microphone." };

    const transcript = parts.map((p) => p.transcript!.trim()).join(" ");
    const confs = parts.map((p) => p.confidence).filter((c): c is number => typeof c === "number");
    const billed = json?.totalBilledTime ? Math.round(parseFloat(json.totalBilledTime) * 1000) : null;
    return { ok: true, transcript, confidence: confs.length ? Math.round((confs.reduce((a, b) => a + b, 0) / confs.length) * 100) / 100 : null, durationMs: Number.isFinite(billed as number) ? billed : null };
  };
}
