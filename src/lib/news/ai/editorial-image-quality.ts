/**
 * Editorial image quality scoring + perceptual duplicate detection
 */

import sharp from "sharp";

export type ImageQualityReport = {
  score: number;
  passed: boolean;
  flags: string[];
  width: number;
  height: number;
  bytes: number;
  visualHash: string;
};

const MIN_WIDTH = 640;
const MIN_HEIGHT = 360;
const MIN_BYTES = 8_000;
const MIN_SCORE = 0.52;

/** Difference hash (dHash) for near-duplicate detection */
export async function computeVisualHash(buffer: Buffer): Promise<string> {
  const size = 9;
  const pixels = await sharp(buffer)
    .resize(size, size, { fit: "fill" })
    .grayscale()
    .raw()
    .toBuffer();

  let bits = "";
  for (let y = 0; y < size - 1; y++) {
    for (let x = 0; x < size - 1; x++) {
      const left = pixels[y * size + x];
      const right = pixels[y * size + x + 1];
      bits += left < right ? "1" : "0";
    }
  }

  const hex: string[] = [];
  for (let i = 0; i < bits.length; i += 4) {
    hex.push(parseInt(bits.slice(i, i + 4), 2).toString(16));
  }
  return hex.join("");
}

export function hammingDistance(a: string, b: string): number {
  if (a.length !== b.length) return 64;
  let dist = 0;
  for (let i = 0; i < a.length; i++) {
    const x = parseInt(a[i], 16) ^ parseInt(b[i], 16);
    dist += (x & 1) + ((x >> 1) & 1) + ((x >> 2) & 1) + ((x >> 3) & 1);
  }
  return dist;
}

export function isNearDuplicateVisual(hashA: string, hashB: string): boolean {
  return hammingDistance(hashA, hashB) <= 8;
}

export async function scoreImageBuffer(
  buffer: Buffer,
  options?: { minScore?: number }
): Promise<ImageQualityReport> {
  const minScore = options?.minScore ?? MIN_SCORE;
  const flags: string[] = [];
  let score = 0.5;

  const meta = await sharp(buffer).metadata();
  const width = meta.width ?? 0;
  const height = meta.height ?? 0;
  const bytes = buffer.length;

  if (width >= MIN_WIDTH) score += 0.15;
  else flags.push("low_width");

  if (height >= MIN_HEIGHT) score += 0.12;
  else flags.push("low_height");

  if (bytes >= MIN_BYTES) score += 0.1;
  else flags.push("tiny_file");

  const ratio = width / Math.max(height, 1);
  if (ratio >= 1.2 && ratio <= 2.2) score += 0.08;
  else flags.push("awkward_aspect");

  try {
    const stats = await sharp(buffer).stats();
    const avgStd =
      stats.channels.reduce((s, c) => s + (c.stdev ?? 0), 0) /
      stats.channels.length;
    if (avgStd > 25) score += 0.12;
    else flags.push("low_contrast");
    if (avgStd > 45) score += 0.05;
  } catch {
    flags.push("stats_unavailable");
  }

  const visualHash = await computeVisualHash(buffer);
  score = Math.max(0, Math.min(1, Math.round(score * 1000) / 1000));

  return {
    score,
    passed: score >= minScore && !flags.includes("tiny_file"),
    flags,
    width,
    height,
    bytes,
    visualHash,
  };
}
