import { describe, expect, it, vi } from "vitest";
import { BUCKET, clientPrecheck, pickRecorderMime, uploadMedia, type UploadApi, type UploadClient } from "@/features/user-news/upload";
import { USER_NEWS_STRINGS } from "@/features/user-news/strings";

const file = (type: string, size = 1000) => new Blob([new Uint8Array(size)], { type });

function makeDeps(opts: { slot?: unknown; upload?: { error: { message: string } | null }; finalize?: unknown } = {}) {
  const uploadToSignedUrl = vi.fn(async () => opts.upload ?? { error: null });
  const from = vi.fn(() => ({ uploadToSignedUrl }));
  const client: UploadClient = { storage: { from } };
  const api: UploadApi = {
    mediaSlot: vi.fn(async () => (opts.slot ?? { ok: true, data: { mediaId: "m1", upload: { signedUrl: "https://s/u", token: "tok", path: "u/s/f.jpg" } } }) as never),
    finalize: vi.fn(async () => (opts.finalize ?? { ok: true, data: { media: { id: "m1", kind: "image", status: "ready", width: 1600, height: 900, durationMs: null, needsProbe: false } } }) as never),
  };
  return { client, api, uploadToSignedUrl, from };
}

describe("uploadMedia", () => {
  it("reserves a slot, uploads DIRECTLY to the private bucket with the signed token, then asks the server to validate", async () => {
    const d = makeDeps();
    const f = file("image/jpeg");
    const out = await uploadMedia(d, "sub-1", "image", f);
    expect(out).toEqual({ ok: true, mediaId: "m1", status: "ready", needsProbe: false, width: 1600, height: 900 });
    expect(d.api.mediaSlot).toHaveBeenCalledWith("sub-1", { kind: "image", mime: "image/jpeg", sizeBytes: 1000 });
    expect(d.from).toHaveBeenCalledWith(BUCKET);
    expect(d.uploadToSignedUrl).toHaveBeenCalledWith("u/s/f.jpg", "tok", f, { contentType: "image/jpeg" });
    expect(d.api.finalize).toHaveBeenCalledWith("m1");
  });

  it("strips codec parameters from the declared type", async () => {
    const d = makeDeps();
    await uploadMedia(d, "sub-1", "voice", file("audio/webm;codecs=opus"));
    expect(d.api.mediaSlot).toHaveBeenCalledWith("sub-1", { kind: "voice", mime: "audio/webm", sizeBytes: 1000 });
  });

  it("stops at the first failing stage and says which one", async () => {
    const slotFail = makeDeps({ slot: { ok: false, status: 403, error: "not_verified", message: "Verify your identity to publish news." } });
    expect(await uploadMedia(slotFail, "s", "image", file("image/png"))).toEqual({ ok: false, stage: "slot", message: "Verify your identity to publish news." });
    expect(slotFail.uploadToSignedUrl).not.toHaveBeenCalled();

    const upFail = makeDeps({ upload: { error: { message: "network" } } });
    expect(await uploadMedia(upFail, "s", "image", file("image/png"))).toMatchObject({ ok: false, stage: "upload", mediaId: "m1" });
    expect(upFail.api.finalize).not.toHaveBeenCalled();

    const finFail = makeDeps({ finalize: { ok: false, status: 422, error: "not_landscape", message: "Use a landscape (wide) picture or video." } });
    expect(await uploadMedia(finFail, "s", "image", file("image/png"))).toMatchObject({ ok: false, stage: "finalize", message: "Use a landscape (wide) picture or video." });
  });
});

describe("clientPrecheck is a convenience, never the authority", () => {
  it("accepts supported types and rejects others and oversize files", () => {
    expect(clientPrecheck("image", { type: "image/jpeg", size: 1000 })).toBeNull();
    expect(clientPrecheck("image", { type: "image/svg+xml", size: 1000 })).toMatch(/JPEG, PNG or WebP/);
    expect(clientPrecheck("image", { type: "image/png", size: 11 * 1024 * 1024 })).toMatch(/10 MB/);
    expect(clientPrecheck("video", { type: "video/mp4", size: 1000 })).toBeNull();
    expect(clientPrecheck("video", { type: "video/quicktime", size: 1000 })).toMatch(/MP4 or WebM/);
    expect(clientPrecheck("voice", { type: "audio/webm;codecs=opus", size: 1000 })).toBeNull();
    expect(clientPrecheck("image", { type: "image/png", size: 0 })).toMatch(/empty/);
  });
});

describe("pickRecorderMime", () => {
  it("prefers WebM Opus, falls back to Ogg, and refuses a browser that can only record AAC (Safari)", () => {
    expect(pickRecorderMime((m) => m === "audio/webm;codecs=opus")).toBe("audio/webm;codecs=opus");
    expect(pickRecorderMime((m) => m === "audio/ogg;codecs=opus")).toBe("audio/ogg;codecs=opus");
    expect(pickRecorderMime((m) => m === "audio/mp4")).toBeNull();
    expect(pickRecorderMime(undefined)).toBeNull();
  });
});

describe("strings", () => {
  it("every Hindi key has an English twin and vice versa, and none are empty", () => {
    const hi = Object.keys(USER_NEWS_STRINGS.hi).sort();
    const en = Object.keys(USER_NEWS_STRINGS.en).sort();
    expect(hi).toEqual(en);
    for (const k of hi) {
      expect((USER_NEWS_STRINGS.hi as Record<string, string>)[k]!.trim().length).toBeGreaterThan(0);
      expect((USER_NEWS_STRINGS.en as Record<string, string>)[k]!.trim().length).toBeGreaterThan(0);
    }
  });

  it("the unavailable message matches the compliance wording exactly", () => {
    expect(USER_NEWS_STRINGS.en.verificationUnavailable).toBe("Identity verification unavailable until verification service is configured.");
    expect(USER_NEWS_STRINGS.en.verifyToPost).toBe("Verify your identity to publish news");
    expect(USER_NEWS_STRINGS.en.aiBanner).toBe("AI-assisted draft. Please verify the facts before publishing.");
    expect(USER_NEWS_STRINGS.en.revenueNotActive).toBe("Advertising revenue sharing not active");
  });
});
