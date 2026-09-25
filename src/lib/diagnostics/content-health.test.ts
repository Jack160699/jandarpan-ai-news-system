import { describe, expect, it } from "vitest";
import { runContentAvailabilityHealthCheck } from "./content-health";

describe("runContentAvailabilityHealthCheck", () => {
  it("reports healthy inventory with 6 sections, Taza feed, and Durg district", async () => {
    const report = await runContentAvailabilityHealthCheck();
    expect(report.status).toBe("healthy");
    expect(report.taza.eligibleStoryCount).toBeGreaterThanOrEqual(15);
    expect(report.homeSections.politics).toBeGreaterThanOrEqual(2);
    expect(report.homeSections.crime).toBeGreaterThanOrEqual(2);
    expect(report.homeSections.national).toBeGreaterThanOrEqual(2);
    expect(report.homeSections.international).toBeGreaterThanOrEqual(2);
    expect(report.homeSections.entertainment).toBeGreaterThanOrEqual(2);
    expect(report.homeSections.sports).toBeGreaterThanOrEqual(2);
    expect(report.districts.durg).toBeGreaterThanOrEqual(1);
    expect(report.taza.newestPublishedAt).toBeTruthy();
    expect(report.taza.oldestPublishedAt).toBeTruthy();
  });
});
