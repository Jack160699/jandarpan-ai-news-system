import { afterEach, describe, expect, it, vi } from "vitest";
import { handleWorkerRequest, type KitDeps, type KitResponseBody, type WorkerRunOutcome, type WorkerSpec } from "./kit";
import { selectRssShard } from "@/lib/news/providers/rss-batch";
import { FETCH_SPEC } from "@/lib/edge/workers/fetch-spec";
import { CLUSTER_SPEC } from "@/lib/edge/workers/cluster-spec";
import { TRANSLATION_SPEC } from "@/lib/edge/workers/translation-spec";

const SECRET = "kit-test-secret";

function makeDeps(over: Partial<KitDeps> = {}) {
  const lines: string[] = [];
  const release = vi.fn(async () => {});
  const deps: KitDeps = {
    acquireLease: vi.fn(async () => ({ acquired: true, release })),
    isSchedulerEnabled: vi.fn(async () => true),
    recordRun: vi.fn(async () => {}),
    drainBackground: vi.fn(async () => {}),
    env: { EDGE_WORKER_SECRET: SECRET },
    newId: () => "run-1",
    logSink: (l) => lines.push(l),
    ...over,
  };
  return { deps, lines, release };
}

function makeSpec(over: Partial<WorkerSpec<{ n: number }>> = {}, outcome?: Partial<WorkerRunOutcome>) {
  const run = vi.fn(async (): Promise<WorkerRunOutcome> => ({ ok: true, processed: 3, details: { x: 1 }, ...outcome }));
  const spec: WorkerSpec<{ n: number }> = {
    job: "test-job",
    parse: (body) => (body.bad ? { ok: false, reason: "nope" } : { ok: true, params: { n: 1 }, leaseKey: "lease-1", label: { shard: 2 } }),
    run,
    ...over,
  };
  return { spec, run };
}

const req = (body: unknown = {}, headers: Record<string, string> = {}, method = "POST") =>
  new Request("http://w.local/", { method, headers: { authorization: `Bearer ${SECRET}`, "content-type": "application/json", ...headers }, body: method === "GET" ? undefined : JSON.stringify(body) });
const go = async <P>(r: Request, spec: WorkerSpec<P>, deps: KitDeps) => {
  const res = await handleWorkerRequest(r, spec, deps);
  return { status: res.status, body: (await res.json()) as KitResponseBody };
};

afterEach(() => vi.useRealTimers());

describe("worker kit: request gating", () => {
  it("405 / 401 / 503 / 400 never run the work", async () => {
    const { spec, run } = makeSpec();
    const { deps } = makeDeps();
    expect((await go(req({}, {}, "GET"), spec, deps)).body.status).toBe("method_not_allowed");
    expect((await go(req({}, { authorization: "Bearer wrong" }), spec, deps)).status).toBe(401);
    expect((await go(req(), spec, makeDeps({ env: {} }).deps)).status).toBe(503);
    expect((await go(req({ bad: true }), spec, deps)).body.reason).toBe("nope");
    const raw = await handleWorkerRequest(new Request("http://w/", { method: "POST", headers: { authorization: `Bearer ${SECRET}` }, body: "{not json" }), spec, deps);
    expect(raw.status).toBe(400);
    expect(run).not.toHaveBeenCalled();
    expect(deps.acquireLease).not.toHaveBeenCalled();
  });

  it("scheduler-triggered runs need scheduler_control.enabled = true (unknown counts as off)", async () => {
    for (const enabled of [false, null]) {
      const { spec, run } = makeSpec();
      const { deps } = makeDeps({ isSchedulerEnabled: vi.fn(async () => enabled) });
      expect((await go(req({}, { "x-jd-trigger": "scheduler" }), spec, deps)).body.status).toBe("kill_switch_off");
      expect(run).not.toHaveBeenCalled();
      expect(deps.acquireLease).not.toHaveBeenCalled();
    }
    const { spec, run } = makeSpec();
    expect((await go(req({}, { "x-jd-trigger": "scheduler" }), spec, makeDeps().deps)).body.status).toBe("completed");
    expect(run).toHaveBeenCalledTimes(1);
  });

  it("precheck can skip before taking a lease", async () => {
    const { spec, run } = makeSpec({ precheck: async () => ({ reason: "queue_backpressure" }) });
    const { deps } = makeDeps();
    const r = await go(req(), spec, deps);
    expect(r.body).toMatchObject({ ok: true, status: "skipped", reason: "queue_backpressure" });
    expect(run).not.toHaveBeenCalled();
    expect(deps.acquireLease).not.toHaveBeenCalled();
  });
});

describe("worker kit: lease and run lifecycle", () => {
  it("refuses an overlapping run (lease held) without doing the work", async () => {
    const { spec, run } = makeSpec();
    const { deps } = makeDeps({ acquireLease: vi.fn(async () => ({ acquired: false, release: async () => {} })) });
    const r = await go(req(), spec, deps);
    expect(r.body).toMatchObject({ ok: true, status: "overlap_lock", lease: { key: "lease-1", acquired: false } });
    expect(run).not.toHaveBeenCalled();
  });

  it("fails closed when the lease cannot be verified", async () => {
    const { spec, run } = makeSpec();
    const { deps } = makeDeps({ acquireLease: vi.fn(async () => { throw new Error("lease_unavailable: db"); }) });
    const r = await go(req(), spec, deps);
    expect(r.status).toBe(500);
    expect(r.body.status).toBe("internal_error");
    expect(run).not.toHaveBeenCalled();
  });

  it("success: runs once, records the run under the dashboard job name, releases the lease, no secret in logs", async () => {
    const { spec, run } = makeSpec();
    const { deps, release, lines } = makeDeps();
    const r = await go(req({}, { "x-correlation-id": "c-9", "x-jd-trigger": "scheduler" }), spec, deps);
    expect(r.body).toMatchObject({ ok: true, status: "completed", job: "test-job", run_id: "run-1", correlation_id: "c-9", result: { x: 1 }, label: { shard: 2 } });
    expect(run).toHaveBeenCalledTimes(1);
    expect(release).toHaveBeenCalledTimes(1);
    expect(deps.recordRun).toHaveBeenCalledWith(expect.objectContaining({ job: "test-job", ok: true, processed: 3, runId: "run-1", metadata: expect.objectContaining({ runtime: "supabase-edge", shard: 2, x: 1 }) }));
    expect(lines.join("\n")).not.toContain(SECRET);
  });

  it("degraded and failed outcomes map to statuses and are recorded as such", async () => {
    const d = makeSpec({}, { ok: true, degraded: true });
    const dr = await go(req(), d.spec, makeDeps().deps);
    expect(dr.body.status).toBe("degraded");
    const f = makeSpec({}, { ok: false, error: "boom", failed: 1 });
    const { deps } = makeDeps();
    const fr = await go(req(), f.spec, deps);
    expect(fr.body).toMatchObject({ ok: false, status: "failed", reason: "boom" });
    expect(deps.recordRun).toHaveBeenCalledWith(expect.objectContaining({ ok: false, failed: 1, error: "boom" }));
  });

  it("an exception becomes internal_error and the lease is still released", async () => {
    const { spec } = makeSpec({ run: async () => { throw new Error("kaboom"); } });
    const { deps, release } = makeDeps();
    const r = await go(req(), spec, deps);
    expect(r.status).toBe(500);
    expect(release).toHaveBeenCalledTimes(1);
  });

  it("deadline exceeded keeps the lease until its TTL (never risks an overlap)", async () => {
    vi.useFakeTimers();
    const { spec } = makeSpec({ run: () => new Promise<WorkerRunOutcome>(() => {}) });
    const { deps, release } = makeDeps();
    const p = handleWorkerRequest(req(), spec, deps);
    await vi.advanceTimersByTimeAsync(136_000);
    const body = (await (await p).json()) as KitResponseBody;
    expect(body.status).toBe("deadline_exceeded");
    expect(release).not.toHaveBeenCalled();
  });
});

describe("worker specs", () => {
  it("fetch: shards bounded, shard validated, per-shard lease key", () => {
    expect(FETCH_SPEC.parse({ shard: 2, shards: 6 }, {})).toMatchObject({ ok: true, params: { shard: 2, shards: 6 }, leaseKey: "edge-fetch-6-2" });
    expect(FETCH_SPEC.parse({ shard: 6, shards: 6 }, {})).toEqual({ ok: false, reason: "shard_out_of_range" });
    expect(FETCH_SPEC.parse({ shards: 99 }, {})).toMatchObject({ ok: true, params: { shards: 12, shard: 0 } });
    expect(FETCH_SPEC.parse({}, {})).toMatchObject({ params: { shard: 0, shards: 1 } });
    expect(FETCH_SPEC.parse({}, { EDGE_FETCH_SHARDS: "6" })).toMatchObject({ params: { shards: 6 } });
  });

  it("cluster and translation: bounded batch sizes, dedicated lease keys", () => {
    expect(CLUSTER_SPEC.parse({ lookback_minutes: 99999 }, {})).toMatchObject({ params: { lookbackMinutes: 360 }, leaseKey: "edge-cluster" });
    expect(TRANSLATION_SPEC.parse({ process_limit: 500, enqueue_limit: 0 }, {})).toMatchObject({ params: { processLimit: 12, enqueueLimit: 1 }, leaseKey: "edge-translation" });
    expect(TRANSLATION_SPEC.parse({}, {})).toMatchObject({ params: { processLimit: 5, enqueueLimit: 40 } });
  });

  it("job names match what the admin dashboard already tracks", () => {
    expect([FETCH_SPEC.job, CLUSTER_SPEC.job, TRANSLATION_SPEC.job]).toEqual(["fetch-news", "cluster", "translation-backfill"]);
  });
});

describe("RSS shard partition", () => {
  const feeds = Array.from({ length: 103 }, (_, i) => `feed-${i}`);

  it("every feed is polled by exactly one shard (a true partition), for any shard count", () => {
    for (const count of [1, 2, 3, 6, 12]) {
      const all = Array.from({ length: count }, (_, index) => selectRssShard(feeds, { index, count }));
      expect(all.flat().sort()).toEqual([...feeds].sort());
      expect(new Set(all.flat()).size).toBe(feeds.length);
      const sizes = all.map((s) => s.length);
      expect(Math.max(...sizes) - Math.min(...sizes)).toBeLessThanOrEqual(1); // balanced
    }
  });

  it("no shard option = all feeds; priority order is preserved so each shard gets a fair share of top feeds", () => {
    expect(selectRssShard(feeds)).toEqual(feeds);
    expect(selectRssShard(feeds, { index: 0, count: 6 }).slice(0, 3)).toEqual(["feed-0", "feed-6", "feed-12"]);
    expect(selectRssShard(feeds, { index: 7, count: 6 })).toEqual(selectRssShard(feeds, { index: 1, count: 6 }));
  });
});
