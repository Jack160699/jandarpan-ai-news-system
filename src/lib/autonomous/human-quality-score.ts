/**
 * Human-quality score (0–100) for autonomous publish gates.
 *
 * Weights (spec):
 * - factualGrounding 25
 * - districtRelevance 20
 * - readability 15
 * - sourceDiversity 10
 * - freshness 10
 * - imagePresence 10
 * - headlineClarity 10
 */

import type {
  HumanQualityBreakdown,
  HumanQualityResult,
} from "@/lib/autonomous/types";

export const HUMAN_QUALITY_WEIGHTS = {
  factualGrounding: 25,
  districtRelevance: 20,
  readability: 15,
  sourceDiversity: 10,
  freshness: 10,
  imagePresence: 10,
  headlineClarity: 10,
} as const;

/** Minimum score to allow autonomous publish (stage_1+) */
export const PUBLISH_THRESHOLD = 70;

/** Soft review band — log / hold for stage gates */
export const REVIEW_THRESHOLD = 55;

export type HumanQualityInput = {
  /** 0–1 component scores */
  factualGrounding: number;
  districtRelevance: number;
  readability: number;
  sourceDiversity: number;
  freshness: number;
  imagePresence: number;
  headlineClarity: number;
  threshold?: number;
};

function clamp01(n: number): number {
  if (Number.isNaN(n)) return 0;
  return Math.min(1, Math.max(0, n));
}

export function scoreHumanQuality(input: HumanQualityInput): HumanQualityResult {
  const components = {
    factualGrounding: clamp01(input.factualGrounding),
    districtRelevance: clamp01(input.districtRelevance),
    readability: clamp01(input.readability),
    sourceDiversity: clamp01(input.sourceDiversity),
    freshness: clamp01(input.freshness),
    imagePresence: clamp01(input.imagePresence),
    headlineClarity: clamp01(input.headlineClarity),
  };

  const breakdown: HumanQualityBreakdown = {
    factualGrounding:
      components.factualGrounding * HUMAN_QUALITY_WEIGHTS.factualGrounding,
    districtRelevance:
      components.districtRelevance * HUMAN_QUALITY_WEIGHTS.districtRelevance,
    readability: components.readability * HUMAN_QUALITY_WEIGHTS.readability,
    sourceDiversity:
      components.sourceDiversity * HUMAN_QUALITY_WEIGHTS.sourceDiversity,
    freshness: components.freshness * HUMAN_QUALITY_WEIGHTS.freshness,
    imagePresence:
      components.imagePresence * HUMAN_QUALITY_WEIGHTS.imagePresence,
    headlineClarity:
      components.headlineClarity * HUMAN_QUALITY_WEIGHTS.headlineClarity,
  };

  const score = Math.round(
    Object.values(breakdown).reduce((a, b) => a + b, 0)
  );
  const threshold = input.threshold ?? PUBLISH_THRESHOLD;

  return {
    score,
    breakdown,
    publishable: score >= threshold,
    threshold,
  };
}

export function meetsPublishThreshold(score: number, threshold = PUBLISH_THRESHOLD): boolean {
  return score >= threshold;
}
