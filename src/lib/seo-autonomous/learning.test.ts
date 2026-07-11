import { describe, expect, it } from "vitest";
import { computeOutcomeScore } from "@/lib/seo-autonomous/learning";
import { isAutonomousSeoEnabled } from "@/lib/seo-autonomous/config";

describe("learning", () => {
  it("computes positive outcome when CTR improves", () => {
    const score = computeOutcomeScore([
      { metric_type: "ctr", delta: 0.02, current_value: 0.05 },
      { metric_type: "impressions", delta: 100, current_value: 500 },
    ]);
    expect(score).toBeGreaterThan(0);
  });

  it("computes negative outcome when position worsens", () => {
    const score = computeOutcomeScore([
      { metric_type: "position", delta: 3, current_value: 15 },
    ]);
    expect(score).toBeLessThan(0);
  });

  it("returns neutral-positive without delta metrics", () => {
    const score = computeOutcomeScore([
      { metric_type: "ctr", delta: null, current_value: 0.03 },
    ]);
    expect(score).toBe(0.2);
  });
});

describe("config", () => {
  it("reads autonomous feature flag", () => {
    const prev = process.env.SEO_AUTONOMOUS_ENGINE;
    process.env.SEO_AUTONOMOUS_ENGINE = "true";
    expect(isAutonomousSeoEnabled()).toBe(true);
    process.env.SEO_AUTONOMOUS_ENGINE = prev;
  });
});
