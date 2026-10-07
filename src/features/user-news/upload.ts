/**
 * Browser upload orchestration: reserve a slot -> upload DIRECTLY to private storage with the signed token -> ask the server to validate
 * the stored bytes. Large files never pass through a server function. Dependencies are injected so this is testable without a browser.
 */

import type { ApiResult, FinalizeResponse, SlotResponse } from "@/features/user-news/api";

export const BUCKET = "user-news-media";

export type UploadClient = {
  storage: {
    from: (bucket: string) => {
      uploadToSignedUrl: (path: string, token: string, file: Blob, opts?: { contentType?: string }) => Promise<{ error: { message: string } | null }>;
    };
  };
};

export type UploadApi = {
  mediaSlot: (submissionId: string, body: { kind: "image" | "video" | "voice"; mime: string; sizeBytes: number }) => Promise<ApiResult<SlotResponse>>;
  finalize: (mediaId: string) => Promise<ApiResult<FinalizeResponse>>;
};

export type UploadOutcome =
  | { ok: true; mediaId: string; status: string; needsProbe: boolean; width: number | null; height: number | null }
  | { ok: false; stage: "slot" | "upload" | "finalize"; message: string; mediaId?: string };

/** Quick, friendly client-side checks. The server re-checks everything from the bytes: these only save the user a round trip. */
export function clientPrecheck(kind: "image" | "video" | "voice", file: { type: string; size: number }): string | null {
  const limits = { image: 10 * 1024 * 1024, video: 100 * 1024 * 1024, voice: 10 * 1024 * 1024 } as const;
  const okType = kind === "image" ? /^image\/(jpeg|png|webp)$/.test(file.type) : kind === "video" ? /^video\/(mp4|webm)$/.test(file.type) : /^(audio|video)\/(webm|ogg|wav|mpeg)/.test(file.type);
  if (!okType) return kind === "image" ? "Use a JPEG, PNG or WebP photo." : kind === "video" ? "Use an MP4 or WebM video." : "This recording format is not supported.";
  if (file.size <= 0) return "The file is empty.";
  if (file.size > limits[kind]) return `The file is larger than ${Math.round(limits[kind] / 1024 / 1024)} MB.`;
  return null;
}

export async function uploadMedia(deps: { client: UploadClient; api: UploadApi }, submissionId: string, kind: "image" | "video" | "voice", file: Blob & { type: string }): Promise<UploadOutcome> {
  const mime = file.type.split(";")[0]!.trim() || "application/octet-stream";
  const slot = await deps.api.mediaSlot(submissionId, { kind, mime, sizeBytes: file.size });
  if (!slot.ok) return { ok: false, stage: "slot", message: slot.message || slot.error };

  const up = await deps.client.storage.from(BUCKET).uploadToSignedUrl(slot.data.upload.path, slot.data.upload.token, file, { contentType: file.type || mime });
  if (up.error) return { ok: false, stage: "upload", message: up.error.message, mediaId: slot.data.mediaId };

  const done = await deps.api.finalize(slot.data.mediaId);
  if (!done.ok) return { ok: false, stage: "finalize", message: done.message || done.error, mediaId: slot.data.mediaId };
  const m = done.data.media;
  return { ok: true, mediaId: m.id, status: m.status, needsProbe: m.needsProbe, width: m.width, height: m.height };
}

/** Which recording format this browser can produce that Speech-to-Text accepts. null = voice notes unsupported here. */
export function pickRecorderMime(isTypeSupported: ((mime: string) => boolean) | undefined): string | null {
  if (!isTypeSupported) return null;
  for (const m of ["audio/webm;codecs=opus", "audio/webm", "audio/ogg;codecs=opus", "audio/ogg"]) if (isTypeSupported(m)) return m;
  return null; // Safari records audio/mp4 (AAC), which the speech service cannot read
}
