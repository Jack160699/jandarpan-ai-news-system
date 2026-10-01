import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  DB_MAINTENANCE_JOBS,
  DISABLED_SCHEDULER_JOBS,
  EDGE_SCHEDULER_JOBS,
  FETCH_SHARDS,
  HEALTH_JOBS,
  edgeDispatchName,
  RETIRED_SCHEDULER_JOB_IDS,
  renderSchedulerSql,
  SCHEDULER_JOBS,
  schedulerJobName,
  stallThresholdMs,
} from "@/lib/infrastructure/cron/scheduler-manifest";

const ROOT = process.cwd();
const MIGRATION = path.join(
  ROOT,
  "supabase/migrations/20261001000000_090_edge_workers.sql"
);
const MIGRATION_089 = path.join(ROOT, "supabase/migrations/20260930080000_089_scheduler_hardening.sql");
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
    const by = Object.fromEntries([...SCHEDULER_JOBS, ...EDGE_SCHEDULER_JOBS].map((j) => [j.id, j]));
    expect(by["fetch-news"]!.everyMinutes).toBeLessThanOrEqual(15);
    expect(by["cluster"]!.everyMinutes).toBeLessThanOrEqual(15);
    // Editorial wakes every <=10 min but each wake processes ONE story behind quota/lease/budget/backoff.
    expect(by["editorial-generate"]!.everyMinutes).toBeLessThanOrEqual(10);
    expect(by["translation"]!.everyMinutes).toBeLessThanOrEqual(30);
    expect(by["orchestrate"]!.everyMinutes).toBeLessThanOrEqual(15);
  });

  it("the heavy pipeline runs on Supabase Edge, not on Vercel", () => {
    const vercelIds = new Set(SCHEDULER_JOBS.map((j) => j.id));
    for (const moved of ["fetch-news", "cluster", "editorial-generate", "translation-backfill"]) {
      expect(vercelIds.has(moved), `${moved} must not be a Vercel dispatch`).toBe(false);
      expect(RETIRED_SCHEDULER_JOB_IDS, moved).toContain(moved);
    }
    expect(EDGE_SCHEDULER_JOBS.map((j) => j.function).sort()).toEqual(["cluster-worker", "editorial-worker", "fetch-worker", "translation-worker"]);
    // what remains on Vercel is light: no AI generation / ingestion route
    for (const j of SCHEDULER_JOBS) expect(j.path).not.toMatch(/fetch-news|editorial-generate|cluster|translation/);
  });

  it("fetch is sharded: every shard has a unique name, body and lease key, and the shards cover 0..N-1", () => {
    const fetch = EDGE_SCHEDULER_JOBS.find((j) => j.function === "fetch-worker")!;
    expect(fetch.dispatches).toHaveLength(FETCH_SHARDS);
    expect(fetch.dispatches.map((d) => (d.body as { shard: number }).shard)).toEqual([...Array(FETCH_SHARDS).keys()]);
    expect(new Set(fetch.dispatches.map((d) => d.leaseKey)).size).toBe(FETCH_SHARDS);
    expect(new Set(fetch.dispatches.map((d) => edgeDispatchName(fetch, d.suffix))).size).toBe(FETCH_SHARDS);
    for (const d of fetch.dispatches) expect((d.body as { shards: number }).shards).toBe(FETCH_SHARDS);
    expect(fetch.dispatches.every((d) => d.cron.trim().split(/\s+/).length === 5)).toBe(true);
  });

  it("every Edge dispatch is serialised by a lease the worker actually takes", () => {
    const leaseKeysInWorkers = [
      fs.readFileSync(path.join(ROOT, "src/lib/edge/workers/fetch-spec.ts"), "utf8"),
      fs.readFileSync(path.join(ROOT, "src/lib/edge/workers/cluster-spec.ts"), "utf8"),
      fs.readFileSync(path.join(ROOT, "src/lib/edge/workers/translation-spec.ts"), "utf8"),
      fs.readFileSync(path.join(ROOT, "src/lib/edge/editorial-worker/handler.ts"), "utf8"),
    ].join("\n");
    for (const job of EDGE_SCHEDULER_JOBS) {
      for (const d of job.dispatches) {
        expect(d.leaseKey, `${job.id} needs a lease key`).not.toBeNull();
        // fetch keys are built from the template edge-fetch-${shards}-${shard}
        const template = d.leaseKey!.replace(/^edge-fetch-\d+-\d+$/, "edge-fetch-");
        expect(leaseKeysInWorkers, d.leaseKey!).toContain(template);
      }
    }
  });

  it("every Edge function in the manifest has a function directory and an entry point", () => {
    for (const job of EDGE_SCHEDULER_JOBS) {
      expect(fs.existsSync(path.join(ROOT, "supabase/functions", job.function, "index.ts")), job.function).toBe(true);
      expect(fs.existsSync(path.join(ROOT, "src/edge", job.function, "serve.ts")), job.function).toBe(true);
    }
  });

  it("the dashboard sees one row per logical job (shards collapse to one ops job)", () => {
    const ids = HEALTH_JOBS.map((j) => j.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).toEqual(expect.arrayContaining(["fetch-news", "cluster", "editorial-generate", "translation"]));
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
    const sql = fs.readFileSync(MIGRATION_089, "utf8").replace(/\r\n/g, "\n");
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

  it("keeps migration 090's generated block in sync with the manifest", () => {
    const sql = fs.readFileSync(MIGRATION, "utf8").replace(/\r*\n/g, "\n");
    expect(sql).toContain(renderSchedulerSql());
  });

  it("migration 089 is applied and frozen: it still registers the Vercel dispatches it shipped with", () => {
    const sql = fs.readFileSync(MIGRATION_089, "utf8");
    expect(sql).toContain("jd_invoke_cron('fetch-news'");
    expect(sql).toContain("jd_invoke_cron('editorial-generate'");
  });
});

describe("migration 090 (Edge dispatcher)", () => {
  const sql = fs.readFileSync(MIGRATION, "utf8").replace(/\r*\n/g, "\n");

  it("has the same guarantees as the Vercel dispatcher: kill switch, lease pre-check, Vault credentials, x-jd-trigger", () => {
    expect(sql).toContain("create or replace function public.jd_invoke_edge(");
    expect(sql).toContain("if not public.jd_scheduler_enabled() then");
    expect(sql).toContain("worker_run_leases");
    expect(sql).toContain("'jd_edge_worker_secret'");
    expect(sql).toContain("'jd_edge_base_url'");
    expect(sql).toContain("'x-jd-trigger', 'scheduler'");
    expect(sql).toContain("vault_secrets_missing");
  });

  it("does not enable anything: no scheduler_control update, no Vault secret creation", () => {
    expect(sql).not.toMatch(/jd_set_scheduler_enabled\(\s*true/i);
    expect(sql).not.toMatch(/update\s+public\.scheduler_control/i);
    const executable = sql.split("\n").filter((l) => !l.trim().startsWith("--")).join("\n");
    expect(executable).not.toContain("vault.create_secret");
  });
});
