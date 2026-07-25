/**
 * Validate editorial image upload payloads before storage write.
 */

export type UploadPayloadValidation = {
  ok: boolean;
  reason?: string;
  bytes?: number;
};

const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;
const ALLOWED_TYPES = new Set([
  "image/webp",
  "image/jpeg",
  "image/png",
  "image/avif",
]);

export function assertUploadPayload(input: {
  buffer: Buffer | Uint8Array;
  contentType: string;
}): UploadPayloadValidation {
  const bytes = input.buffer.byteLength;
  if (bytes <= 0) {
    return { ok: false, reason: "empty_buffer", bytes };
  }
  if (bytes > MAX_UPLOAD_BYTES) {
    return { ok: false, reason: "payload_too_large", bytes };
  }
  if (!ALLOWED_TYPES.has(input.contentType)) {
    return { ok: false, reason: "unsupported_content_type", bytes };
  }
  return { ok: true, bytes };
}
