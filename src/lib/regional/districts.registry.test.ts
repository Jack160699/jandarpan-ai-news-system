import { describe, expect, it } from "vitest";
import {
  ACTIVE_DISTRICT_COUNT,
  CG_DISTRICTS,
  assertThirtyThreeDistricts,
  getDailyCoverageTargets,
  getDistrict,
  getDistrictsByTier,
  getAllDistrictSlugs,
} from "@/lib/regional/districts";

describe("districts registry (33 official CG)", () => {
  it("has exactly 33 districts", () => {
    expect(CG_DISTRICTS).toHaveLength(ACTIVE_DISTRICT_COUNT);
    expect(ACTIVE_DISTRICT_COUNT).toBe(33);
  });

  it("has unique kebab-case slugs", () => {
    const slugs = getAllDistrictSlugs();
    expect(new Set(slugs).size).toBe(33);
    for (const slug of slugs) {
      expect(slug).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
    }
  });

  it("tier counts are 8 high / 12 medium / 13 low", () => {
    expect(getDistrictsByTier("high")).toHaveLength(8);
    expect(getDistrictsByTier("medium")).toHaveLength(12);
    expect(getDistrictsByTier("low")).toHaveLength(13);
  });

  it("daily targets sum to 138 (64+48+26)", () => {
    const { byTier, total } = getDailyCoverageTargets();
    expect(byTier.high).toBe(64);
    expect(byTier.medium).toBe(48);
    expect(byTier.low).toBe(26);
    expect(total).toBe(138);
  });

  it("assertThirtyThreeDistricts passes", () => {
    expect(() => assertThirtyThreeDistricts()).not.toThrow();
  });

  it("surguja keeps ambikapur alias; surajpur is separate", () => {
    const surguja = getDistrict("surguja");
    const surajpur = getDistrict("surajpur");
    expect(surguja?.slug).toBe("surguja");
    expect(surajpur?.slug).toBe("surajpur");
    expect(getDistrict("ambikapur")?.slug).toBe("surguja");
    expect(surguja?.aliases.some((a) => a.toLowerCase() === "surajpur")).toBe(
      false
    );
  });

  it("high tier includes business priority districts", () => {
    const high = new Set(getDistrictsByTier("high").map((d) => d.slug));
    for (const slug of [
      "raipur",
      "durg",
      "bilaspur",
      "korba",
      "raigarh",
      "rajnandgaon",
      "bastar",
      "janjgir-champa",
    ]) {
      expect(high.has(slug)).toBe(true);
    }
  });
});
