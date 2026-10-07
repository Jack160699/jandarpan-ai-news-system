import { describe, expect, it, vi } from "vitest";
import { createGoogleStt, encodingForMime } from "@/lib/user-news/stt";

const audio = new Uint8Array([0x1a, 0x45, 0xdf, 0xa3, 1, 2, 3, 4]);
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

describe("encodingForMime", () => {
  it("maps what browsers record to Speech-to-Text encodings, and refuses what v1 cannot read", () => {
    expect(encodingForMime("audio/webm;codecs=opus")).toEqual({ encoding: "WEBM_OPUS" });
    expect(encodingForMime("video/webm")).toEqual({ encoding: "WEBM_OPUS" });
    expect(encodingForMime("audio/ogg")).toEqual({ encoding: "OGG_OPUS" });
    expect(encodingForMime("audio/wav")).toEqual({});
    expect(encodingForMime("audio/mpeg")).toBeNull();
    expect(encodingForMime("audio/mp4")).toBeNull(); // Safari
  });
});

describe("createGoogleStt", () => {
  const ok = (fetchImpl: typeof fetch) => createGoogleStt({ GOOGLE_CLOUD_PROJECT: "proj-1" }, { fetchImpl, getToken: async () => "tok" });

  it("sends the audio with the right language and encoding and returns the transcript", async () => {
    const fetchImpl = vi.fn(async () =>
      json({ results: [{ alternatives: [{ transcript: "रायपुर में हादसा हुआ", confidence: 0.9 }] }, { alternatives: [{ transcript: "तीन लोग घायल", confidence: 0.8 }] }], totalBilledTime: "15s" })
    ) as unknown as typeof fetch;
    const r = await ok(fetchImpl)({ bytes: audio, mime: "audio/webm;codecs=opus", language: "hi" });
    expect(r).toEqual({ ok: true, transcript: "रायपुर में हादसा हुआ तीन लोग घायल", confidence: 0.85, durationMs: 15000 });
    const call = (fetchImpl as unknown as { mock: { calls: Array<[string, RequestInit]> } }).mock.calls[0]!;
    expect(call[0]).toBe("https://speech.googleapis.com/v1/speech:recognize");
    const body = JSON.parse(String(call[1].body));
    expect(body.config).toMatchObject({ encoding: "WEBM_OPUS", languageCode: "hi-IN", enableAutomaticPunctuation: true });
    expect(Buffer.from(body.audio.content, "base64").equals(Buffer.from(audio))).toBe(true);
    expect((call[1].headers as Record<string, string>).authorization).toBe("Bearer tok");
    expect((call[1].headers as Record<string, string>)["x-goog-user-project"]).toBe("proj-1");
  });

  it("uses English (India) for English stories", async () => {
    const fetchImpl = vi.fn(async () => json({ results: [{ alternatives: [{ transcript: "two bikes collided" }] }] })) as unknown as typeof fetch;
    await ok(fetchImpl)({ bytes: audio, mime: "audio/ogg", language: "en" });
    const body = JSON.parse(String((fetchImpl as unknown as { mock: { calls: Array<[string, RequestInit]> } }).mock.calls[0]![1].body));
    expect(body.config).toMatchObject({ encoding: "OGG_OPUS", languageCode: "en-IN" });
  });

  it("reports silence honestly instead of inventing text", async () => {
    const r = await ok((async () => json({})) as unknown as typeof fetch)({ bytes: audio, mime: "audio/webm", language: "hi" });
    expect(r).toMatchObject({ ok: false, error: "no_speech" });
  });

  it("is 'unconfigured' with no credentials, without making any network call", async () => {
    const fetchImpl = vi.fn() as unknown as typeof fetch;
    const r = await createGoogleStt({}, { fetchImpl })({ bytes: audio, mime: "audio/webm", language: "hi" });
    expect(r).toMatchObject({ ok: false, error: "unconfigured" });
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("does not call the provider for a format it cannot read", async () => {
    const fetchImpl = vi.fn() as unknown as typeof fetch;
    const r = await createGoogleStt({}, { fetchImpl, getToken: async () => "t" })({ bytes: audio, mime: "audio/mp4", language: "hi" });
    expect(r).toMatchObject({ ok: false, error: "unsupported_audio" });
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("maps provider failures without leaking the provider's response body", async () => {
    const secretBody = { error: { message: "Cloud Speech-to-Text API has not been used in project 1234567890 before" } };
    const denied = await ok((async () => json(secretBody, 403)) as unknown as typeof fetch)({ bytes: audio, mime: "audio/webm", language: "hi" });
    expect(denied).toMatchObject({ ok: false, error: "unconfigured" });
    expect(JSON.stringify(denied)).not.toContain("1234567890");
    const bad = await ok((async () => json(secretBody, 400)) as unknown as typeof fetch)({ bytes: audio, mime: "audio/webm", language: "hi" });
    expect(bad).toMatchObject({ ok: false, error: "provider_error" });
    const down = await ok((async () => json({}, 503)) as unknown as typeof fetch)({ bytes: audio, mime: "audio/webm", language: "hi" });
    expect(down).toMatchObject({ ok: false, error: "provider_error" });
    const net = await ok((async () => {
      throw new Error("ECONNRESET");
    }) as unknown as typeof fetch)({ bytes: audio, mime: "audio/webm", language: "hi" });
    expect(net).toMatchObject({ ok: false, error: "provider_error" });
  });
});
