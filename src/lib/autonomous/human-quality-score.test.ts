import { describe, expect, it } from "vitest";
import {
  HUMAN_QUALITY_WEIGHTS,
  PUBLISH_THRESHOLD,
  REPAIR_THRESHOLD,
  REVIEW_THRESHOLD,
  HIGH_RISK_THRESHOLD,
  decideQualityGate,
  districtRelevanceInput,
  isHighRiskStory,
  meetsPublishThreshold,
  scoreHumanQuality,
} from "@/lib/autonomous/human-quality-score";

describe("human-quality-score thresholds", () => {
  it("weights sum to 100 with 25/20/15/15/10/10/5", () => {
    expect(HUMAN_QUALITY_WEIGHTS.factualGrounding).toBe(25);
    expect(HUMAN_QUALITY_WEIGHTS.districtRelevance).toBe(20);
    expect(HUMAN_QUALITY_WEIGHTS.readability).toBe(15);
    expect(HUMAN_QUALITY_WEIGHTS.sourceDiversity).toBe(15);
    expect(HUMAN_QUALITY_WEIGHTS.freshness).toBe(10);
    expect(HUMAN_QUALITY_WEIGHTS.imagePresence).toBe(10);
    expect(HUMAN_QUALITY_WEIGHTS.headlineClarity).toBe(5);
    const sum = Object.values(HUMAN_QUALITY_WEIGHTS).reduce((a, b) => a + b, 0);
    expect(sum).toBe(100);
  });

  it("uses publish≥82, repair 70–81, hold<70 for routine stories", () => {
    expect(PUBLISH_THRESHOLD).toBe(82);
    expect(REPAIR_THRESHOLD).toBe(70);
    expect(REVIEW_THRESHOLD).toBe(70);
    expect(HIGH_RISK_THRESHOLD).toBe(90);

    expect(decideQualityGate(82).decision).toBe("publish");
    expect(decideQualityGate(81).decision).toBe("repair");
    expect(decideQualityGate(70).decision).toBe("repair");
    expect(decideQualityGate(69).decision).toBe("hold");
    expect(decideQualityGate(90).highRisk).toBe(false);
    expect(decideQualityGate(89, { isHighRisk: true }).highRisk).toBe(true);
  });

  it("high-risk stories require ≥90 to publish", () => {
    expect(decideQualityGate(89, { isHighRisk: true }).decision).toBe("repair");
    expect(decideQualityGate(70, { isHighRisk: true }).decision).toBe("repair");
    expect(decideQualityGate(69, { isHighRisk: true }).decision).toBe("hold");
    expect(decideQualityGate(90, { isHighRisk: true }).decision).toBe("publish");
    expect(decideQualityGate(95, { isHighRisk: true }).highRisk).toBe(true);
  });

  it("detects high-risk categories in EN and HI", () => {
    expect(isHighRiskStory("Police file FIR after murder in Raipur")).toBe(true);
    expect(isHighRiskStory("अदालत ने जमानत याचिका खारिज की")).toBe(true);
    expect(isHighRiskStory("रायपुर में सड़क मरम्मत का काम जारी")).toBe(false);
  });

  it("perfect inputs score 100 and are publishable at 82", () => {
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
    expect(result.threshold).toBe(82);
    expect(meetsPublishThreshold(result.score)).toBe(true);
  });

  it("scores below 82 are not publishable by default threshold", () => {
    const result = scoreHumanQuality({
      factualGrounding: 0.7,
      districtRelevance: 0.7,
      readability: 0.7,
      sourceDiversity: 0.7,
      freshness: 0.7,
      imagePresence: 0.7,
      headlineClarity: 0.7,
    });
    expect(result.score).toBe(70);
    expect(result.publishable).toBe(false);
    expect(decideQualityGate(result.score).decision).toBe("repair");
  });
});

describe("districtRelevanceInput", () => {
  it("scores a district-level Chhattisgarh story highest", () => {
    expect(
      districtRelevanceInput(
        { is_chhattisgarh: true, primary_district: "raipur" },
        "chhattisgarh"
      )
    ).toBe(0.9);
  });

  it("scores a statewide Chhattisgarh story second-highest", () => {
    expect(
      districtRelevanceInput(
        { is_chhattisgarh: true, primary_district: null },
        "chhattisgarh"
      )
    ).toBe(0.55);
  });

  it("credits a genuine national story instead of flatly penalizing it", () => {
    expect(
      districtRelevanceInput({ is_chhattisgarh: false, primary_district: null }, "india")
    ).toBe(0.6);
  });

  it("credits a genuine international story instead of flatly penalizing it", () => {
    expect(
      districtRelevanceInput({ is_chhattisgarh: false, primary_district: null }, "global")
    ).toBe(0.5);
  });

  it("falls back to the original flat penalty for an unrecognized region", () => {
    expect(
      districtRelevanceInput({ is_chhattisgarh: false, primary_district: null }, null)
    ).toBe(0.25);
    expect(
      districtRelevanceInput(
        { is_chhattisgarh: false, primary_district: null },
        "something_else"
      )
    ).toBe(0.25);
  });

  it("a well-rounded national/international story can now realistically cross PUBLISH_THRESHOLD", () => {
    // Same strong-but-not-perfect inputs a genuinely good national/
    // international story could plausibly hit; before this fix
    // districtRelevance was flatly 0.25 for these regions.
    const national = scoreHumanQuality({
      factualGrounding: 0.9,
      districtRelevance: districtRelevanceInput(
        { is_chhattisgarh: false, primary_district: null },
        "india"
      ),
      readability: 0.85,
      sourceDiversity: 0.8,
      freshness: 1,
      imagePresence: 0.85,
      headlineClarity: 0.85,
    });
    expect(national.score).toBeGreaterThanOrEqual(PUBLISH_THRESHOLD);
  });
});
