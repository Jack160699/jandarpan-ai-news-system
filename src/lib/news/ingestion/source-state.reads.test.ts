import { beforeEach, describe, expect, it, vi } from "vitest";

type Call = { op: string; table: string; cols?: string };
const calls: Call[] = [];
const storedRow = {
  source_key: "rss:x", provider_family: "rss", tenant_id: null, enabled: true, health_state: "healthy", parser_type: null,
  last_attempted_at: null, last_successful_at: null, last_new_item_at: "2026-10-01T00:00:00Z", last_item_timestamp: "2026-10-01T00:00:00Z",
  cursor_token: "tok", etag: "e", last_modified: null, consecutive_failures: 0, consecutive_empty_runs: 2, disabled_until: null,
  quota_exhausted_until: null, rate_limited_until: null, retirement_reason: null, last_error_category: null, lease_owner: null,
  lease_expires_at: null, metadata: { keep: "me" },
};
let upserted: Record<string, unknown> | null = null;

vi.mock("@/lib/supabase", () => ({
  isSupabaseConfigured: () => true,
  createAdminServerClient: () => ({
    from: (table: string) => {
      let op = "select";
      let cols = "";
      const api: Record<string, unknown> = {
        select: (c?: string) => { cols = c ?? "*"; return api; },
        upsert: (row: Record<string, unknown>) => { op = "upsert"; upserted = row; return api; },
        eq: () => api, is: () => api, in: () => api, limit: () => api,
        maybeSingle: async () => {
          calls.push({ op, table, cols });
          return { data: op === "select" ? storedRow : { source_key: "rss:x" }, error: null };
        },
      };
      return api;
    },
  }),
}));

beforeEach(() => {
  calls.length = 0;
  upserted = null;
  vi.resetModules();
});

describe("source-state: no redundant rereads", () => {
  it("upsert with a caller-supplied prev row makes ONE request and asks for a one-column echo", async () => {
    const { upsertIngestionSourceState } = await import("./source-state");
    await upsertIngestionSourceState({ source_key: "rss:x", provider_family: "rss", health_state: "healthy" }, null, { prev: storedRow as never });
    expect(calls).toEqual([{ op: "upsert", table: "ingestion_source_state", cols: "source_key" }]);
  });

  it("without prev it still loads the current row first (2 requests) -- behaviour for other callers is unchanged", async () => {
    const { upsertIngestionSourceState } = await import("./source-state");
    await upsertIngestionSourceState({ source_key: "rss:x", provider_family: "rss" });
    expect(calls.map((c) => c.op)).toEqual(["select", "upsert"]);
  });

  it("the merged row still carries the previous row's cursor, etag and metadata (a full-row upsert must not null them)", async () => {
    const { upsertIngestionSourceState } = await import("./source-state");
    const next = await upsertIngestionSourceState({ source_key: "rss:x", provider_family: "rss", last_successful_at: "2026-10-02T00:00:00Z" }, null, { prev: storedRow as never });
    expect(upserted).toMatchObject({ cursor_token: "tok", etag: "e", metadata: { keep: "me" }, last_item_timestamp: "2026-10-01T00:00:00Z", consecutive_empty_runs: 2 });
    expect(next.last_successful_at).toBe("2026-10-02T00:00:00Z");
  });

  it("prev: null means 'no row yet' and creates one without a read", async () => {
    const { upsertIngestionSourceState } = await import("./source-state");
    await upsertIngestionSourceState({ source_key: "rss:new", provider_family: "rss" }, null, { prev: null });
    expect(calls.map((c) => c.op)).toEqual(["upsert"]);
    expect(upserted).toMatchObject({ enabled: true, health_state: "unknown", consecutive_empty_runs: 0 });
  });

  it("the cursor CAS reads the row once and reuses it for the write (was: read, read again, write, echo)", async () => {
    const { advanceSourceCursorSafe } = await import("./source-state");
    const res = await advanceSourceCursorSafe({
      sourceKey: "rss:x", providerFamily: "rss", expectedPrevious: "2026-10-01T00:00:00Z", nextTimestamp: "2026-10-02T00:00:00Z", newItemCount: 3,
    });
    expect(res.advanced).toBe(true);
    expect(calls.map((c) => c.op)).toEqual(["select", "upsert"]);
  });

  it("a stale expected cursor is still refused without writing (CAS preserved)", async () => {
    const { advanceSourceCursorSafe } = await import("./source-state");
    const res = await advanceSourceCursorSafe({ sourceKey: "rss:x", providerFamily: "rss", expectedPrevious: "1999-01-01T00:00:00Z", nextTimestamp: "2026-10-02T00:00:00Z" });
    expect(res.advanced).toBe(false);
    expect(calls.map((c) => c.op)).toEqual(["select"]);
  });
});
