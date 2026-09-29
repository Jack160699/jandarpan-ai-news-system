import { beforeEach, describe, expect, it, vi } from "vitest";
import { resetProviderHealthForTests } from "@/lib/ai/providers/health";
import { buildSilentMp3, parseMp3 } from "@/lib/voice/mp3";
import { validateGeneratedAudio } from "@/lib/voice/validate-audio";
import {
  classifyTtsHttpFailure,
  createChirp3HdProvider,
  createGeminiTtsProvider,
  estimateTtsCostUsd,
  type TtsProvider,
} from "@/lib/voice/providers";
import { buildNewsScript } from "@/lib/voice/script/news-script";
import { synthesizeWithFallback } from "@/lib/voice/synthesize";
import { resetGoogleTokenCache } from "@/lib/voice/google-auth";
import { buildGeminiStylePrompt, resolveChirpVoice, resolveGeminiVoice, CHIRP_RATE } from "@/lib/voice/voice-config";
import { DELIVERY_STYLES } from "@/lib/voice/types";
import { generateKeyPairSync } from "node:crypto";

const { privateKey } = generateKeyPairSync("rsa", { modulusLength: 2048, privateKeyEncoding: { type: "pkcs8", format: "pem" }, publicKeyEncoding: { type: "spki", format: "pem" } });
const SA = JSON.stringify({ client_email: "tts@jd.iam.gserviceaccount.com", private_key: privateKey, project_id: "jd-proj" });

beforeEach(() => {
  resetProviderHealthForTests();
  resetGoogleTokenCache();
  vi.unstubAllEnvs();
  vi.stubEnv("GOOGLE_TTS_SERVICE_ACCOUNT_JSON", SA);
});

const script = buildNewsScript({
  language: "hi",
  kind: "tv",
  headline: "रायपुर के पंडरी इलाके में होर्डिंग पोल से लटका मिला युवक का शव",
  summary: "पुलिस ने शव बरामद कर मामला दर्ज कर लिया है।",
});

describe("mp3 parser + audio validation", () => {
  const ten = buildSilentMp3(10);

  it("computes exact duration from frames", () => {
    const info = parseMp3(ten)!;
    expect(info.durationMs).toBeGreaterThan(9_900);
    expect(info.durationMs).toBeLessThan(10_200);
    expect(info.validRatio).toBeGreaterThan(0.99);
    expect(parseMp3(new Uint8Array(5000))).toBeNull();
  });

  it("accepts good audio", () => {
    const v = validateGeneratedAudio({ audio: ten, script: script.text, language: "hi-IN", expectedSeconds: 10 });
    expect(v.ok).toBe(true);
    expect(v.durationMs).toBeGreaterThan(9_000);
  });

  it("rejects empty, junk, mis-timed and corrupted audio", () => {
    expect(validateGeneratedAudio({ audio: new Uint8Array(0), script: script.text, language: "hi-IN", expectedSeconds: 10 }).failures[0]).toMatch(/audio_missing/);
    expect(validateGeneratedAudio({ audio: new Uint8Array(20_000).fill(7), script: script.text, language: "hi-IN", expectedSeconds: 10 }).failures).toContain("audio_not_parseable_mp3");
    const tooLong = validateGeneratedAudio({ audio: buildSilentMp3(60), script: script.text, language: "hi-IN", expectedSeconds: 10 });
    expect(tooLong.failures.join()).toMatch(/duration_out_of_range/);
    const tooShort = validateGeneratedAudio({ audio: buildSilentMp3(3.2), script: script.text, language: "hi-IN", expectedSeconds: 30 });
    expect(tooShort.failures.join()).toMatch(/duration_out_of_range/);
    const corrupted = new Uint8Array(ten);
    for (let i = 300; i < corrupted.length; i += 1) if (i % 3 !== 0) corrupted[i] = 0x11; // wreck most frame headers
    const c = validateGeneratedAudio({ audio: corrupted, script: script.text, language: "hi-IN", expectedSeconds: 10 });
    expect(c.ok).toBe(false);
  });

  it("flags a script in the wrong language script", () => {
    const v = validateGeneratedAudio({ audio: ten, script: "This is an English script.", language: "hi-IN", expectedSeconds: 10 });
    expect(v.failures.join()).toMatch(/script_language_mismatch/);
  });
});

describe("voice configuration", () => {
  it("has a delivery direction for all eight styles and both languages", () => {
    for (const style of DELIVERY_STYLES) {
      for (const lang of ["hi-IN", "en-IN"] as const) {
        const p = buildGeminiStylePrompt(lang, style, "radio");
        expect(p).toContain("professional Indian newsreader");
        expect(p).toMatch(/not sound robotic/i);
        expect(p).toMatch(/Do not imitate any specific real person/);
      }
      expect(CHIRP_RATE[style]).toBeGreaterThan(0.85);
      expect(CHIRP_RATE[style]).toBeLessThan(1.15);
    }
  });

  it("uses the urgent voice for breaking/urgency and honours env overrides", () => {
    expect(resolveGeminiVoice("hi-IN", "breaking_news")).toBe("Kore");
    expect(resolveGeminiVoice("hi-IN", "standard_bulletin")).toBe("Charon");
    expect(resolveChirpVoice("en-IN", "urgency")).toBe("en-IN-Chirp3-HD-Kore");
    expect(resolveGeminiVoice("en-IN", "standard_bulletin", { VOICE_GEMINI_EN_STANDARD: "Orus" })).toBe("Orus");
  });

  it("estimates cost per provider", () => {
    expect(estimateTtsCostUsd("chirp3_hd", 1_000_000, 0, {})).toBeCloseTo(30);
    expect(estimateTtsCostUsd("gemini_tts", 400, 20, {})).toBeGreaterThan(0);
  });
});

function okBody(bytes = buildSilentMp3(8)) {
  return JSON.stringify({ audioContent: Buffer.from(bytes).toString("base64") });
}

function routedFetch(handler: (url: string, body: any) => Response) {
  return vi.fn().mockImplementation(async (url: string, init?: RequestInit) => {
    if (String(url).includes("oauth2.googleapis.com")) {
      return new Response(JSON.stringify({ access_token: "ya29.test", expires_in: 3600 }), { status: 200 });
    }
    return handler(String(url), init?.body ? JSON.parse(String(init.body)) : {});
  });
}

describe("Google TTS providers", () => {
  it("Gemini-TTS sends prompt + text + model + voice + MP3 and returns audio", async () => {
    let seen: any;
    const fetchMock = routedFetch((_u, body) => {
      seen = body;
      return new Response(okBody(), { status: 200 });
    });
    const p = createGeminiTtsProvider(fetchMock as never);
    const r = await p.synthesize({ text: script.text, language: "hi-IN", style: "breaking_news", kind: "tv" });
    expect(r.ok).toBe(true);
    expect(seen.input.text).toBe(script.text);
    expect(seen.input.prompt).toMatch(/BREAKING NEWS/);
    expect(seen.voice).toMatchObject({ languageCode: "hi-IN", name: "Kore", modelName: "gemini-2.5-flash-tts" });
    expect(seen.audioConfig.audioEncoding).toBe("MP3");
    const call = fetchMock.mock.calls.find((c) => String(c[0]).includes("texttospeech"))!;
    expect((call[1] as RequestInit).headers).toMatchObject({ Authorization: "Bearer ya29.test", "x-goog-user-project": "jd-proj" });
  });

  it("Chirp 3 HD sends markup with pause tags, a Chirp voice and a speaking rate", async () => {
    let seen: any;
    const fetchMock = routedFetch((_u, body) => {
      seen = body;
      return new Response(okBody(), { status: 200 });
    });
    const p = createChirp3HdProvider(fetchMock as never);
    const r = await p.synthesize({ text: "a [pause] b", markup: "a [pause] b", language: "en-IN", style: "serious_report", kind: "tv" });
    expect(r.ok).toBe(true);
    expect(seen.input.markup).toContain("[pause]");
    expect(seen.voice.name).toBe("en-IN-Chirp3-HD-Charon");
    expect(seen.audioConfig.speakingRate).toBeCloseTo(0.94);
  });

  it.each([
    [401, "{}", "unauthorized"],
    [403, "{}", "unauthorized"],
    [429, "{}", "quota"],
    [404, "{}", "model_unavailable"],
    [400, JSON.stringify({ error: { message: "The model gemini-x is not found" } }), "model_unavailable"],
    [400, JSON.stringify({ error: { message: "input too long" } }), "invalid_request"],
    [503, "{}", "upstream"],
  ])("classifies HTTP %i as %s", (status, body, code) => {
    expect(classifyTtsHttpFailure("gemini_tts", status, body, 10).code).toBe(code);
  });

  it("reports empty audio and auth failures without throwing", async () => {
    const empty = routedFetch(() => new Response(JSON.stringify({}), { status: 200 }));
    expect((await createGeminiTtsProvider(empty as never).synthesize({ text: "x", language: "hi-IN", style: "standard_bulletin", kind: "tv" }))).toMatchObject({ ok: false, code: "empty_audio" });
    vi.stubEnv("GOOGLE_TTS_SERVICE_ACCOUNT_JSON", "");
    const r = await createGeminiTtsProvider(empty as never).synthesize({ text: "x", language: "hi-IN", style: "standard_bulletin", kind: "tv" });
    expect(r).toMatchObject({ ok: false, code: "not_configured" });
  });
});

describe("failover", () => {
  function fakeProvider(id: "gemini_tts" | "chirp3_hd", behaviour: "ok" | "quota" | "model" | "timeout"): TtsProvider & { calls: number } {
    const p = {
      calls: 0,
      id,
      isConfigured: () => true,
      async synthesize() {
        p.calls++;
        if (behaviour === "ok") {
          return { ok: true as const, provider: id, model: id === "gemini_tts" ? "gemini-2.5-flash-tts" : "chirp-3-hd", voiceName: "v", audio: buildSilentMp3(6), mimeType: "audio/mpeg" as const, latencyMs: 120, characters: 100, requestId: null };
        }
        const code = behaviour === "quota" ? "quota" : behaviour === "model" ? "model_unavailable" : "timeout";
        return { ok: false as const, provider: id, code: code as never, message: behaviour, latencyMs: behaviour === "timeout" ? 60_000 : 30 };
      },
    };
    return p;
  }

  it("uses the primary when healthy", async () => {
    const g = fakeProvider("gemini_tts", "ok");
    const c = fakeProvider("chirp3_hd", "ok");
    const r = await synthesizeWithFallback({ script, language: "hi-IN", style: "standard_bulletin", providers: [g, c] });
    expect(r.ok && r.result.provider).toBe("gemini_tts");
    expect(r.ok && r.fallbackUsed).toBe(false);
    expect(c.calls).toBe(0);
  });

  it("fails over on quota / model errors and records every attempt", async () => {
    for (const bad of ["quota", "model"] as const) {
      resetProviderHealthForTests();
      const g = fakeProvider("gemini_tts", bad);
      const c = fakeProvider("chirp3_hd", "ok");
      const r = await synthesizeWithFallback({ script, language: "hi-IN", style: "breaking_news", providers: [g, c] });
      expect(r.ok).toBe(true);
      if (r.ok) {
        expect(r.result.provider).toBe("chirp3_hd");
        expect(r.fallbackUsed).toBe(true);
        expect(r.attempts.map((a) => [a.provider, a.ok, a.fallbackUsed])).toEqual([["gemini_tts", false, false], ["chirp3_hd", true, true]]);
      }
    }
  });

  it("opens the circuit: a dead primary is not re-probed on the next articles", async () => {
    const g = fakeProvider("gemini_tts", "model");
    const c = fakeProvider("chirp3_hd", "ok");
    for (let i = 0; i < 4; i++) await synthesizeWithFallback({ script, language: "hi-IN", style: "standard_bulletin", providers: [g, c] });
    expect(g.calls).toBe(1);
    expect(c.calls).toBe(4);
  });

  it("returns a structured failure (never throws) when every provider fails", async () => {
    const r = await synthesizeWithFallback({
      script,
      language: "en-IN",
      style: "standard_bulletin",
      providers: [fakeProvider("gemini_tts", "timeout"), fakeProvider("chirp3_hd", "quota")],
    });
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.attempts).toHaveLength(2);
      expect(r.error).toMatch(/quota|timeout/);
    }
  });
});
