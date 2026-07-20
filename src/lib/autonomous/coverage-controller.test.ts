import { describe, expect, it } from "vitest";
import {
  buildCoveragePlan,
  computeDistrictDeficit,
  runCoverageController,
} from "@/lib/autonomous/coverage-controller";

describe("coverage-controller", () => {
  it("computes deficit as max(0, target - published)", () => {
    expect(computeDistrictDeficit(8, 3)).toBe(5);
    expect(computeDistrictDeficit(4, 4)).toBe(0);
    expect(computeDistrictDeficit(2, 5)).toBe(0);
  });

  it("prioritizes under-covered districts", () => {
    const plan = buildCoveragePlan({
      day: "2026-07-21",
      publishedByDistrict: { raipur: 0, sukma: 2 },
      env: { AUTONOMOUS_ROLLOUT_STAGE: "shadow" },
    });
    const raipur = plan.items.find((i) => i.districtSlug === "raipur");
    const sukma = plan.items.find((i) => i.districtSlug === "sukma");
    expect(raipur?.deficit).toBe(8);
    expect(sukma?.deficit).toBe(0);
    expect(plan.items[0].deficit).toBeGreaterThan(0);
    expect(plan.totalTarget).toBe(138);
  });

  it("shadow mode does not enable publishing", () => {
    const { plan, publishAllowed, paused } = runCoverageController({
      day: "2026-07-21",
      publishedByDistrict: {},
      env: { AUTONOMOUS_ROLLOUT_STAGE: "shadow" },
    });
    expect(plan.mode).toBe("shadow");
    expect(plan.publishingEnabled).toBe(false);
    expect(publishAllowed).toBe(false);
    expect(paused).toBe(false);
  });

  it("kill switch pauses publishing even in stage_1", () => {
    const { publishAllowed, paused } = runCoverageController({
      day: "2026-07-21",
      publishedByDistrict: {},
      env: {
        AUTONOMOUS_ROLLOUT_STAGE: "stage_1",
        AUTONOMOUS_KILL_SWITCH: "1",
      },
    });
    expect(paused).toBe(true);
    expect(publishAllowed).toBe(false);
  });
});
