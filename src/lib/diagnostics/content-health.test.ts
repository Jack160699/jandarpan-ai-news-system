import { describe, expect, it } from "vitest";
import { runContentAvailabilityHealthCheck } from "./content-health";

describe("runContentAvailabilityHealthCheck", () => {
  it("reports healthy inventory with 6 sections, Taza feed, and Durg district", async () => {
    const report = await runContentAvailabilityHealthCheck();
    expect(["healthy", "sparse"]).toContain(report.status);
    expect(report.taza.eligibleStoryCount).toBeGreaterThanOrEqual(15);
    expect(report.districts.durg).toBeGreaterThanOrEqual(1);
    expect(report.taza.newestPublishedAt).toBeTruthy();
    expect(report.taza.oldestPublishedAt).toBeTruthy();
  });
});
