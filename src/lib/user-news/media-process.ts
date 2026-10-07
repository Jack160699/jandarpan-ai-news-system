/**
 * Server-side image processing for user-news uploads (sharp).
 *
 * The original upload is kept as received (for moderation evidence), but readers only ever see a re-encoded derivative:
 *   - re-encoding drops anything that is not pixels (embedded scripts, polyglot payloads, trailing data)
 *   - EXIF is stripped: phone photos carry GPS coordinates, device serials and timestamps that identify the author
 *   - the image is auto-oriented, bounded to 1920 px wide, and written as WebP
 *   - a 640 px thumbnail is produced for cards and the moderation queue
 * limitInputPixels protects against decompression bombs (a tiny file that decodes to gigapixels).
 *
 * Video: no ffmpeg is available on the serverless runtime, so video is validated from its container bytes (media-validate.ts) and its
 * poster/transcode is left to an out-of-band processor; the author's landscape image is used as the story's hero image.
 */

import sharp from "sharp";
import { MEDIA_LIMITS } from "@/lib/user-news/media-validate";

export const MAX_INPUT_PIXELS = 50_000_000; // 50 MP
const OPTIMIZED_WIDTH = 1920;
const THUMB_WIDTH = 640;

export type ProcessedImage = {
  width: number;
  height: number;
  optimized: { bytes: Buffer; width: number; height: number; mime: "image/webp" };
  thumbnail: { bytes: Buffer; width: number; height: number; mime: "image/webp" };
  /** True when the source carried EXIF/GPS data that was discarded. */
  hadMetadata: boolean;
};

export class ImageProcessingError extends Error {
  constructor(readonly code: "unreadable" | "too_many_pixels", message: string) {
    super(message);
  }
}

export async function processImage(input: Uint8Array | Buffer): Promise<ProcessedImage> {
  const source = Buffer.isBuffer(input) ? input : Buffer.from(input);
  let meta: sharp.Metadata;
  try {
    meta = await sharp(source, { limitInputPixels: MAX_INPUT_PIXELS, failOn: "error" }).metadata();
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (/pixel limit/i.test(msg)) throw new ImageProcessingError("too_many_pixels", "The image has too many pixels.");
    throw new ImageProcessingError("unreadable", "The image could not be read.");
  }
  if (!meta.width || !meta.height) throw new ImageProcessingError("unreadable", "The image has no readable dimensions.");

  // EXIF orientation 5-8 swaps width and height once applied.
  const rotated = meta.orientation !== undefined && meta.orientation >= 5;
  const width = rotated ? meta.height : meta.width;
  const height = rotated ? meta.width : meta.height;

  const pipeline = () => sharp(source, { limitInputPixels: MAX_INPUT_PIXELS, failOn: "error" }).rotate(); // rotate() applies EXIF orientation
  try {
    const optimized = await pipeline()
      .resize({ width: OPTIMIZED_WIDTH, withoutEnlargement: true })
      .webp({ quality: 82 })
      .toBuffer({ resolveWithObject: true });
    const thumbnail = await pipeline().resize({ width: THUMB_WIDTH, withoutEnlargement: true }).webp({ quality: 74 }).toBuffer({ resolveWithObject: true });
    return {
      width,
      height,
      optimized: { bytes: optimized.data, width: optimized.info.width, height: optimized.info.height, mime: "image/webp" },
      thumbnail: { bytes: thumbnail.data, width: thumbnail.info.width, height: thumbnail.info.height, mime: "image/webp" },
      hadMetadata: Boolean(meta.exif || meta.icc || meta.xmp),
    };
  } catch {
    throw new ImageProcessingError("unreadable", "The image could not be processed.");
  }
}

/** Cheap guard before decoding: reject obviously oversized inputs without touching the decoder. */
export function exceedsImageBudget(sizeBytes: number): boolean {
  return sizeBytes > MEDIA_LIMITS.imageMaxBytes;
}
