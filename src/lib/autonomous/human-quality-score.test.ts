import { describe, expect, it } from "vitest";
import {
  HUMAN_QUALITY_WEIGHTS,
  PUBLISH_THRESHOLD,
  REVIEW_THRESHOLD,
  meetsPublishThreshold,
  scoreHumanQuality,
} from "@/lib/autonomous/human-quality-score";

describe("human-quality-score", () => {
  it("weights sum to 100", () => {
    const sum = Object.values(HUMAN_QUALITY_WEIGHTS).reduce((a, b) => a + b, 0);
    expect(sum).toBe(100);
  });

  it("perfect inputs score 100 and are publishable", () => {
    const result = scoreHumanQuality({
      factualGrounding: 1,
      districtRelevance: 1,
      readability: 1,
      sourceDiversity: 1,
      freshness: 1,
      imagePresence: 1,
      headlineClarity: 1,
    });
    expect(result.score).toBe(100);
    expect(result.publishable).toBe(true);
    expect(result.threshold).toBe(PUBLISH_THRESHOLD);
  });

  it("low scores fail publish threshold", () => {
    const result = scoreHumanQuality({
      factualGrounding: 0.2,
      districtRelevance: 0.2,
      readability: 0.2,
      sourceDiversity: 0.2,
      freshness: 0.2,
      imagePresence: 0,
      headlineClarity: 0.2,
    });
    expect(result.score).toBeLessThan(PUBLISH_THRESHOLD);
    expect(result.publishable).toBe(false);
    expect(meetsPublishThreshold(result.score)).toBe(false);
  });

  it("exposes review vs publish thresholds", () => {
    expect(REVIEW_THRESHOLD).toBeLessThan(PUBLISH_THRESHOLD);
    expect(meetsPublishThreshold(70)).toBe(true);
    expect(meetsPublishThreshold(69)).toBe(false);
  });
});
