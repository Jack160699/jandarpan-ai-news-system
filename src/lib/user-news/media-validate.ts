/**
 * Upload validation for user-news media (landscape image + landscape video).
 *
 * Client-side checks are only a convenience: everything here re-checks from the BYTES the server actually received.
 *  - the declared MIME type must agree with the file's magic bytes (a renamed .exe / .html / .svg is rejected)
 *  - only an allow-list of formats is accepted; SVG, HTML, executables, archives and anything unknown are refused
 *  - hard size caps; hard duration cap for video
 *  - landscape only (news cards and the TV layout are 16:9-ish)
 * Pure functions: no I/O. Image re-encoding / thumbnails are in media-process.ts.
 */

export const IMAGE_MIME = ["image/jpeg", "image/png", "image/webp"] as const;
export const VIDEO_MIME = ["video/mp4", "video/webm"] as const;
export type MediaKind = "image" | "video";

export const MEDIA_LIMITS = {
  imageMaxBytes: 10 * 1024 * 1024,
  videoMaxBytes: 100 * 1024 * 1024,
  videoMaxDurationMs: 3 * 60 * 1000,
  imageMinWidth: 960,
  imageMinHeight: 540,
  videoMinWidth: 640,
  videoMinHeight: 360,
  /** width / height must be at least this (landscape) and at most MAX (not an ultra-wide banner). */
  minAspect: 1.2,
  maxAspect: 2.4,
  /** Maximum files per submission. */
  maxImages: 6,
  maxVideos: 1,
} as const;

export type Sniffed = { mime: string; kind: MediaKind } | null;

const startsWith = (b: Uint8Array, sig: number[], offset = 0) => sig.every((v, i) => b[offset + i] === v);
const ascii = (b: Uint8Array, from: number, to: number) => String.fromCharCode(...Array.from(b.slice(from, to)));

/** What the bytes say the file is. null = not an accepted media format. */
export function sniffMedia(bytes: Uint8Array): Sniffed {
  if (bytes.length < 12) return null;
  if (startsWith(bytes, [0xff, 0xd8, 0xff])) return { mime: "image/jpeg", kind: "image" };
  if (startsWith(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return { mime: "image/png", kind: "image" };
  if (ascii(bytes, 0, 4) === "RIFF" && ascii(bytes, 8, 12) === "WEBP") return { mime: "image/webp", kind: "image" };
  if (ascii(bytes, 4, 8) === "ftyp") {
    const brand = ascii(bytes, 8, 12);
    // MP4 family only. HEIC/AVIF/3GP and QuickTime brands are not accepted here.
    if (/^(isom|iso2|mp41|mp42|avc1|M4V |dash)/.test(brand)) return { mime: "video/mp4", kind: "video" };
    return null;
  }
  if (startsWith(bytes, [0x1a, 0x45, 0xdf, 0xa3])) return { mime: "video/webm", kind: "video" };
  return null;
}

export type MediaIssueCode =
  | "unsupported_type"
  | "mime_mismatch"
  | "too_large"
  | "empty"
  | "not_landscape"
  | "aspect_out_of_range"
  | "too_small"
  | "too_long"
  | "dimensions_unknown";

export type MediaCheck = { ok: true; kind: MediaKind; mime: string } | { ok: false; code: MediaIssueCode; message: string };

export function checkMediaBytes(input: { declaredMime: string | null | undefined; sizeBytes: number; head: Uint8Array }): MediaCheck {
  if (!Number.isFinite(input.sizeBytes) || input.sizeBytes <= 0) return { ok: false, code: "empty", message: "The file is empty." };
  const sniffed = sniffMedia(input.head);
  if (!sniffed) return { ok: false, code: "unsupported_type", message: "Only JPEG, PNG or WebP images and MP4 or WebM videos are accepted." };
  const declared = (input.declaredMime ?? "").toLowerCase().split(";")[0]!.trim();
  if (declared && declared !== sniffed.mime) {
    return { ok: false, code: "mime_mismatch", message: `The file says it is ${declared} but its contents are ${sniffed.mime}.` };
  }
  const max = sniffed.kind === "image" ? MEDIA_LIMITS.imageMaxBytes : MEDIA_LIMITS.videoMaxBytes;
  if (input.sizeBytes > max) {
    return { ok: false, code: "too_large", message: `The ${sniffed.kind} is larger than ${Math.round(max / 1024 / 1024)} MB.` };
  }
  return { ok: true, kind: sniffed.kind, mime: sniffed.mime };
}

export type DimensionCheck = { ok: true } | { ok: false; code: MediaIssueCode; message: string };

export function checkLandscape(kind: MediaKind, width: number | null | undefined, height: number | null | undefined): DimensionCheck {
  if (!width || !height || width <= 0 || height <= 0) return { ok: false, code: "dimensions_unknown", message: "Could not read the dimensions." };
  if (width <= height) return { ok: false, code: "not_landscape", message: "Use a landscape (wide) picture or video." };
  const aspect = width / height;
  if (aspect < MEDIA_LIMITS.minAspect || aspect > MEDIA_LIMITS.maxAspect) {
    return { ok: false, code: "aspect_out_of_range", message: "The shape is too square or too wide; use roughly 16:9 or 4:3 landscape." };
  }
  const [minW, minH] = kind === "image" ? [MEDIA_LIMITS.imageMinWidth, MEDIA_LIMITS.imageMinHeight] : [MEDIA_LIMITS.videoMinWidth, MEDIA_LIMITS.videoMinHeight];
  if (width < minW || height < minH) return { ok: false, code: "too_small", message: `The ${kind} must be at least ${minW}×${minH}.` };
  return { ok: true };
}

export function checkVideoDuration(durationMs: number | null | undefined): DimensionCheck {
  if (durationMs === null || durationMs === undefined || !Number.isFinite(durationMs) || durationMs <= 0) {
    return { ok: false, code: "dimensions_unknown", message: "Could not read the video length." };
  }
  if (durationMs > MEDIA_LIMITS.videoMaxDurationMs) return { ok: false, code: "too_long", message: "Videos can be at most 3 minutes long." };
  return { ok: true };
}

// ---------------------------------------------------------------------------------------------------------------------
// Image dimensions from the header (no decoder): PNG, JPEG, WebP.
// ---------------------------------------------------------------------------------------------------------------------

export function readImageDimensions(bytes: Uint8Array): { width: number; height: number } | null {
  const sniff = sniffMedia(bytes);
  if (!sniff || sniff.kind !== "image") return null;
  const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);

  if (sniff.mime === "image/png") {
    if (bytes.length < 24) return null;
    return { width: dv.getUint32(16), height: dv.getUint32(20) };
  }

  if (sniff.mime === "image/jpeg") {
    let i = 2;
    while (i + 9 < bytes.length) {
      if (bytes[i] !== 0xff) {
        i++;
        continue;
      }
      const marker = bytes[i + 1]!;
      if (marker === 0xd8 || marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) {
        i += 2;
        continue;
      }
      const len = dv.getUint16(i + 2);
      // SOF0..SOF15 except DHT (C4), JPG (C8), DAC (CC)
      if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
        return { height: dv.getUint16(i + 5), width: dv.getUint16(i + 7) };
      }
      i += 2 + len;
    }
    return null;
  }

  // WebP: VP8 (lossy), VP8L (lossless), VP8X (extended)
  const chunk = ascii(bytes, 12, 16);
  if (chunk === "VP8X" && bytes.length >= 30) {
    const w = 1 + (bytes[24]! | (bytes[25]! << 8) | (bytes[26]! << 16));
    const h = 1 + (bytes[27]! | (bytes[28]! << 8) | (bytes[29]! << 16));
    return { width: w, height: h };
  }
  if (chunk === "VP8 " && bytes.length >= 30) return { width: dv.getUint16(26, true) & 0x3fff, height: dv.getUint16(28, true) & 0x3fff };
  if (chunk === "VP8L" && bytes.length >= 25) {
    const b = bytes.slice(21, 25);
    return { width: 1 + (((b[1]! & 0x3f) << 8) | b[0]!), height: 1 + (((b[3]! & 0x0f) << 10) | (b[2]! << 2) | ((b[1]! & 0xc0) >> 6)) };
  }
  return null;
}

// ---------------------------------------------------------------------------------------------------------------------
// MP4 metadata (duration + display size) from the box structure. No decoding.
// ---------------------------------------------------------------------------------------------------------------------

export type Mp4Info = { durationMs: number | null; width: number | null; height: number | null };

/**
 * Walks ISO-BMFF boxes looking for moov/mvhd (duration) and moov/trak/tkhd (width x height as 16.16 fixed point).
 * Returns nulls when the moov box is not inside the bytes supplied (a non-"faststart" file whose index is at the end): the caller then
 * marks the video as needing out-of-band probing rather than guessing.
 */
export function readMp4Info(bytes: Uint8Array): Mp4Info {
  const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const info: Mp4Info = { durationMs: null, width: null, height: null };

  const walk = (start: number, end: number, depth: number) => {
    let pos = start;
    while (pos + 8 <= end && depth < 6) {
      let size = dv.getUint32(pos);
      const type = ascii(bytes, pos + 4, pos + 8);
      let header = 8;
      if (size === 1 && pos + 16 <= end) {
        size = Number(dv.getBigUint64(pos + 8));
        header = 16;
      } else if (size === 0) size = end - pos;
      if (size < header || pos + size > end + 0) {
        // a box cut off by the end of the supplied bytes: descend only if it is a container we still need
        if (type !== "moov" && type !== "trak" && type !== "mdia") return;
        size = end - pos;
      }
      const bodyStart = pos + header;
      const bodyEnd = Math.min(end, pos + size);
      if (type === "moov" || type === "trak") walk(bodyStart, bodyEnd, depth + 1);
      else if (type === "mvhd" && bodyEnd - bodyStart >= 20) {
        const version = bytes[bodyStart]!;
        const timescale = version === 1 ? dv.getUint32(bodyStart + 20) : dv.getUint32(bodyStart + 12);
        const duration = version === 1 ? Number(dv.getBigUint64(bodyStart + 24)) : dv.getUint32(bodyStart + 16);
        if (timescale > 0) info.durationMs = Math.round((duration / timescale) * 1000);
      } else if (type === "tkhd" && bodyEnd - bodyStart >= 84) {
        const version = bytes[bodyStart]!;
        const off = bodyStart + (version === 1 ? 88 : 76);
        if (off + 8 <= bodyEnd) {
          const w = dv.getUint32(off) / 65536;
          const h = dv.getUint32(off + 4) / 65536;
          // an audio track has 0x0; keep the first real video track
          if (w > 0 && h > 0 && info.width === null) {
            info.width = Math.round(w);
            info.height = Math.round(h);
          }
        }
      }
      pos += size;
    }
  };

  walk(0, bytes.length, 0);
  return info;
}

// ---------------------------------------------------------------------------------------------------------------------
// Voice notes
// ---------------------------------------------------------------------------------------------------------------------

export const AUDIO_MIME = ["audio/webm", "audio/ogg", "audio/wav", "audio/mpeg"] as const;
export const VOICE_LIMITS = { maxBytes: 10 * 1024 * 1024, maxDurationMs: 60_000 } as const;

/** What the bytes say a voice note is. Only formats Google Speech-to-Text accepts directly (WebM/Ogg Opus, WAV, MP3). */
export function sniffAudio(bytes: Uint8Array): { mime: (typeof AUDIO_MIME)[number] } | null {
  if (bytes.length < 12) return null;
  if (startsWith(bytes, [0x1a, 0x45, 0xdf, 0xa3])) return { mime: "audio/webm" };
  if (ascii(bytes, 0, 4) === "OggS") return { mime: "audio/ogg" };
  if (ascii(bytes, 0, 4) === "RIFF" && ascii(bytes, 8, 12) === "WAVE") return { mime: "audio/wav" };
  if (ascii(bytes, 0, 3) === "ID3" || (bytes[0] === 0xff && (bytes[1]! & 0xe0) === 0xe0)) return { mime: "audio/mpeg" };
  return null;
}

export function checkVoiceBytes(input: { declaredMime: string | null | undefined; sizeBytes: number; head: Uint8Array }): { ok: true; mime: string } | { ok: false; code: MediaIssueCode; message: string } {
  if (!Number.isFinite(input.sizeBytes) || input.sizeBytes <= 0) return { ok: false, code: "empty", message: "The recording is empty." };
  const sniffed = sniffAudio(input.head);
  if (!sniffed) return { ok: false, code: "unsupported_type", message: "Voice notes must be WebM, Ogg, WAV or MP3 audio." };
  const declared = (input.declaredMime ?? "").toLowerCase().split(";")[0]!.trim();
  // browsers label Opus-in-WebM audio as audio/webm and Opus-in-Ogg as audio/ogg; video/webm is what some record audio-only clips as
  const compatible = declared === "" || declared === sniffed.mime || (sniffed.mime === "audio/webm" && declared === "video/webm");
  if (!compatible) return { ok: false, code: "mime_mismatch", message: `The file says it is ${declared} but its contents are ${sniffed.mime}.` };
  if (input.sizeBytes > VOICE_LIMITS.maxBytes) return { ok: false, code: "too_large", message: "The recording is larger than 10 MB (about one minute)." };
  return { ok: true, mime: sniffed.mime };
}

/**
 * Many phone videos are not "faststart": the moov index (which holds duration and size) sits AFTER the media data. Given the LAST bytes of
 * the file, find the moov box and return it so readMp4Info can parse it. Returns null if it is not in the bytes supplied.
 */
export function findMoovBox(tail: Uint8Array): Uint8Array | null {
  for (let i = 4; i + 4 <= tail.length; i++) {
    if (tail[i] === 0x6d && tail[i + 1] === 0x6f && tail[i + 2] === 0x6f && tail[i + 3] === 0x76) {
      const dv = new DataView(tail.buffer, tail.byteOffset, tail.byteLength);
      const size = dv.getUint32(i - 4);
      if (size >= 16 && i - 4 + size <= tail.length) return tail.slice(i - 4, i - 4 + size);
    }
  }
  return null;
}

export function extensionForMime(mime: string): string {
  switch (mime) {
    case "image/jpeg": return "jpg";
    case "image/png": return "png";
    case "image/webp": return "webp";
    case "video/mp4": return "mp4";
    case "video/webm": return "webm";
    case "audio/webm": return "webm";
    case "audio/ogg": return "ogg";
    case "audio/wav": return "wav";
    case "audio/mpeg": return "mp3";
    default: return "bin";
  }
}
