import { afterEach, describe, expect, it, vi } from "vitest";

const buildSnapshot = vi.fn();
vi.mock("@/lib/intelligence", async (orig) => ({ ...(await orig<object>()), buildNewsroomIntelligenceSnapshot: buildSnapshot, saveIntelligenceSnapshot: vi.fn() }));
vi.mock("@/lib/supabase", () => ({ createAdminClient: () => ({}), createAdminServerClient: () => ({}), isSupabaseConfigured: () => false }));
const enqueueJob = vi.fn(async () => "job-1");
vi.mock("@/lib/infrastructure/jobs/queue", () => ({ enqueueJob }));

afterEach(() => {
  vi.resetModules();
  buildSnapshot.mockReset();
  enqueueJob.mockClear();
  delete process.env.INTELLIGENCE_SNAPSHOT_ENABLED;
});

describe("legacy intelligence snapshot is disabled by default", () => {
  it("config: off unless INTELLIGENCE_SNAPSHOT_ENABLED=true", async () => {
    expect((await import("@/lib/infrastructure/config")).INFRA_CONFIG.intelligenceSnapshotEnabled).toBe(false);
    vi.resetModules();
    process.env.INTELLIGENCE_SNAPSHOT_ENABLED = "true";
    expect((await import("@/lib/infrastructure/config")).INFRA_CONFIG.intelligenceSnapshotEnabled).toBe(true);
  });

  it("event bus never fans an ingest / publish event out to the snapshot job when disabled", async () => {
    const { jobsForTopic } = await import("./event-bus");
    for (const topic of ["ingest.completed", "articles.published", "intelligence.refresh"] as const) {
      expect(jobsForTopic(topic, false)).not.toContain("intelligence_snapshot");
    }
    // the other (non-snapshot) fan-out is untouched
    expect(jobsForTopic("ingest.completed", false)).toEqual(expect.arrayContaining(["editorial_generate", "event_cluster"]));
    expect(jobsForTopic("articles.published", false)).toEqual(expect.arrayContaining(["embed_articles", "seo_analysis"]));
    expect(jobsForTopic("ingest.completed", true)).toContain("intelligence_snapshot");
  });

  it("an already-queued snapshot job completes as a no-op and never builds the ~2 MB snapshot", async () => {
    const { JOB_HANDLERS } = await import("@/lib/infrastructure/jobs/handlers");
    const handler = JOB_HANDLERS.get("intelligence_snapshot")!;
    const res = await handler({ id: "j", tenant_id: null, payload: {} } as never);
    expect(res).toMatchObject({ ok: true, result: { skipped: "intelligence_snapshot_disabled" } });
    expect(buildSnapshot).not.toHaveBeenCalled();
  });

  it("seo_analysis / intelligence_summary no longer enqueue or build a snapshot while disabled", async () => {
    const { JOB_HANDLERS } = await import("@/lib/infrastructure/jobs/handlers");
    await JOB_HANDLERS.get("seo_analysis")!({ id: "j", tenant_id: null, payload: {} } as never);
    await JOB_HANDLERS.get("intelligence_summary")!({ id: "j", tenant_id: null, payload: {} } as never);
    expect(enqueueJob).not.toHaveBeenCalled();
    expect(buildSnapshot).not.toHaveBeenCalled();
  });
});
