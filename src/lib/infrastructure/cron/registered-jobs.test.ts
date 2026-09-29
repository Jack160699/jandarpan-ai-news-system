import { describe, expect, it } from "vitest";
import { REGISTERED_CRON_JOBS, isRegisteredCronJob } from "./registered-jobs";

describe("REGISTERED_CRON_JOBS", () => {
  it("excludes retired heartbeat ids that are not scheduled in vercel.json", () => {
    expect(REGISTERED_CRON_JOBS).not.toContain("editorial_generate");
    expect(REGISTERED_CRON_JOBS).not.toContain("cluster");
    expect(REGISTERED_CRON_JOBS).not.toContain("revalidate");
    expect(isRegisteredCronJob("editorial_generate")).toBe(false);
    // workers-health is covered by admin_ops_snapshot and no longer scheduled.
    expect(REGISTERED_CRON_JOBS).not.toContain("workers-health");
  });

  it("includes active scheduled jobs", () => {
    expect(REGISTERED_CRON_JOBS).toEqual(
      expect.arrayContaining([
        "fetch-news",
        "orchestrate",
        "editorial-generate",
        "edition-publish",
        "translation-backfill",
      ])
    );
  });
});
