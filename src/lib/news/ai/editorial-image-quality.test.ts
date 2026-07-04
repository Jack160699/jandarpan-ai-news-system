import { describe, expect, it } from "vitest";
import sharp from "sharp";
import {
  detectPossibleFaceFromPixels,
  detectPossibleFaceLegacy,
  scoreImageBuffer,
} from "@/lib/news/ai/editorial-image-quality";

type Rgb = { r: number; g: number; b: number };

const W = 64;
const H = 36;

function solid(r: number, g: number, b: number): Rgb[] {
  return Array.from({ length: W * H }, () => ({ r, g, b }));
}

function withSaffronGradient(pixels: Rgb[]): Rgb[] {
  return pixels.map((_, i) => {
    const y = Math.floor(i / W);
    const t = y / H;
    return {
      r: Math.round(232 * (1 - t * 0.3) + 245 * t * 0.3),
      g: Math.round(149 * (1 - t * 0.3) + 210 * t * 0.3),
      b: Math.round(45 * (1 - t * 0.3) + 80 * t * 0.3),
    };
  });
}

function withScatteredSkinDots(pixels: Rgb[]): Rgb[] {
  const out = pixels.map((p) => ({ ...p }));
  for (let i = 0; i < 200; i++) {
    const x = (i * 7) % W;
    const y = (i * 5) % H;
    out[y * W + x] = { r: 180, g: 130, b: 95 };
  }
  return out;
}

function withFaceCluster(pixels: Rgb[], cx = 32, cy = 12, radius = 8): Rgb[] {
  const out = pixels.map((p) => ({ ...p }));
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const dx = x - cx;
      const dy = y - cy;
      if (dx * dx + dy * dy <= radius * radius) {
        out[y * W + x] = { r: 195, g: 145, b: 110 };
      }
    }
  }
  return out;
}

function withDarkSilhouette(pixels: Rgb[]): Rgb[] {
  const out = pixels.map((p) => ({ ...p }));
  for (let y = 8; y < 28; y++) {
    for (let x = 20; x < 44; x++) {
      out[y * W + x] = { r: 25, g: 22, b: 20 };
    }
  }
  return out;
}

async function bufferFromPixels(pixels: Rgb[]): Promise<Buffer> {
  const raw = Buffer.alloc(W * H * 3);
  for (let i = 0; i < pixels.length; i++) {
    raw[i * 3] = pixels[i].r;
    raw[i * 3 + 1] = pixels[i].g;
    raw[i * 3 + 2] = pixels[i].b;
  }
  return sharp(raw, { raw: { width: W, height: H, channels: 3 } })
    .png()
    .toBuffer();
}

describe("detectPossibleFace refinement", () => {
  it("legacy detector flags saffron gradient (production false positive)", () => {
    const pixels = withSaffronGradient(solid(240, 240, 240));
    expect(detectPossibleFaceLegacy(pixels, W, H)).toBe(true);
    expect(detectPossibleFaceFromPixels(pixels, W, H)).toBe(false);
  });

  it("ignores scattered skin-colored pixels without clustering", () => {
    const pixels = withScatteredSkinDots(solid(240, 235, 220));
    expect(detectPossibleFaceLegacy(pixels, W, H)).toBe(true);
    expect(detectPossibleFaceFromPixels(pixels, W, H)).toBe(false);
  });

  it("ignores dark silhouettes", () => {
    const pixels = withDarkSilhouette(solid(245, 240, 230));
    expect(detectPossibleFaceFromPixels(pixels, W, H)).toBe(false);
  });

  it("flags contiguous face-sized cluster in upper-center zone", () => {
    const pixels = withFaceCluster(solid(245, 240, 230));
    expect(detectPossibleFaceFromPixels(pixels, W, H)).toBe(true);
  });

  it("ignores tiny face-sized blobs below cluster threshold", () => {
    const pixels = withFaceCluster(solid(245, 240, 230), 32, 12, 3);
    expect(detectPossibleFaceFromPixels(pixels, W, H)).toBe(false);
  });
});

describe("scoreImageBuffer integration", () => {
  it("passes editorial saffron illustration that legacy would reject", async () => {
    const buf = await bufferFromPixels(withSaffronGradient(solid(240, 240, 240)));
    const large = await sharp(buf).resize(1200, 675).webp().toBuffer();
    const report = await scoreImageBuffer(large);
    expect(report.flags).not.toContain("possible_face");
  });

  it("still hard-rejects plausible face cluster", async () => {
    const buf = await bufferFromPixels(withFaceCluster(solid(245, 240, 230)));
    const large = await sharp(buf).resize(1200, 675).webp().toBuffer();
    const report = await scoreImageBuffer(large);
    expect(report.flags).toContain("possible_face");
    expect(report.passed).toBe(false);
  });
});

/**
 * Production simulation — mirrors 34 scored rejections + 1 success from investigation.
 * Rejected buffers were not stored; scenarios match documented failure modes.
 */
describe("production rejection simulation (Phase 2 investigation)", () => {
  const productionScenarios: Array<{
    id: string;
    label: string;
    build: () => Rgb[];
    expectedTruePositive: boolean;
  }> = [
    ...Array.from({ length: 10 }, (_, i) => ({
      id: `cricket-${i + 1}`,
      label: "Sports illustration (cricket)",
      build: () =>
        withScatteredSkinDots(
          withSaffronGradient(withFaceCluster(solid(230, 225, 210), 28 + (i % 3), 14, 5))
        ),
      expectedTruePositive: false,
    })),
    ...Array.from({ length: 10 }, (_, i) => ({
      id: `jobs-${i + 1}`,
      label: "Contract jobs / community scene",
      build: () => withSaffronGradient(withScatteredSkinDots(solid(242, 238, 228))),
      expectedTruePositive: false,
    })),
    ...Array.from({ length: 9 }, (_, i) => ({
      id: `accident-reject-${i + 1}`,
      label: "Road accident symbolic (rejected in prod)",
      build: () =>
        withSaffronGradient(
          withScatteredSkinDots(withFaceCluster(solid(235, 230, 220), 30, 13, 6))
        ),
      expectedTruePositive: false,
    })),
    {
      id: "accident-pass",
      label: "Road accident abstract (passed attempt 4 in prod)",
      build: () => withSaffronGradient(solid(238, 232, 218)),
      expectedTruePositive: false,
    },
    {
      id: "photoreal-portrait",
      label: "Plausible identifiable face region (safety)",
      build: () => withFaceCluster(solid(240, 235, 225), 32, 11, 9),
      expectedTruePositive: true,
    },
    {
      id: "crime-silhouette",
      label: "Crime story dark silhouettes",
      build: () => withDarkSilhouette(withSaffronGradient(solid(240, 235, 225))),
      expectedTruePositive: false,
    },
    {
      id: "lions-club",
      label: "Community service crowd illustration",
      build: () =>
        withSaffronGradient(
          withScatteredSkinDots(withFaceCluster(solid(236, 230, 218), 26, 15, 5))
        ),
      expectedTruePositive: false,
    },
    {
      id: "murder-scene",
      label: "Crime/murder symbolic figures",
      build: () =>
        withSaffronGradient(withScatteredSkinDots(solid(234, 228, 215))),
      expectedTruePositive: false,
    },
  ];

  it("reports old vs new acceptance on investigation scenarios", () => {
    let legacyPositive = 0;
    let refinedPositive = 0;
    let falsePositivesRemoved = 0;
    let truePositivesBlocked = 0;

    for (const scenario of productionScenarios) {
      const pixels = scenario.build();
      const legacy = detectPossibleFaceLegacy(pixels, W, H);
      const refined = detectPossibleFaceFromPixels(pixels, W, H);

      if (legacy) legacyPositive++;
      if (refined) refinedPositive++;

      if (legacy && !refined && !scenario.expectedTruePositive) falsePositivesRemoved++;
      if (scenario.expectedTruePositive && refined) truePositivesBlocked++;
    }

    const total = productionScenarios.length;
    const oldAcceptance = ((total - legacyPositive) / total) * 100;
    const newAcceptance = ((total - refinedPositive) / total) * 100;

    expect(oldAcceptance).toBeLessThan(10);
    expect(newAcceptance).toBeGreaterThan(85);
    expect(falsePositivesRemoved).toBeGreaterThanOrEqual(30);
    expect(truePositivesBlocked).toBe(1);
  });
});
