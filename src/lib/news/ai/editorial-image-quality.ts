/**
 * Editorial image quality scoring + perceptual duplicate detection
 * Enhanced with artifact, text, face, and context relevance checks
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
const MIN_SCORE = 0.58;

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

/** Heuristic text artifact detection via high-contrast edge density in center band */
async function detectPossibleTextArtifacts(buffer: Buffer): Promise<boolean> {
  try {
    const { data, info } = await sharp(buffer)
      .resize(160, 90, { fit: "fill" })
      .grayscale()
      .raw()
      .toBuffer({ resolveWithObject: true });

    const w = info.width;
    const h = info.height;
    let edgeCount = 0;
    let total = 0;

    for (let y = 1; y < h - 1; y++) {
      for (let x = 1; x < w - 1; x++) {
        if (y < h * 0.15 || y > h * 0.85) continue;
        const idx = y * w + x;
        const v = data[idx];
        const dx = Math.abs(v - data[idx - 1]);
        const dy = Math.abs(v - data[idx - w]);
        if (dx + dy > 80) edgeCount++;
        total++;
      }
    }

    return total > 0 && edgeCount / total > 0.22;
  } catch {
    return false;
  }
}

/** Detect oversaturation / neon artifacts */
async function detectOversaturation(buffer: Buffer): Promise<boolean> {
  try {
    const stats = await sharp(buffer).stats();
    const maxMean = Math.max(...stats.channels.map((c) => c.mean ?? 0));
    const avgStd =
      stats.channels.reduce((s, c) => s + (c.stdev ?? 0), 0) /
      stats.channels.length;
    return maxMean > 220 && avgStd > 55;
  } catch {
    return false;
  }
}

/** Simple skin-tone cluster heuristic for face detection */
async function detectPossibleFace(buffer: Buffer): Promise<boolean> {
  try {
    const { data, info } = await sharp(buffer)
      .resize(64, 36, { fit: "fill" })
      .removeAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });

    let skinPixels = 0;
    const total = info.width * info.height;

    for (let i = 0; i < data.length; i += 3) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      if (r > 95 && g > 40 && b > 20 && r > g && r > b && Math.abs(r - g) > 15) {
        skinPixels++;
      }
    }

    return skinPixels / total > 0.08;
  } catch {
    return false;
  }
}

function scoreContextRelevance(
  contextKeywords: string[] | undefined,
  promptKeywords: string[] | undefined
): { score: number; flag?: string } {
  if (!contextKeywords?.length || !promptKeywords?.length) {
    return { score: 0.05 };
  }

  const ctxSet = new Set(contextKeywords.map((k) => k.toLowerCase()));
  const overlap = promptKeywords.filter((k) => ctxSet.has(k.toLowerCase())).length;
  const ratio = overlap / Math.max(contextKeywords.length, 1);

  if (ratio < 0.1) return { score: 0, flag: "low_context_relevance" };
  if (ratio < 0.25) return { score: 0.04, flag: "low_context_relevance" };
  return { score: 0.1 };
}

export async function scoreImageBuffer(
  buffer: Buffer,
  options?: {
    minScore?: number;
    contextKeywords?: string[];
    promptText?: string;
  }
): Promise<ImageQualityReport> {
  const minScore = options?.minScore ?? MIN_SCORE;
  const flags: string[] = [];
  let score = 0.45;

  const meta = await sharp(buffer).metadata();
  const width = meta.width ?? 0;
  const height = meta.height ?? 0;
  const bytes = buffer.length;

  if (width >= MIN_WIDTH) score += 0.12;
  else flags.push("low_width");

  if (height >= MIN_HEIGHT) score += 0.1;
  else flags.push("low_height");

  if (bytes >= MIN_BYTES) score += 0.08;
  else flags.push("tiny_file");

  const ratio = width / Math.max(height, 1);
  if (ratio >= 1.2 && ratio <= 2.2) score += 0.08;
  else flags.push("awkward_aspect");

  try {
    const stats = await sharp(buffer).stats();
    const avgStd =
      stats.channels.reduce((s, c) => s + (c.stdev ?? 0), 0) /
      stats.channels.length;
    if (avgStd > 28) score += 0.1;
    else flags.push("low_contrast");
    if (avgStd > 48) score += 0.04;
    if (avgStd < 12) flags.push("low_edge_clarity");
  } catch {
    flags.push("stats_unavailable");
  }

  const [hasText, oversaturated, hasFace] = await Promise.all([
    detectPossibleTextArtifacts(buffer),
    detectOversaturation(buffer),
    detectPossibleFace(buffer),
  ]);

  if (hasText) {
    flags.push("possible_text_artifacts");
    score -= 0.15;
  }
  if (oversaturated) {
    flags.push("oversaturated");
    score -= 0.08;
  }
  if (hasFace) {
    flags.push("possible_face");
    score -= 0.12;
  }

  if (options?.contextKeywords && options?.promptText) {
    const promptKeywords = options.promptText
      .toLowerCase()
      .replace(/[^\w\s\u0900-\u097F-]/g, " ")
      .split(/\s+/)
      .filter((w) => w.length > 3);
    const relevance = scoreContextRelevance(options.contextKeywords, promptKeywords);
    score += relevance.score;
    if (relevance.flag) flags.push(relevance.flag);
  }

  const visualHash = await computeVisualHash(buffer);
  score = Math.max(0, Math.min(1, Math.round(score * 1000) / 1000));

  const hardReject = flags.some((f) =>
    ["possible_text_artifacts", "possible_face", "tiny_file"].includes(f)
  );

  return {
    score,
    passed: score >= minScore && !hardReject,
    flags,
    width,
    height,
    bytes,
    visualHash,
  };
}
