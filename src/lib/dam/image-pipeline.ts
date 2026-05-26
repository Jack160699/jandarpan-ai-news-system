/**
 * Image compression, responsive variants, watermarking
 */

import sharp from "sharp";
import { optimizeCdnUrl } from "@/lib/news/images/cdn";

export type ProcessedImage = {
  original: Buffer;
  mimeType: string;
  width: number;
  height: number;
  variants: Array<{
    key: string;
    buffer: Buffer;
    width: number;
    height: number;
    mimeType: string;
  }>;
  metadata: Record<string, unknown>;
};

const VARIANTS: Array<{ key: string; width: number }> = [
  { key: "thumb", width: 160 },
  { key: "sm", width: 480 },
  { key: "md", width: 960 },
  { key: "lg", width: 1600 },
];

export async function processImageBuffer(
  input: Buffer,
  options?: { watermarkText?: string }
): Promise<ProcessedImage> {
  const base = sharp(input).rotate();
  const meta = await base.metadata();

  let pipeline = base;
  if (options?.watermarkText) {
    const svg = watermarkSvg(options.watermarkText, meta.width ?? 1200);
    pipeline = pipeline.composite([
      { input: Buffer.from(svg), gravity: "southeast" },
    ]);
  }

  const originalWebp = await pipeline
    .webp({ quality: 82, effort: 4 })
    .toBuffer();
  const originalMeta = await sharp(originalWebp).metadata();

  const width = originalMeta.width ?? 0;
  const height = originalMeta.height ?? 0;

  const variants: ProcessedImage["variants"] = [];

  for (const spec of VARIANTS) {
    if (width > 0 && spec.width >= width) continue;
    const resized = await sharp(originalWebp)
      .resize({ width: spec.width, withoutEnlargement: true })
      .webp({ quality: 78 })
      .toBuffer();
    const vMeta = await sharp(resized).metadata();
    variants.push({
      key: spec.key,
      buffer: resized,
      width: vMeta.width ?? spec.width,
      height: vMeta.height ?? 0,
      mimeType: "image/webp",
    });
  }

  return {
    original: originalWebp,
    mimeType: "image/webp",
    width,
    height,
    variants,
    metadata: {
      format: meta.format,
      space: meta.space,
      hasAlpha: meta.hasAlpha,
      density: meta.density,
      exifPresent: Boolean(meta.exif),
    },
  };
}

export function cdnUrlForVariant(publicUrl: string, variantKey: string): string {
  const aspect =
    variantKey === "thumb" ? "1:1" : variantKey === "sm" ? "4:3" : "16:9";
  const width =
    variantKey === "thumb"
      ? 160
      : variantKey === "sm"
        ? 480
        : variantKey === "md"
          ? 960
          : 1280;
  return optimizeCdnUrl(publicUrl, { width, aspect: aspect as "16:9" });
}

function watermarkSvg(text: string, imgWidth: number): string {
  const fontSize = Math.max(14, Math.round(imgWidth * 0.022));
  const safe = text.replace(/[<>&'"]/g, "");
  return `<svg width="${imgWidth}" height="${fontSize + 24}">
    <text x="12" y="${fontSize + 8}" font-family="sans-serif" font-size="${fontSize}" fill="rgba(255,255,255,0.75)">${safe}</text>
  </svg>`;
}
