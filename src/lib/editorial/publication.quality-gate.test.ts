import { describe, expect, it } from "vitest";
import { checkQualityGateForPublish } from "@/lib/editorial/publication";

describe("checkQualityGateForPublish", () => {
  it("blocks a candidate the quality gate rejected, even with high-risk/safety hold reasons", () => {
    const result = checkQualityGateForPublish(
      {
        quality_report: {
          publish_allowed: false,
          rejectionReasons: ["human_quality:67", "high_risk_story", "held_for_safety"],
        },
      },
      undefined
    );
    expect(result.blocked).toBe(true);
    if (result.blocked) {
      expect(result.message).toContain("held_for_safety");
    }
  });

  it("blocks a candidate in the repair band", () => {
    const result = checkQualityGateForPublish(
      {
        quality_report: {
          publish_allowed: false,
          rejectionReasons: ["human_quality_repair_band:80", "held_for_quality"],
        },
      },
      undefined
    );
    expect(result.blocked).toBe(true);
  });

  it("allows a candidate the quality gate actually cleared", () => {
    const result = checkQualityGateForPublish(
      { quality_report: { publish_allowed: true, rejectionReasons: [] } },
      undefined
    );
    expect(result.blocked).toBe(false);
  });

  it("allows a manual override even for a blocked candidate", () => {
    const result = checkQualityGateForPublish(
      { quality_report: { publish_allowed: false, rejectionReasons: ["held_for_safety"] } },
      true
    );
    expect(result.blocked).toBe(false);
  });

  it("allows rows with no quality_report at all (legacy/manual rows)", () => {
    const result = checkQualityGateForPublish({}, undefined);
    expect(result.blocked).toBe(false);
  });

  it("allows rows with null editorial_metadata", () => {
    const result = checkQualityGateForPublish(null, undefined);
    expect(result.blocked).toBe(false);
  });
});
