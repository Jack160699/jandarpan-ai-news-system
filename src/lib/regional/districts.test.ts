import { describe, expect, it } from "vitest";
import {
  CG_DISTRICTS,
  CHHATTISGARH_DISTRICT_DIRECTORY,
  getAllDistrictSlugs,
} from "@/lib/regional/districts";

describe("Chhattisgarh district directory", () => {
  it("keeps every official district in one unique directory", () => {
    expect(CHHATTISGARH_DISTRICT_DIRECTORY).toHaveLength(33);
    expect(new Set(CHHATTISGARH_DISTRICT_DIRECTORY.map((district) => district.slug)).size).toBe(33);
  });

  it("only generates routes for genuinely supported districts", () => {
    const available = CHHATTISGARH_DISTRICT_DIRECTORY.filter(
      (district) => district.availability === "available"
    );
    expect(available).toHaveLength(CG_DISTRICTS.length);
    expect(getAllDistrictSlugs()).toEqual(CG_DISTRICTS.map((district) => district.slug));
    expect(
      CHHATTISGARH_DISTRICT_DIRECTORY.find(
        (district) => district.slug === "baloda-bazar-bhatapara"
      )?.availability
    ).toBe("coming-soon");
  });
});
