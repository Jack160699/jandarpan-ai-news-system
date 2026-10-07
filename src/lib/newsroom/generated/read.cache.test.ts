import { beforeEach, describe, expect, it, vi } from "vitest";

const calls: Array<{ limit: number }> = [];
const chainCalls: Array<[string, unknown[]]> = [];
let rowsToReturn: Array<Record<string, unknown>> = [];

const row = (i: number) => ({
  id: `a${i}`,
  slug: `story-${i}`,
  published_at: new Date(Date.now() - (i + 1) * 60_000).toISOString(),
  created_at: new Date(Date.now() - (i + 2) * 60_000).toISOString(),
  editorial_status: "approved",
  workflow_status: "published",
  headline: `शीर्षक ${i}`,
  summary: "सार",
  language: "hi",
});

vi.mock("@/lib/supabase", () => ({
  isSupabaseConfigured: () => true,
  createAnonServerClient: () => ({
    from: () => ({
      select: () => {
        const chain: Record<string, unknown> = {};
        const self = () => chain;
        for (const k of ["not", "in", "eq", "ilike", "gte", "lt", "order", "abortSignal"]) {
          chain[k] = (...args: unknown[]) => {
            chainCalls.push([k, args]);
            return chain;
          };
        }
        void self;
        chain.limit = (n: number) => {
          calls.push({ limit: n });
          return Promise.resolve({ data: rowsToReturn.slice(0, n), error: null });
        };
        return chain;
      },
    }),
  }),
}));
vi.mock("@/lib/news/live-feed/logger", () => ({ errorLiveFeed: vi.fn(), logLiveFeed: vi.fn(), warnLiveFeed: vi.fn() }));
vi.mock("@/lib/newsroom/logger", () => ({ logNewsroom: vi.fn() }));
vi.mock("@/lib/news/fallback/wire-articles", () => ({
  getStaticFallbackArticlePool: () => [
    { id: "static", slug: "static", headline: "fallback", published_at: new Date(Date.now() - 60_000).toISOString() },
    { id: "static-old", slug: "static-old", headline: "frozen", published_at: "2026-08-01T06:36:43.000Z" },
  ],
}));

beforeEach(async () => {
  vi.resetModules();
  calls.length = 0;
  chainCalls.length = 0;
  vi.unstubAllEnvs();
  rowsToReturn = Array.from({ length: 300 }, (_, i) => row(i));
  const { clearSharedReadMemo } = await import("@/lib/infrastructure/cache/shared-read-cache");
  clearSharedReadMemo();
});

describe("list pool reads are shared, not per-request", () => {
  it("identical and nearby-limit requests cost ONE database read", async () => {
    const { fetchGeneratedArticlePool } = await import("./read");
    const a = await fetchGeneratedArticlePool(160, { select: "homepage" });
    const b = await fetchGeneratedArticlePool(120, { select: "homepage" });
    const c = await fetchGeneratedArticlePool(140, { select: "homepage" });
    expect(calls).toHaveLength(1);
    expect(calls[0]!.limit).toBe(160); // the single list size, not the caller's limit
    expect(a).toHaveLength(160);
    expect(b).toHaveLength(120);
    expect(c).toHaveLength(140);
    // the smaller answer is a prefix (newest-first) of the larger one
    expect(b.map((r) => r.slug)).toEqual(a.slice(0, 120).map((r) => r.slug));
  });

  it("a request above the list size gets its own read; modes never share a cache entry; the broadcast pool is a small separate read", async () => {
    const { fetchGeneratedArticlePool } = await import("./read");
    await fetchGeneratedArticlePool(160, { select: "homepage" });
    await fetchGeneratedArticlePool(200, { select: "homepage" });
    await fetchGeneratedArticlePool(200, { select: "homepage" });
    await fetchGeneratedArticlePool(160, { select: "homepage_bodies" });
    await fetchGeneratedArticlePool(40, { select: "homepage_bodies" });
    expect(calls.map((c) => c.limit)).toEqual([160, 200, 160, 60]);
  });

  it("does not cache cursor pages or non-list modes", async () => {
    const { fetchGeneratedArticlePool } = await import("./read");
    await fetchGeneratedArticlePool(50, { select: "homepage", cursorPublishedAt: "2026-07-19T12:00:00.000Z" });
    await fetchGeneratedArticlePool(50, { select: "homepage", cursorPublishedAt: "2026-07-19T12:00:00.000Z" });
    expect(calls).toHaveLength(2);
  });

  it("never caches an empty database result, and an empty result stays EMPTY (no frozen static pool)", async () => {
    rowsToReturn = [];
    const { fetchGeneratedArticlePool } = await import("./read");
    const first = await fetchGeneratedArticlePool(160, { select: "homepage" });
    expect(first).toEqual([]);
    await fetchGeneratedArticlePool(160, { select: "homepage" });
    // nothing was memoised: both requests hit the database
    expect(calls.length).toBeGreaterThanOrEqual(2);
    rowsToReturn = Array.from({ length: 10 }, (_, i) => row(i));
    const recovered = await fetchGeneratedArticlePool(160, { select: "homepage" });
    expect(recovered[0]?.slug).toBe("story-0");
  });

  it("the static pool is opt-in, and even then respects the 30-day window", async () => {
    vi.stubEnv("ALLOW_STATIC_FALLBACK_POOL", "true");
    rowsToReturn = [];
    const { fetchGeneratedArticlePool } = await import("./read");
    const out = await fetchGeneratedArticlePool(160, { select: "homepage" });
    expect(out.map((r) => r.slug)).toEqual(["static"]); // a frozen story older than 30 days is dropped
  });

  it("queries with the 30-day cutoff and a deterministic id tiebreak after published_at", async () => {
    const { fetchGeneratedArticlePool } = await import("./read");
    await fetchGeneratedArticlePool(160, { select: "homepage" });
    const gte = chainCalls.find(([k, a]) => k === "gte" && a[0] === "published_at");
    expect(gte).toBeDefined();
    const cutoff = Date.parse(String(gte![1][1]));
    expect(Math.abs(Date.now() - cutoff - 30 * 24 * 3_600_000)).toBeLessThan(60_000);
    const orders = chainCalls.filter(([k]) => k === "order").map(([, a]) => a[0]);
    expect(orders).toEqual(["published_at", "id"]);
  });
});
