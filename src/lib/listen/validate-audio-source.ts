/**
 * Safe client-side audio source validation.
 * Never triggers TTS generation — sync checks only (no network probe of voice API).
 */

import type { PlayerErrorCode } from "./player-state";

export type AudioSourceInput = {
  url?: string | null;
  /** Optional generation / voice job status from metadata. */
  generationStatus?: "ready" | "pending" | "failed" | "unavailable" | null;
  /** Declared MIME when known (e.g. audio/mpeg). */
  mimeType?: string | null;
  /** Content length when known from a prior successful response. */
  byteLength?: number | null;
};

export type AudioSourceValidation =
  | { ok: true; url: string }
  | { ok: false; code: PlayerErrorCode; reason: string };

const SUPPORTED_AUDIO_MIME = new Set([
  "audio/mpeg",
  "audio/mp3",
  "audio/mp4",
  "audio/aac",
  "audio/wav",
  "audio/ogg",
  "audio/webm",
]);

/**
 * Relative same-origin paths (e.g. /api/shorts/voice/slug) and absolute http(s) URLs.
 */
export function isWellFormedAudioUrl(url: string): boolean {
  const trimmed = url.trim();
  if (!trimmed) return false;
  if (trimmed.startsWith("/")) {
    // Reject protocol-relative and junk
    if (trimmed.startsWith("//")) return false;
    try {
      // Validate as path on a dummy origin
      const parsed = new URL(trimmed, "https://jandarpan.local");
      return parsed.pathname.length > 1;
    } catch {
      return false;
    }
  }
  try {
    const parsed = new URL(trimmed);
    return parsed.protocol === "https:" || parsed.protocol === "http:";
  } catch {
    return false;
  }
}

export function looksLikeExpiredSignedUrl(url: string, nowMs = Date.now()): boolean {
  try {
    const absolute = url.startsWith("http")
      ? new URL(url)
      : new URL(url, "https://jandarpan.local");
    const token = absolute.searchParams.get("token");
    // Supabase-style: token is JWT — decode exp without verifying signature
    if (token && token.split(".").length === 3) {
      const payload = token.split(".")[1];
      const json = JSON.parse(
        atob(payload.replace(/-/g, "+").replace(/_/g, "/"))
      ) as { exp?: number };
      if (typeof json.exp === "number" && json.exp * 1000 < nowMs) {
        return true;
      }
    }
    const expires = absolute.searchParams.get("X-Amz-Expires");
    const date = absolute.searchParams.get("X-Amz-Date");
    if (expires && date && /^\d{8}T\d{6}Z$/.test(date)) {
      const y = Number(date.slice(0, 4));
      const mo = Number(date.slice(4, 6)) - 1;
      const d = Number(date.slice(6, 8));
      const h = Number(date.slice(9, 11));
      const mi = Number(date.slice(11, 13));
      const s = Number(date.slice(13, 15));
      const start = Date.UTC(y, mo, d, h, mi, s);
      const ttlSec = Number(expires);
      if (Number.isFinite(ttlSec) && start + ttlSec * 1000 < nowMs) {
        return true;
      }
    }
  } catch {
    // ignore parse errors — not treated as expired
  }
  return false;
}

export function validateAudioSource(
  input: AudioSourceInput
): AudioSourceValidation {
  if (
    input.generationStatus === "failed" ||
    input.generationStatus === "unavailable"
  ) {
    return {
      ok: false,
      code:
        input.generationStatus === "failed"
          ? "generation_failed"
          : "missing_url",
      reason: `generation:${input.generationStatus}`,
    };
  }

  const raw = input.url?.trim() ?? "";
  if (!raw) {
    return { ok: false, code: "missing_url", reason: "empty" };
  }

  if (!isWellFormedAudioUrl(raw)) {
    return { ok: false, code: "malformed_url", reason: "parse" };
  }

  if (looksLikeExpiredSignedUrl(raw)) {
    return { ok: false, code: "expired", reason: "signed_expired" };
  }

  if (
    typeof input.byteLength === "number" &&
    Number.isFinite(input.byteLength) &&
    input.byteLength <= 0
  ) {
    return { ok: false, code: "zero_byte", reason: "byteLength" };
  }

  if (input.mimeType) {
    const mime = input.mimeType.split(";")[0]?.trim().toLowerCase() ?? "";
    if (
      mime &&
      !mime.startsWith("audio/") &&
      !SUPPORTED_AUDIO_MIME.has(mime)
    ) {
      return { ok: false, code: "unsupported_mime", reason: mime };
    }
  }

  return { ok: true, url: raw };
}

/** Map HTMLMediaElement error codes to safe PlayerErrorCode. */
export function mediaErrorToCode(
  mediaError: { code?: number } | null | undefined
): PlayerErrorCode {
  if (!mediaError || typeof mediaError.code !== "number") {
    return "playback_failed";
  }
  // MEDIA_ERR_* numeric codes (avoid referencing MediaError in Node tests)
  switch (mediaError.code) {
    case 1: // ABORTED
      return "playback_failed";
    case 2: // NETWORK
      return "inaccessible";
    case 3: // DECODE
      return "unsupported_mime";
    case 4: // SRC_NOT_SUPPORTED
      return "unsupported_mime";
    default:
      return "playback_failed";
  }
}
