import { describe, expect, it, vi } from "vitest";
import { handleWorkerRequest, type KitDeps, type KitResponseBody, type WorkerRunOutcome, type WorkerSpec } from "./kit";

const SECRET = "kit-gov-secret";

function makeDeps(over: Partial<KitDeps> = {}) {
  const deps: KitDeps = {
    acquireLease: vi.fn(async () => ({ acquired: true, release: async () => {} })),
    isSchedulerEnabled: vi.fn(async () => true),
    recordRun: vi.fn(async () => {}),
    drainBackground: vi.fn(async () => {}),
    env: { EDGE_WORKER_SECRET: SECRET },
    newId: () => "run-1",
    logSink: () => {},
    ...over,
  };
  return deps;
}
const run = vi.fn(async (): Promise<WorkerRunOutcome> => ({ ok: true, processed: 1, details: { x: 1 } }));
const spec: WorkerSpec<{ n: number }> = {
  job: "gov-test",
  parse: () => ({ ok: true, params: { n: 1 }, leaseKey: "k", label: {} }),
  run,
};
const req = (trigger: string) =>
  new Request("http://w.local/", { method: "POST", headers: { authorization: `Bearer ${SECRET}`, "content-type": "application/json", "x-jd-trigger": trigger }, body: "{}" });
const go = async (r: Request, d: KitDeps) => {
  const res = await handleWorkerRequest(r, spec, d);
  return (await res.json()) as KitResponseBody;
};

const ALLOW = { allow: true, state: "ok", reason: null, usedBytes: 10 };
const STOP = { allow: false, state: "stop", reason: "egress_budget_stop", usedBytes: 3_000_000_000 };

describe("egress governor inside the worker kit", () => {
  it("PAUSED SCHEDULER: the kill switch answers first -- the governor is never consulted and no counter is touched", async () => {
    run.mockClear();
    const evaluateEgress = vi.fn(async () => ALLOW);
    const recordEgress = vi.fn(async () => ({ recorded: true, bytes: 1, total: 1 }));
    const body = await go(req("scheduler"), makeDeps({ isSchedulerEnabled: vi.fn(async () => false), evaluateEgress, recordEgress }));
    expect(body.status).toBe("kill_switch_off");
    expect(evaluateEgress).not.toHaveBeenCalled();
    expect(recordEgress).not.toHaveBeenCalled();
    expect(run).not.toHaveBeenCalled();
  });

  it("enforce STOP: a scheduler run is skipped BEFORE a lease is taken or any work/read happens", async () => {
    run.mockClear();
    const deps = makeDeps({ evaluateEgress: vi.fn(async () => STOP) });
    const body = await go(req("scheduler"), deps);
    expect(body).toMatchObject({ ok: true, status: "skipped", reason: "egress_budget_stop" });
    expect(deps.acquireLease).not.toHaveBeenCalled();
    expect(run).not.toHaveBeenCalled();
    expect(deps.recordRun).not.toHaveBeenCalled();
  });

  it("allowed (ok / warn): the work runs and the run's bytes are recorded in the run metadata", async () => {
    run.mockClear();
    const recordEgress = vi.fn(async () => ({ recorded: true, bytes: 4096, total: 9000 }));
    const deps = makeDeps({ evaluateEgress: vi.fn(async () => ({ ...ALLOW, state: "warn" })), recordEgress });
    const body = await go(req("scheduler"), deps);
    expect(body.status).toBe("completed");
    expect(run).toHaveBeenCalledTimes(1);
    expect(recordEgress).toHaveBeenCalledTimes(1);
    expect((deps.recordRun as ReturnType<typeof vi.fn>).mock.calls[0]![0].metadata.egress_governor).toEqual({ recorded: true, bytes: 4096, total: 9000 });
  });

  it("manual / probe triggers are not governed (operators can still run a diagnostic); a governor error cannot crash recording", async () => {
    run.mockClear();
    const evaluateEgress = vi.fn(async () => STOP);
    const body = await go(req("manual"), makeDeps({ evaluateEgress, recordEgress: vi.fn(async () => { throw new Error("redis"); }) }));
    expect(evaluateEgress).not.toHaveBeenCalled();
    expect(body.status).toBe("completed");
  });

  it("no governor wired (the production default while JD_EGRESS_GOVERNOR is unset still goes through the off path): behaviour unchanged", async () => {
    run.mockClear();
    const body = await go(req("scheduler"), makeDeps());
    expect(body.status).toBe("completed");
    expect(run).toHaveBeenCalledTimes(1);
  });
});
