import sharp from "sharp";
import { describe, expect, it } from "vitest";
import {
  MEDIA_LIMITS,
  checkLandscape,
  checkMediaBytes,
  checkVideoDuration,
  readImageDimensions,
  readMp4Info,
  sniffMedia,
} from "@/lib/user-news/media-validate";

async function img(format: "png" | "jpeg" | "webp", width: number, height: number): Promise<Uint8Array> {
  const buf = await sharp({ create: { width, height, channels: 3, background: { r: 30, g: 120, b: 200 } } })
    [format]()
    .toBuffer();
  return new Uint8Array(buf);
}

// ---- hand-built MP4: ftyp + moov{ mvhd, trak{ tkhd } } ----
const u32 = (n: number) => [(n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255];
const str = (s: string) => Array.from(s).map((c) => c.charCodeAt(0));
const box = (type: string, body: number[]) => [...u32(8 + body.length), ...str(type), ...body];

function mp4(opts: { durationMs: number; width: number; height: number; moovFirst?: boolean }): Uint8Array {
  const timescale = 1000;
  const mvhdBody = [0, 0, 0, 0, ...u32(0), ...u32(0), ...u32(timescale), ...u32(opts.durationMs), ...new Array(80).fill(0)];
  const tkhdBody = [0, 0, 0, 7, ...u32(0), ...u32(0), ...u32(1), ...u32(0), ...u32(opts.durationMs), ...new Array(8).fill(0), ...new Array(44).fill(0), ...u32(opts.width * 65536), ...u32(opts.height * 65536)];
  const moov = box("moov", [...box("mvhd", mvhdBody), ...box("trak", box("tkhd", tkhdBody))]);
  const ftyp = box("ftyp", [...str("isom"), ...u32(512), ...str("isomiso2")]);
  const mdat = box("mdat", new Array(64).fill(7));
  return new Uint8Array(opts.moovFirst === false ? [...ftyp, ...mdat, ...moov] : [...ftyp, ...moov, ...mdat]);
}

describe("sniffMedia: the bytes decide, not the filename", () => {
  it("recognises real JPEG, PNG and WebP files", async () => {
    expect(sniffMedia(await img("jpeg", 64, 64))).toEqual({ mime: "image/jpeg", kind: "image" });
    expect(sniffMedia(await img("png", 64, 64))).toEqual({ mime: "image/png", kind: "image" });
    expect(sniffMedia(await img("webp", 64, 64))).toEqual({ mime: "image/webp", kind: "image" });
  });

  it("recognises MP4 and WebM", () => {
    expect(sniffMedia(mp4({ durationMs: 1000, width: 1280, height: 720 }))).toEqual({ mime: "video/mp4", kind: "video" });
    expect(sniffMedia(new Uint8Array([0x1a, 0x45, 0xdf, 0xa3, 0, 0, 0, 0, 0, 0, 0, 0]))).toEqual({ mime: "video/webm", kind: "video" });
  });

  it.each([
    ["an SVG", "<svg xmlns='http://www.w3.org/2000/svg'><script>alert(1)</script></svg>"],
    ["HTML", "<!doctype html><html><script>alert(1)</script></html>"],
    ["a Windows executable", "MZ\u0090\u0000\u0003\u0000\u0000\u0000\u0004\u0000\u0000\u0000ÿÿ"],
    ["a ZIP archive", "PK\u0003\u0004\u0014\u0000\u0000\u0000\u0008\u0000\u0000\u0000"],
    ["a PDF", "%PDF-1.7\n%âãÏÓ\n"],
    ["a shell script", "#!/bin/sh\nrm -rf /tmp/x\n"],
  ])("rejects %s", (_name, text) => {
    expect(sniffMedia(new TextEncoder().encode(text.padEnd(32, " ")))).toBeNull();
  });

  it("rejects a HEIC / QuickTime brand even though it has an ftyp box", () => {
    expect(sniffMedia(new Uint8Array([...u32(24), ...str("ftyp"), ...str("heic"), ...u32(0), ...str("mif1heic")]))).toBeNull();
  });
});

describe("checkMediaBytes", () => {
  it("accepts a genuine image whose declared type matches", async () => {
    const head = await img("png", 1280, 720);
    expect(checkMediaBytes({ declaredMime: "image/png", sizeBytes: head.length, head })).toEqual({ ok: true, kind: "image", mime: "image/png" });
  });

  it("rejects a file whose declared type disagrees with its contents (renamed file)", async () => {
    const head = await img("png", 1280, 720);
    expect(checkMediaBytes({ declaredMime: "image/jpeg", sizeBytes: head.length, head })).toMatchObject({ ok: false, code: "mime_mismatch" });
  });

  it("rejects empty, unsupported and oversized files", async () => {
    const head = await img("jpeg", 1280, 720);
    expect(checkMediaBytes({ declaredMime: "image/jpeg", sizeBytes: 0, head })).toMatchObject({ ok: false, code: "empty" });
    expect(checkMediaBytes({ declaredMime: "image/svg+xml", sizeBytes: 100, head: new TextEncoder().encode("<svg></svg>".padEnd(20, " ")) })).toMatchObject({ ok: false, code: "unsupported_type" });
    expect(checkMediaBytes({ declaredMime: "image/jpeg", sizeBytes: MEDIA_LIMITS.imageMaxBytes + 1, head })).toMatchObject({ ok: false, code: "too_large" });
    const video = mp4({ durationMs: 5000, width: 1280, height: 720 });
    expect(checkMediaBytes({ declaredMime: "video/mp4", sizeBytes: MEDIA_LIMITS.videoMaxBytes + 1, head: video })).toMatchObject({ ok: false, code: "too_large" });
    expect(checkMediaBytes({ declaredMime: "video/mp4", sizeBytes: 5_000_000, head: video })).toMatchObject({ ok: true, kind: "video" });
  });
});

describe("readImageDimensions agrees with the real decoder", () => {
  it.each([
    ["png", 1280, 720],
    ["jpeg", 1920, 1080],
    ["webp", 1024, 576],
    ["png", 600, 900],
  ] as const)("%s %ix%i", async (fmt, w, h) => {
    const bytes = await img(fmt, w, h);
    const meta = await sharp(bytes).metadata();
    expect({ width: meta.width, height: meta.height }).toEqual({ width: w, height: h });
    expect(readImageDimensions(bytes)).toEqual({ width: w, height: h });
  });

  it("returns null for non-images", () => {
    expect(readImageDimensions(new TextEncoder().encode("hello world, this is not an image".padEnd(32, " ")))).toBeNull();
  });
});

describe("readMp4Info", () => {
  it("reads duration and display size from the moov box", () => {
    expect(readMp4Info(mp4({ durationMs: 45_000, width: 1920, height: 1080 }))).toEqual({ durationMs: 45_000, width: 1920, height: 1080 });
  });

  it("returns nulls (never a guess) when the moov index is not in the bytes supplied", () => {
    const full = mp4({ durationMs: 45_000, width: 1920, height: 1080, moovFirst: false });
    const headOnly = full.slice(0, 60); // ftyp + part of mdat: the index sits after the media data
    expect(readMp4Info(headOnly)).toEqual({ durationMs: null, width: null, height: null });
    // given the whole file, it is found at the end too
    expect(readMp4Info(full)).toEqual({ durationMs: 45_000, width: 1920, height: 1080 });
  });
});

describe("landscape and duration rules", () => {
  it("accepts 16:9 and 4:3 landscape", () => {
    expect(checkLandscape("image", 1280, 720)).toEqual({ ok: true });
    expect(checkLandscape("image", 1600, 1200)).toEqual({ ok: true });
    expect(checkLandscape("video", 1920, 1080)).toEqual({ ok: true });
  });

  it("rejects portrait, square, ultra-wide, tiny and unreadable media", () => {
    expect(checkLandscape("image", 720, 1280)).toMatchObject({ ok: false, code: "not_landscape" });
    expect(checkLandscape("image", 1000, 1000)).toMatchObject({ ok: false, code: "not_landscape" });
    expect(checkLandscape("image", 2800, 700)).toMatchObject({ ok: false, code: "aspect_out_of_range" });
    expect(checkLandscape("image", 640, 360)).toMatchObject({ ok: false, code: "too_small" });
    expect(checkLandscape("video", 480, 270)).toMatchObject({ ok: false, code: "too_small" });
    expect(checkLandscape("image", null, null)).toMatchObject({ ok: false, code: "dimensions_unknown" });
    expect(checkLandscape("image", 0, 100)).toMatchObject({ ok: false, code: "dimensions_unknown" });
  });

  it("caps video length at three minutes and refuses an unknown length", () => {
    expect(checkVideoDuration(60_000)).toEqual({ ok: true });
    expect(checkVideoDuration(180_000)).toEqual({ ok: true });
    expect(checkVideoDuration(180_001)).toMatchObject({ ok: false, code: "too_long" });
    expect(checkVideoDuration(null)).toMatchObject({ ok: false, code: "dimensions_unknown" });
    expect(checkVideoDuration(0)).toMatchObject({ ok: false });
  });
});

import { AUDIO_MIME, VOICE_LIMITS, checkVoiceBytes, extensionForMime, findMoovBox, sniffAudio } from "@/lib/user-news/media-validate";

describe("voice notes", () => {
  const webm = new Uint8Array([0x1a, 0x45, 0xdf, 0xa3, 0, 0, 0, 0, 0, 0, 0, 0]);
  const ogg = new Uint8Array([...str("OggS"), 0, 0, 0, 0, 0, 0, 0, 0]);
  const wav = new Uint8Array([...str("RIFF"), 0, 0, 0, 0, ...str("WAVE")]);
  const mp3 = new Uint8Array([...str("ID3"), 4, 0, 0, 0, 0, 0, 0, 0, 0]);

  it("recognises WebM, Ogg, WAV and MP3 audio by their bytes", () => {
    expect(sniffAudio(webm)?.mime).toBe("audio/webm");
    expect(sniffAudio(ogg)?.mime).toBe("audio/ogg");
    expect(sniffAudio(wav)?.mime).toBe("audio/wav");
    expect(sniffAudio(mp3)?.mime).toBe("audio/mpeg");
    expect([...AUDIO_MIME]).toHaveLength(4);
  });

  it("does not accept video, images, scripts or arbitrary data as a voice note", async () => {
    expect(sniffAudio(mp4({ durationMs: 1000, width: 640, height: 360 }))).toBeNull();
    expect(sniffAudio(await img("png", 64, 64))).toBeNull();
    expect(sniffAudio(new TextEncoder().encode("#!/bin/sh\nrm -rf /\n".padEnd(32, " ")))).toBeNull();
  });

  it("validates declared type, size and emptiness", () => {
    expect(checkVoiceBytes({ declaredMime: "audio/webm;codecs=opus", sizeBytes: 50_000, head: webm })).toEqual({ ok: true, mime: "audio/webm" });
    expect(checkVoiceBytes({ declaredMime: "video/webm", sizeBytes: 50_000, head: webm })).toMatchObject({ ok: true }); // audio-only clips are often labelled video/webm
    expect(checkVoiceBytes({ declaredMime: "audio/wav", sizeBytes: 50_000, head: webm })).toMatchObject({ ok: false, code: "mime_mismatch" });
    expect(checkVoiceBytes({ declaredMime: "audio/webm", sizeBytes: VOICE_LIMITS.maxBytes + 1, head: webm })).toMatchObject({ ok: false, code: "too_large" });
    expect(checkVoiceBytes({ declaredMime: "audio/webm", sizeBytes: 0, head: webm })).toMatchObject({ ok: false, code: "empty" });
  });
});

describe("findMoovBox: videos whose index is at the end of the file", () => {
  it("finds the moov box in the last bytes and lets readMp4Info parse it", () => {
    const full = mp4({ durationMs: 30_000, width: 1920, height: 1080, moovFirst: false });
    const tail = full.slice(40); // starts mid-file, inside the media data
    const moov = findMoovBox(tail);
    expect(moov).not.toBeNull();
    expect(readMp4Info(moov!)).toEqual({ durationMs: 30_000, width: 1920, height: 1080 });
  });

  it("returns null when there is no moov in the bytes", () => {
    expect(findMoovBox(new Uint8Array(64).fill(7))).toBeNull();
  });

  it("maps MIME types to safe extensions and never trusts a client filename", () => {
    expect(extensionForMime("image/jpeg")).toBe("jpg");
    expect(extensionForMime("video/mp4")).toBe("mp4");
    expect(extensionForMime("text/html")).toBe("bin");
  });
});
