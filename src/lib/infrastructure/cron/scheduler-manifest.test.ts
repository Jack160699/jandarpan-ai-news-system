import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  DB_MAINTENANCE_JOBS,
  DISABLED_SCHEDULER_JOBS,
  RETIRED_SCHEDULER_JOB_IDS,
  renderSchedulerSql,
  SCHEDULER_JOBS,
  schedulerJobName,
  stallThresholdMs,
} from "@/lib/infrastructure/cron/scheduler-manifest";

const ROOT = process.cwd();
const MIGRATION = path.join(
  ROOT,
  "supabase/migrations/20260930080000_089_scheduler_hardening.sql"
);
const FROZEN_083 = path.join(
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
    // Editorial: every 10 min x 4 stories/run comfortably covers 100/day; tighter only burns AI quota.
    expect(by["editorial-generate"]!.everyMinutes).toBeLessThanOrEqual(10);
    expect(by["orchestrate"]!.everyMinutes).toBeLessThanOrEqual(15);
  });

  it("does not schedule retired or disabled jobs", () => {
    const ids = new Set(SCHEDULER_JOBS.map((j) => j.id));
    for (const retired of ["process-ai", "workers-health", "cleanup"]) {
      expect(ids.has(retired), retired).toBe(false);
      expect(RETIRED_SCHEDULER_JOB_IDS).toContain(retired);
    }
    // Audio stays off until Google credentials are intentionally configured.
    expect(ids.has("audio-generate")).toBe(false);
    expect(DISABLED_SCHEDULER_JOBS.map((j) => j.id)).toContain("audio-generate");
  });

  it("gives every job that could overlap itself a run lease the route actually takes", () => {
    for (const job of SCHEDULER_JOBS) {
      const selfOverlapPossible = job.timeoutMs * 2 >= job.everyMinutes * 60_000;
      if (job.leaseKey === null) {
        expect(selfOverlapPossible, `${job.id} can overlap itself but has no leaseKey`).toBe(false);
        continue;
      }
      // The lease key must appear in the code that serves the route (route file or shared cron handlers).
      const sources = [
        fs.readFileSync(routeFileFor(job.path), "utf8"),
        fs.readFileSync(path.join(ROOT, "src/lib/infrastructure/cron/handlers.ts"), "utf8"),
        fs.readFileSync(
          path.join(ROOT, "src/lib/infrastructure/workers/editorial-generate-observability.ts"),
          "utf8"
        ),
      ].join("\n");
      expect(sources, `${job.id} lease key ${job.leaseKey}`).toContain(`"${job.leaseKey}"`);
    }
  });

  it("registers DB maintenance jobs that run inside Postgres, not via HTTP", () => {
    expect(DB_MAINTENANCE_JOBS.map((j) => j.id)).toEqual(["prune-scheduler-logs", "prune-storage"]);
    const sql = renderSchedulerSql();
    expect(sql).toContain("select public.jd_prune_storage();");
    expect(sql).not.toContain("/api/cron/cleanup");
    expect(sql).not.toContain("/api/process-ai");
    expect(sql).not.toContain("/api/cron/workers/health");
  });

  it("migration 089 ships the kill switch defaulting to disabled and the guarded dispatcher", () => {
    const sql = fs.readFileSync(MIGRATION, "utf8").replace(/\r\n/g, "\n");
    expect(sql).toMatch(/enabled\s+boolean not null default false/);
    expect(sql).toMatch(/prune_enabled\s+boolean not null default false/);
    expect(sql).toContain("if not public.jd_scheduler_enabled() then");
    expect(sql).toContain("worker_run_leases");
    // 083 is already applied and must stay frozen.
    expect(fs.readFileSync(FROZEN_083, "utf8")).not.toContain("jd_scheduler_enabled");
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
