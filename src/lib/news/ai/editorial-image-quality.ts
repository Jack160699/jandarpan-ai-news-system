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

const FACE_ANALYSIS_WIDTH = 64;
const FACE_ANALYSIS_HEIGHT = 36;
/** Jan Darpan brand saffron #E8952D */
const BRAND_SAFFRON = { r: 232, g: 149, b: 45 };
/** Minimum contiguous skin-like cluster in face zone (64×36 grid) */
const MIN_FACE_CLUSTER_PIXELS = 120;
/** Cluster must fill at least this fraction of its bounding box (rejects scattered pixels) */
const MIN_CLUSTER_DENSITY = 0.38;
/** Cluster bounding box must occupy at least this fraction of face-zone area */
const MIN_CLUSTER_ZONE_COVERAGE = 0.04;

type Rgb = { r: number; g: number; b: number };

function rgbHue(r: number, g: number, b: number): number {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const delta = max - min;
  if (delta < 1) return -1;

  let hue = 0;
  if (max === r) hue = ((g - b) / delta) % 6;
  else if (max === g) hue = (b - r) / delta + 2;
  else hue = (r - g) / delta + 4;
  return ((hue * 60) + 360) % 360;
}

function rgbSaturation(r: number, g: number, b: number): number {
  const max = Math.max(r, g, b);
  if (max <= 0) return 0;
  return (max - Math.min(r, g, b)) / max;
}

/** Exclude brand saffron / warm editorial accent oranges from skin detection */
function isBrandSaffronPixel(r: number, g: number, b: number): boolean {
  const dr = Math.abs(r - BRAND_SAFFRON.r);
  const dg = Math.abs(g - BRAND_SAFFRON.g);
  const db = Math.abs(b - BRAND_SAFFRON.b);
  if (dr <= 28 && dg <= 32 && db <= 28) return true;

  const hue = rgbHue(r, g, b);
  const sat = rgbSaturation(r, g, b);
  // Saffron accent band — high-saturation orange, not pink/beige skin
  return hue >= 18 && hue <= 48 && sat >= 0.42 && r >= 170 && g >= 90 && b <= 95;
}

/**
 * Candidate skin pixel — excludes saffron, flat gradients, dark silhouettes, paper beige.
 * Requires multiple color signals (not warm color alone).
 */
function isCandidateSkinPixel(r: number, g: number, b: number): boolean {
  if (isBrandSaffronPixel(r, g, b)) return false;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const delta = max - min;
  const luminance = 0.299 * r + 0.587 * g + 0.114 * b;

  // Ignore flat gradients / paper backgrounds
  if (delta < 18 && luminance > 165) return false;
  // Ignore dark silhouettes (symbolic figures)
  if (luminance < 55) return false;

  // Skin-like: warm, separated channels, not neon orange
  if (r <= 95 || g <= 40 || b <= 20) return false;
  if (r <= g || r <= b) return false;
  if (Math.abs(r - g) <= 15) return false;

  const hue = rgbHue(r, g, b);
  const sat = rgbSaturation(r, g, b);
  // Skin hues ~0–50°, moderate saturation; reject high-sat pure orange
  if (hue < 0 || hue > 52 || sat < 0.12 || sat > 0.72) return false;
  // Tiny warm accents without depth
  if (delta < 22 && luminance > 140) return false;

  return true;
}

function isInFaceZone(x: number, y: number, width: number, height: number): boolean {
  const zoneTop = 0;
  const zoneBottom = Math.floor(height * 0.55);
  const zoneLeft = Math.floor(width * 0.25);
  const zoneRight = Math.ceil(width * 0.75);
  return y >= zoneTop && y < zoneBottom && x >= zoneLeft && x < zoneRight;
}

function findLargestSkinCluster(
  mask: boolean[],
  width: number,
  height: number
): { size: number; minX: number; minY: number; maxX: number; maxY: number } | null {
  const visited = new Uint8Array(mask.length);
  let best: { size: number; minX: number; minY: number; maxX: number; maxY: number } | null =
    null;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const start = y * width + x;
      if (!mask[start] || visited[start]) continue;

      const stack = [start];
      visited[start] = 1;
      let size = 0;
      let minX = x;
      let maxX = x;
      let minY = y;
      let maxY = y;

      while (stack.length) {
        const idx = stack.pop()!;
        const cy = Math.floor(idx / width);
        const cx = idx - cy * width;
        size++;
        minX = Math.min(minX, cx);
        maxX = Math.max(maxX, cx);
        minY = Math.min(minY, cy);
        maxY = Math.max(maxY, cy);

        const neighbors = [
          idx - width,
          idx + width,
          idx - 1,
          idx + 1,
        ];
        for (const n of neighbors) {
          if (n < 0 || n >= mask.length) continue;
          const ny = Math.floor(n / width);
          const nx = n - ny * width;
          if (Math.abs(nx - cx) + Math.abs(ny - cy) !== 1) continue;
          if (!mask[n] || visited[n]) continue;
          visited[n] = 1;
          stack.push(n);
        }
      }

      if (!best || size > best.size) {
        best = { size, minX, minY, maxX, maxY };
      }
    }
  }

  return best;
}

/**
 * Detect plausible identifiable face regions — requires clustered skin-tone pixels
 * in the upper-center face zone, not global warm palette or silhouettes.
 */
async function detectPossibleFace(buffer: Buffer): Promise<boolean> {
  try {
    const { data, info } = await sharp(buffer)
      .resize(FACE_ANALYSIS_WIDTH, FACE_ANALYSIS_HEIGHT, { fit: "fill" })
      .removeAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });

    const { width, height } = info;
    const faceZoneMask: boolean[] = new Array(width * height).fill(false);
    let faceZonePixels = 0;

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        if (!isInFaceZone(x, y, width, height)) continue;
        faceZonePixels++;
        const i = (y * width + x) * 3;
        if (isCandidateSkinPixel(data[i], data[i + 1], data[i + 2])) {
          faceZoneMask[y * width + x] = true;
        }
      }
    }

    const cluster = findLargestSkinCluster(faceZoneMask, width, height);
    if (!cluster || cluster.size < MIN_FACE_CLUSTER_PIXELS) return false;

    const boxW = cluster.maxX - cluster.minX + 1;
    const boxH = cluster.maxY - cluster.minY + 1;
    const boxArea = boxW * boxH;
    const density = cluster.size / Math.max(boxArea, 1);
    const zoneCoverage = cluster.size / Math.max(faceZonePixels, 1);

    // Multiple signals: size + density + zone presence + plausible face aspect
    const plausibleAspect = boxH >= 4 && boxW >= 4 && boxH / boxW >= 0.65 && boxH / boxW <= 2.4;
    const strongCluster =
      cluster.size >= MIN_FACE_CLUSTER_PIXELS &&
      density >= MIN_CLUSTER_DENSITY &&
      zoneCoverage >= MIN_CLUSTER_ZONE_COVERAGE &&
      plausibleAspect;

    return strongCluster;
  } catch {
    return false;
  }
}

/** @internal Legacy detector for regression simulation only */
export function detectPossibleFaceLegacy(pixels: Rgb[], width: number, height: number): boolean {
  let skinPixels = 0;
  const total = width * height;
  for (let i = 0; i < pixels.length; i++) {
    const { r, g, b } = pixels[i];
    if (r > 95 && g > 40 && b > 20 && r > g && r > b && Math.abs(r - g) > 15) {
      skinPixels++;
    }
  }
  return skinPixels / total > 0.08;
}

/** @internal Refined detector on raw pixel grid for tests/simulation */
export function detectPossibleFaceFromPixels(
  pixels: Rgb[],
  width: number,
  height: number
): boolean {
  const faceZoneMask: boolean[] = new Array(width * height).fill(false);
  let faceZonePixels = 0;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (!isInFaceZone(x, y, width, height)) continue;
      faceZonePixels++;
      const { r, g, b } = pixels[y * width + x];
      if (isCandidateSkinPixel(r, g, b)) {
        faceZoneMask[y * width + x] = true;
      }
    }
  }

  const cluster = findLargestSkinCluster(faceZoneMask, width, height);
  if (!cluster || cluster.size < MIN_FACE_CLUSTER_PIXELS) return false;

  const boxW = cluster.maxX - cluster.minX + 1;
  const boxH = cluster.maxY - cluster.minY + 1;
  const density = cluster.size / Math.max(boxW * boxH, 1);
  const zoneCoverage = cluster.size / Math.max(faceZonePixels, 1);
  const plausibleAspect = boxH >= 4 && boxW >= 4 && boxH / boxW >= 0.65 && boxH / boxW <= 2.4;

  return (
    cluster.size >= MIN_FACE_CLUSTER_PIXELS &&
    density >= MIN_CLUSTER_DENSITY &&
    zoneCoverage >= MIN_CLUSTER_ZONE_COVERAGE &&
    plausibleAspect
  );
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
