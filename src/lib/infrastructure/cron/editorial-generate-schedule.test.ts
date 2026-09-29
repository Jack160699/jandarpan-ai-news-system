import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { REGISTERED_CRON_JOBS } from "@/lib/infrastructure/cron/registered-jobs";
import { SCHEDULER_JOBS } from "@/lib/infrastructure/cron/scheduler-manifest";

const ROOT = process.cwd();

describe("editorial-generate schedule contract", () => {
  it("schedules /api/cron/editorial-generate in the Supabase scheduler manifest", () => {
    // Vercel Hobby cannot run sub-daily crons and GitHub Actions schedules are
    // throttled; the manifest (pg_cron) is the runtime scheduler.
    const entry = SCHEDULER_JOBS.find((j) => j.path === "/api/cron/editorial-generate");
    expect(entry).toBeDefined();
    expect(entry!.everyMinutes).toBeLessThanOrEqual(15);
  });

  it("lists editorial-generate after orchestrate in registered jobs", () => {
    const editorialIdx = REGISTERED_CRON_JOBS.indexOf("editorial-generate");
    const orchestrateIdx = REGISTERED_CRON_JOBS.indexOf("orchestrate");
    expect(editorialIdx).toBeGreaterThan(orchestrateIdx);
    expect(REGISTERED_CRON_JOBS).not.toContain("editorial_generate");
  });

  it("excludes editorial_generate from job_processor batch claims", () => {
    const src = fs.readFileSync(
      path.join(
        ROOT,
        "src/lib/infrastructure/workers/intelligence-workers.ts"
      ),
      "utf8"
    );
    // event_cluster now gets its own dedicated claim (jobTypes: ["event_cluster"]),
    // which naturally excludes editorial_generate; the remaining mixed-type
    // batch explicitly excludes both.
    expect(src).toContain('jobTypes: ["event_cluster"]');
    expect(src).toContain(
      'excludeJobTypes: ["editorial_generate", "event_cluster"]'
    );
  });
});
