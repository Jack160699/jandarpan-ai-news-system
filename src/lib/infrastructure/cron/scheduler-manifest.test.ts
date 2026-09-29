import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  renderSchedulerSql,
  SCHEDULER_JOBS,
  schedulerJobName,
  stallThresholdMs,
} from "@/lib/infrastructure/cron/scheduler-manifest";

const ROOT = process.cwd();
const MIGRATION = path.join(
  ROOT,
  "supabase/migrations/20260930020000_083_supabase_scheduler.sql"
);

function routeFileFor(routePath: string): string {
  return path.join(ROOT, "src/app", routePath, "route.ts");
}

describe("scheduler manifest", () => {
  it("has unique ids and pg_cron names", () => {
    const ids = SCHEDULER_JOBS.map((j) => j.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(new Set(ids.map(schedulerJobName)).size).toBe(ids.length);
  });

  it("only points at routes that exist", () => {
    for (const job of SCHEDULER_JOBS) {
      expect(fs.existsSync(routeFileFor(job.path)), `${job.id} -> ${job.path}`).toBe(true);
    }
  });

  it("uses valid 5-field cron expressions", () => {
    for (const job of SCHEDULER_JOBS) {
      expect(job.cron.trim().split(/\s+/), job.id).toHaveLength(5);
    }
  });

  it("meets the required cadence for the critical pipeline lanes", () => {
    const by = Object.fromEntries(SCHEDULER_JOBS.map((j) => [j.id, j]));
    expect(by["fetch-news"]!.everyMinutes).toBeLessThanOrEqual(15);
    expect(by["cluster"]!.everyMinutes).toBeLessThanOrEqual(15);
    expect(by["editorial-generate"]!.everyMinutes).toBeLessThanOrEqual(5);
    expect(by["workers-health"]!.everyMinutes).toBeLessThanOrEqual(5);
    expect(by["orchestrate"]!.everyMinutes).toBeLessThanOrEqual(15);
  });

  it("gives every job a timeout no larger than the route's maxDuration", () => {
    for (const job of SCHEDULER_JOBS) {
      const file = routeFileFor(job.path);
      const src = fs.readFileSync(file, "utf8");
      const m = /maxDuration\s*=\s*([0-9_]+)/.exec(src);
      if (!m) continue; // routes without an explicit budget use the platform default
      const maxSeconds = Number(m[1]!.replace(/_/g, ""));
      expect(job.timeoutMs, job.id).toBeLessThanOrEqual(maxSeconds * 1000 + 1000);
    }
  });

  it("stall threshold is 3 nominal intervals with a 15 minute floor", () => {
    expect(stallThresholdMs({ everyMinutes: 5 })).toBe(15 * 60_000);
    expect(stallThresholdMs({ everyMinutes: 10 })).toBe(30 * 60_000);
    expect(stallThresholdMs({ everyMinutes: 60 })).toBe(180 * 60_000);
  });

  it("keeps the migration's generated block in sync with the manifest", () => {
    const sql = fs.readFileSync(MIGRATION, "utf8").replace(/\r\n/g, "\n");
    expect(sql).toContain(renderSchedulerSql());
  });
});
