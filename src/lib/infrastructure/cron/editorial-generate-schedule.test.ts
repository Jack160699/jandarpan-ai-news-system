import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { REGISTERED_CRON_JOBS } from "@/lib/infrastructure/cron/registered-jobs";

const ROOT = process.cwd();

describe("editorial-generate schedule contract", () => {
  it("registers /api/cron/editorial-generate in vercel.json", () => {
    const vercel = JSON.parse(
      fs.readFileSync(path.join(ROOT, "vercel.json"), "utf8")
    ) as { crons: Array<{ path: string; schedule: string }> };

    const entry = vercel.crons.find(
      (c) => c.path === "/api/cron/editorial-generate"
    );
    expect(entry?.schedule).toBe("5,20,35,50 * * * *");
  });

  it("lists editorial-generate after orchestrate in registered jobs", () => {
    const editorialIdx = REGISTERED_CRON_JOBS.indexOf("editorial-generate");
    const orchestrateIdx = REGISTERED_CRON_JOBS.indexOf("orchestrate");
    expect(editorialIdx).toBeGreaterThan(orchestrateIdx);
    expect(REGISTERED_CRON_JOBS).not.toContain("editorial_generate");
  });

  it("schedules editorial-generate in QStash setup script", () => {
    const script = fs.readFileSync(
      path.join(ROOT, "scripts/setup-qstash-schedules.mjs"),
      "utf8"
    );
    expect(script).toContain("/api/cron/editorial-generate");
    expect(script).toContain("5,20,35,50 * * * *");
    expect(script).toContain('scheduleId: "jandarpan-editorial-generate"');
    expect(script).not.toMatch(
      /RETIRED_SCHEDULE_IDS\s*=\s*\[[^\]]*"jandarpan-editorial-generate"/
    );
  });

  it("excludes editorial_generate from job_processor batch claims", () => {
    const src = fs.readFileSync(
      path.join(
        ROOT,
        "src/lib/infrastructure/workers/intelligence-workers.ts"
      ),
      "utf8"
    );
    expect(src).toContain('excludeJobTypes: ["editorial_generate"]');
  });
});
