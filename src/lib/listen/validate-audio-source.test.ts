import { describe, expect, it } from "vitest";
import {
  isWellFormedAudioUrl,
  looksLikeExpiredSignedUrl,
  mediaErrorToCode,
  validateAudioSource,
} from "./validate-audio-source";

describe("validateAudioSource", () => {
  it("accepts same-origin voice stream paths", () => {
    const result = validateAudioSource({
      url: "/api/shorts/voice/raipur-flood-1",
    });
    expect(result).toEqual({
      ok: true,
      url: "/api/shorts/voice/raipur-flood-1",
    });
  });

  it("rejects missing source", () => {
    expect(validateAudioSource({ url: null }).ok).toBe(false);
    expect(validateAudioSource({ url: "  " }).ok).toBe(false);
    const r = validateAudioSource({ url: "" });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.code).toBe("missing_url");
  });

  it("rejects malformed URLs", () => {
    expect(isWellFormedAudioUrl("not a url")).toBe(false);
    expect(isWellFormedAudioUrl("//evil.example/x")).toBe(false);
    const r = validateAudioSource({ url: "ftp://files/audio.mp3" });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.code).toBe("malformed_url");
  });

  it("rejects failed generation without network", () => {
    const r = validateAudioSource({
      url: "/api/shorts/voice/x",
      generationStatus: "failed",
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.code).toBe("generation_failed");
  });

  it("rejects unavailable generation as missing", () => {
    const r = validateAudioSource({
      url: "/api/shorts/voice/x",
      generationStatus: "unavailable",
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.code).toBe("missing_url");
  });

  it("rejects zero-byte assets", () => {
    const r = validateAudioSource({
      url: "https://cdn.example/a.mp3",
      byteLength: 0,
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.code).toBe("zero_byte");
  });

  it("rejects unsupported MIME types", () => {
    const r = validateAudioSource({
      url: "https://cdn.example/a.bin",
      mimeType: "application/octet-stream",
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.code).toBe("unsupported_mime");
  });

  it("accepts audio/mpeg", () => {
    const r = validateAudioSource({
      url: "https://cdn.example/a.mp3",
      mimeType: "audio/mpeg",
      byteLength: 2048,
    });
    expect(r.ok).toBe(true);
  });

  it("detects expired signed URL JWT exp", () => {
    const payload = Buffer.from(
      JSON.stringify({ exp: Math.floor(Date.now() / 1000) - 60 })
    ).toString("base64url");
    const token = `hdr.${payload}.sig`;
    const url = `https://storage.example/object?token=${token}`;
    expect(looksLikeExpiredSignedUrl(url)).toBe(true);
    const r = validateAudioSource({ url });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.code).toBe("expired");
  });

  it("maps media errors safely", () => {
    expect(mediaErrorToCode({ code: 2 })).toBe("inaccessible");
    expect(mediaErrorToCode({ code: 4 })).toBe("unsupported_mime");
    expect(mediaErrorToCode(null)).toBe("playback_failed");
  });
});
