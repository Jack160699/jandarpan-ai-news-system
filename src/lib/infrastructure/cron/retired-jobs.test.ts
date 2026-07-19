import { describe, expect, it } from "vitest";
import { REGISTERED_CRON_JOBS } from "@/lib/infrastructure/cron/registered-jobs";
import {
  isRetiredCronJob,
  RETIRED_CRON_JOBS,
  staleThresholdForJob,
} from "@/lib/infrastructure/cron/retired-jobs";

describe("Phase 8 retired workers / stale thresholds", () => {
  it("excludes retired worker names from registered health set", () => {
    for (const retired of RETIRED_CRON_JOBS) {
      expect(isRetiredCronJob(retired)).toBe(true);
      expect(REGISTERED_CRON_JOBS).not.toContain(retired);
    }
  });

  it("keeps editorial-generate (Phase 2) and retires editorial_generate", () => {
    expect(REGISTERED_CRON_JOBS).toContain("editorial-generate");
    expect(isRetiredCronJob("editorial_generate")).toBe(true);
  });

  it("uses wider stale window for competitor-tracker", () => {
    expect(staleThresholdForJob("competitor-tracker", 86_400_000)).toBe(
      2 * 60 * 60 * 1000
    );
  });
});
