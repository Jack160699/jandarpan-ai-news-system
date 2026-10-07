import { beforeEach, describe, expect, it, vi } from "vitest";

const H = 3_600_000;
const D = 24 * H;
const iso = (ageMs: number) => new Date(Date.now() - ageMs).toISOString();

function row(id: string, ageMs: number, extra: Record<string, unknown> = {}) {
  return {
    id,
    slug: `s-${id}`,
    headline: `रायपुर में ${id} सड़क हादसा, पांच घायल`,
    summary: "सार",
    published_at: iso(ageMs),
    created_at: iso(ageMs),
    editorial_status: "approved",
    language: "hi",
    tags: [],
    editorial_metadata: {},
    geo_metadata: { scope: "STATEWIDE_CHHATTISGARH" },
    ...extra,
  };
}

let dbRows: Array<Record<string, unknown>> = [];
let snapshotRows: Array<Record<string, unknown>> | null = null;
const saved: Array<unknown> = [];

vi.mock("@/lib/newsroom/generated/read", () => ({ fetchGeneratedArticlePool: async () => dbRows }));
vi.mock("@/lib/supabase", () => ({ isSupabaseConfigured: () => true }));
vi.mock("@/lib/news/live-feed/stale-snapshot", () => ({
  loadStaleSnapshotWithMeta: async () => (snapshotRows ? { snapshot: { rows: snapshotRows }, ageMs: 5 * 60_000 } : null),
  saveFeedSnapshot: async (rows: unknown) => {
    saved.push(rows);
  },
}));
vi.mock("@/lib/news/live-feed/observability", () => ({
  flushAggregationMetrics: () => {},
  recordPoolMeta: () => {},
  recordStaleServe: () => {},
  resetAggregationMetrics: () => {},
}));
vi.mock("@/lib/news/live-feed/logger", () => ({ errorLiveFeed: () => {}, logLiveFeed: () => {}, warnLiveFeed: () => {} }));
vi.mock("@/lib/news/live-feed/wire-cache", () => ({ getWireArticlesCached: async () => [] }));
vi.mock("@/lib/news/fallback/wire-articles", () => ({
  getStaticFallbackArticlePool: () => [row("static-fresh", H) as never, row("static-ancient", 40 * D) as never],
}));

import { resolveLiveArticlePool } from "./resolve-pool";

beforeEach(() => {
  dbRows = [];
  snapshotRows = null;
  saved.length = 0;
  vi.unstubAllEnvs();
});

describe("resolveLiveArticlePool: a fallback must never violate the public rules", () => {
  it("never falls back to out-of-window rows when nothing in the database is inside the 30-day window", async () => {
    dbRows = [row("ancient-1", 45 * D), row("ancient-2", 60 * D)];
    const { rows, diagnostics } = await resolveLiveArticlePool(60, { select: "homepage" });
    expect(rows).toEqual([]);
    expect(diagnostics.finalCount).toBe(0);
  });

  it("drops rows that fail the public gate (pending, generic headline) even when they are fresh", async () => {
    dbRows = [row("ok", H), row("pending", H, { editorial_status: "pending" }), row("generic", H, { headline: "Regional News Update" })];
    const { rows } = await resolveLiveArticlePool(60, { select: "homepage" });
    expect(rows.map((r) => r.id)).toEqual(["ok"]);
  });

  it("re-validates a stale snapshot: ancient and non-public rows in the snapshot are not served", async () => {
    snapshotRows = [row("snap-ok", 2 * H), row("snap-ancient", 50 * D), row("snap-pending", H, { editorial_status: "pending" })];
    const { rows, diagnostics } = await resolveLiveArticlePool(60, { select: "homepage" });
    expect(diagnostics.source).toBe("stale_snapshot");
    expect(rows.map((r) => r.id)).toEqual(["snap-ok"]);
  });

  it("serves an EMPTY pool, not the frozen static articles, when every layer is empty (default)", async () => {
    const { rows, diagnostics } = await resolveLiveArticlePool(60, { select: "homepage" });
    expect(rows).toEqual([]);
    expect(diagnostics.finalCount).toBe(0);
    // the real saveFeedSnapshot ignores an empty list, so an empty pool can never overwrite the "last good" snapshot
    expect(saved.filter((r) => (r as unknown[]).length > 0)).toHaveLength(0);
  });

  it("the static pool is opt-in, and even then only in-window rows are served", async () => {
    vi.stubEnv("ALLOW_STATIC_FALLBACK_POOL", "true");
    const { rows } = await resolveLiveArticlePool(60, { select: "homepage" });
    expect(rows.map((r) => r.id)).toEqual(["static-fresh"]);
  });
});
