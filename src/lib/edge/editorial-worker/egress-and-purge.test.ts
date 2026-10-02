import { describe, expect, it, vi } from "vitest";
import { handleEditorialWorkerRequest, type WorkerDeps, type WorkerResponseBody } from "./handler";
import type { BatchEditorialResult } from "@/lib/news/ai/editorial-types";

const SECRET = "egress-purge-secret";

const batch = (over: Partial<BatchEditorialResult> = {}): BatchEditorialResult => ({
  generated: 0, rejected: 0, published: 0, repaired: 0, skipped: 0, avgConfidence: 0, topStory: null, errors: [], results: [], ...over,
});

function makeDeps(over: Partial<WorkerDeps> = {}) {
  const deps: WorkerDeps = {
    generate: vi.fn(async () => batch()),
    acquireLease: vi.fn(async () => ({ acquired: true, release: async () => {} })),
    isSchedulerEnabled: vi.fn(async () => true),
    isAnyProviderConfigured: () => true,
    isDurableQuotaConfigured: () => true,
    recordRun: vi.fn(async () => {}),
    drainBackground: vi.fn(async () => {}),
    env: { EDGE_WORKER_SECRET: SECRET, NEWSROOM_GENERATE_ARTICLES: "true" },
    newId: () => "run-id-1",
    logSink: () => {},
    ...over,
  };
  return deps;
}
const req = (trigger = "scheduler", body: unknown = {}) =>
  new Request("http://worker.local/", { method: "POST", headers: { authorization: `Bearer ${SECRET}`, "content-type": "application/json", "x-jd-trigger": trigger }, body: JSON.stringify(body) });
const run = async (r: Request, d: WorkerDeps) => {
  const res = await handleEditorialWorkerRequest(r, d);
  return (await res.json()) as WorkerResponseBody;
};

const STOP = { allow: false, state: "stop", reason: "egress_budget_stop", usedBytes: 3e9 };
const published = batch({
  generated: 1, published: 1,
  results: [{ eventId: "0d8a5c0e-1b1f-4e0a-9c55-0123456789ab", ok: true, articleId: "art-1", published: true, draftPreview: { headline: "h" } } as never],
});

describe("editorial worker: egress governor", () => {
  it("enforce STOP skips a scheduler run before a lease, a DB read or any AI call", async () => {
    const deps = makeDeps({ evaluateEgress: vi.fn(async () => STOP) });
    const body = await run(req(), deps);
    expect(body.status).toBe("egress_budget_stop");
    expect(deps.acquireLease).not.toHaveBeenCalled();
    expect(deps.generate).not.toHaveBeenCalled();
    expect(deps.recordRun).not.toHaveBeenCalled();
  });

  it("PAUSED SCHEDULER: the kill switch wins and the governor is not consulted", async () => {
    const evaluateEgress = vi.fn(async () => STOP);
    const deps = makeDeps({ isSchedulerEnabled: vi.fn(async () => false), evaluateEgress });
    expect((await run(req(), deps)).status).toBe("kill_switch_off");
    expect(evaluateEgress).not.toHaveBeenCalled();
  });

  it("an allowed run records its bytes in the run metadata", async () => {
    const recordEgress = vi.fn(async () => ({ recorded: true, bytes: 1234, total: 5678 }));
    const deps = makeDeps({ evaluateEgress: vi.fn(async () => ({ allow: true, state: "ok", reason: null, usedBytes: 1 })), recordEgress });
    await run(req(), deps);
    expect(deps.generate).toHaveBeenCalledTimes(1);
    expect((deps.recordRun as ReturnType<typeof vi.fn>).mock.calls[0]![0].metadata.egress_governor).toEqual({ recorded: true, bytes: 1234, total: 5678 });
  });

  it("not governed when no governor is wired (default) or for manual triggers", async () => {
    const evaluateEgress = vi.fn(async () => STOP);
    expect((await run(req("manual"), makeDeps({ evaluateEgress }))).status).not.toBe("egress_budget_stop");
    expect(evaluateEgress).not.toHaveBeenCalled();
    expect((await run(req(), makeDeps())).status).toBe("no_eligible_item");
  });
});

describe("editorial worker: no duplicate cache refreshes", () => {
  it("purges the site once per PUBLISHED story, never for idle / unpublished / dry-run wakes", async () => {
    const revalidatePublished = vi.fn(async () => {});
    await run(req(), makeDeps({ generate: vi.fn(async () => published), revalidatePublished }));
    expect(revalidatePublished).toHaveBeenCalledTimes(1);

    revalidatePublished.mockClear();
    await run(req(), makeDeps({ revalidatePublished })); // idle wake
    await run(req("manual", { mode: "test", dry_run: true }), makeDeps({ generate: vi.fn(async () => published), revalidatePublished, env: { EDGE_WORKER_SECRET: SECRET, NEWSROOM_GENERATE_ARTICLES: "true", EDGE_WORKER_TEST_MODE: "true" } }));
    expect(revalidatePublished).not.toHaveBeenCalled();
  });
});
