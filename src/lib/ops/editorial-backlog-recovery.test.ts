import { beforeEach, describe, expect, it, vi } from "vitest";

const reclaim = vi.fn(async () => 2);

vi.mock("@/lib/infrastructure/jobs/queue", () => ({
  enqueueJob: vi.fn(async () => "new-job"),
  reclaimStaleClaimedJobs: () => reclaim(),
}));

type Row = Record<string, unknown>;

function createClientMock(state: {
  jobs: Row[];
  deadLetters: Row[];
  events: Row[];
  articles: Row[];
  tenants: Row[];
}) {
  function from(table: string) {
    const filters: Array<(row: Row) => boolean> = [];
    let limitN = 200;
    let mode: "list" | "count" | "maybe" = "list";
    let updatePatch: Row | null = null;

    const api: Record<string, unknown> = {};

    const run = async () => {
      let rows: Row[] = [];
      if (table === "worker_jobs") rows = state.jobs;
      else if (table === "worker_dead_letters") rows = state.deadLetters;
      else if (table === "news_events") rows = state.events;
      else if (table === "generated_articles") rows = state.articles;
      else if (table === "newsroom_tenants") rows = state.tenants;
      else if (table === "event_bus_messages") rows = [];
      else if (table === "worker_job_runs") rows = [];

      rows = rows.filter((r) => filters.every((f) => f(r)));

      if (updatePatch) {
        for (const r of rows) Object.assign(r, updatePatch);
      }

      if (mode === "count") {
        return { data: null, count: rows.length, error: null };
      }
      if (mode === "maybe") {
        return { data: rows[0] ?? null, error: null };
      }
      return { data: rows.slice(0, limitN), count: rows.length, error: null };
    };

    const chain = new Proxy(api, {
      get(_target, prop: string) {
        if (prop === "then") {
          return (resolve: (v: unknown) => void, reject?: (e: unknown) => void) =>
            run().then(resolve, reject);
        }
        if (prop === "select") {
          return (_cols: string, opts?: { count?: string; head?: boolean }) => {
            if (opts?.count === "exact" && opts.head) mode = "count";
            return chain;
          };
        }
        if (prop === "eq") {
          return (col: string, val: unknown) => {
            filters.push((r) => r[col] === val);
            return chain;
          };
        }
        if (prop === "neq") {
          return (col: string, val: unknown) => {
            filters.push((r) => r[col] !== val);
            return chain;
          };
        }
        if (prop === "in") {
          return (col: string, vals: unknown[]) => {
            filters.push((r) => vals.includes(r[col]));
            return chain;
          };
        }
        if (prop === "not") {
          return () => chain;
        }
        if (prop === "gte") {
          return () => chain;
        }
        if (prop === "order") {
          return () => chain;
        }
        if (prop === "limit") {
          return (n: number) => {
            limitN = n;
            return chain;
          };
        }
        if (prop === "maybeSingle") {
          return async () => {
            mode = "maybe";
            return run();
          };
        }
        if (prop === "update") {
          return (patch: Row) => {
            updatePatch = patch;
            return chain;
          };
        }
        return () => chain;
      },
    });

    return chain;
  }

  return { from };
}

const state = {
  jobs: [] as Row[],
  deadLetters: [] as Row[],
  events: [] as Row[],
  articles: [] as Row[],
  tenants: [] as Row[],
};

vi.mock("@/lib/supabase", () => ({
  createAdminServerClient: () => createClientMock(state),
  createAdminClient: () => createClientMock(state),
}));

describe("runEditorialBacklogRecovery (queue integration)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    state.jobs = [
      {
        id: "eg-1",
        job_type: "editorial_generate",
        status: "pending",
        tenant_id: "tenant-1",
        dedupe_key: "editorial_generate:tenant-1:a",
        payload: { signalsInserted: 2, sourceEventId: "bus-1" },
        attempts: 1,
        max_attempts: 5,
        last_error: "job_timeout",
        claimed_at: null,
        scheduled_at: new Date().toISOString(),
        created_at: new Date(Date.now() - 3_600_000).toISOString(),
        result: null,
      },
      {
        id: "eg-dup",
        job_type: "editorial_generate",
        status: "pending",
        tenant_id: "tenant-1",
        dedupe_key: "editorial_generate:tenant-1:a",
        payload: { signalsInserted: 1 },
        attempts: 0,
        max_attempts: 5,
        last_error: null,
        claimed_at: null,
        scheduled_at: new Date().toISOString(),
        created_at: new Date(Date.now() - 3_600_000).toISOString(),
        result: null,
      },
    ];
    state.deadLetters = [
      {
        id: "dlq-snap",
        job_type: "intelligence_snapshot",
        dedupe_key: "intelligence_snapshot:tenant-1",
        last_error: "job_timeout",
        metadata: {},
        failed_at: new Date().toISOString(),
      },
    ];
    state.events = [
      {
        id: "evt-fresh",
        tenant_id: "tenant-1",
        created_at: new Date().toISOString(),
      },
    ];
    state.articles = [];
    state.tenants = [{ id: "tenant-1" }];
  });

  it("defaults to dry-run audit and never mutates when dryRun=true", async () => {
    const { runEditorialBacklogRecovery } = await import(
      "@/lib/ops/editorial-backlog-recovery"
    );
    const before = JSON.stringify(state.jobs);
    const result = await runEditorialBacklogRecovery({
      dryRun: true,
      command: "audit",
      jobTypes: ["editorial_generate"],
    });

    expect(result.dryRun).toBe(true);
    expect(result.examined).toBeGreaterThan(0);
    expect(result.actionsAttempted).toBe(0);
    expect(result.audit.length).toBeGreaterThan(0);
    expect(JSON.stringify(state.jobs)).toBe(before);
  });

  it("selects eligible retries only and respects batch limit on dry-run retry", async () => {
    const { runEditorialBacklogRecovery } = await import(
      "@/lib/ops/editorial-backlog-recovery"
    );
    const result = await runEditorialBacklogRecovery({
      dryRun: true,
      command: "retry",
      batchSize: 1,
      jobTypes: ["editorial_generate"],
    });

    expect(result.selected.length).toBeLessThanOrEqual(1);
    expect(
      result.selected.every((s) => s.class === "eligible_immediate_retry")
    ).toBe(true);
    expect(result.actionsSucceeded).toBe(result.selected.length);
  });

  it("classifies DLQ without deleting rows", async () => {
    const { runEditorialBacklogRecovery } = await import(
      "@/lib/ops/editorial-backlog-recovery"
    );
    const before = state.deadLetters.length;
    const result = await runEditorialBacklogRecovery({
      dryRun: true,
      command: "classify-dlq",
    });
    expect(result.dlq?.length).toBe(1);
    expect(result.dlq?.[0]?.resolution).toBe("retryable");
    expect(state.deadLetters.length).toBe(before);
  });

  it("release-stale-claims execute uses reclaim helper", async () => {
    const { runEditorialBacklogRecovery } = await import(
      "@/lib/ops/editorial-backlog-recovery"
    );
    const result = await runEditorialBacklogRecovery({
      dryRun: false,
      command: "release-stale-claims",
    });
    expect(reclaim).toHaveBeenCalled();
    expect(result.summary).toContain("reclaimed_stale_claims=2");
  });
});
