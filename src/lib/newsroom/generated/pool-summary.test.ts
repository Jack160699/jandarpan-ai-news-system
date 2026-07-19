import { beforeEach, describe, expect, it, vi } from "vitest";

const maybeSingle = vi.fn();
const publishedHead = vi.fn();
const pendingHead = vi.fn();

vi.mock("@/lib/supabase", () => ({
  isSupabaseConfigured: () => true,
  createAnonServerClient: () => ({
    from: () => ({
      select: (_cols: string, opts?: { count?: string; head?: boolean }) => {
        if (opts?.head) {
          const chain = {
            not: () => ({
              in: () => publishedHead(),
            }),
            eq: () => pendingHead(),
          };
          return chain;
        }
        const chain = {
          not: () => chain,
          in: () => chain,
          order: () => chain,
          limit: () => chain,
          maybeSingle: () => maybeSingle(),
        };
        return chain;
      },
    }),
  }),
}));

describe("getGeneratedPoolSummary", () => {
  beforeEach(() => {
    vi.resetModules();
    maybeSingle.mockReset();
    publishedHead.mockReset();
    pendingHead.mockReset();
  });

  it("returns bounded summary without scanning article bodies", async () => {
    maybeSingle.mockResolvedValue({
      data: { published_at: "2026-07-19T10:00:00.000Z" },
      error: null,
    });
    publishedHead.mockResolvedValue({ count: 42, error: null });
    pendingHead.mockResolvedValue({ count: 3, error: null });

    const { getGeneratedPoolSummary, clearGeneratedPoolSummaryCache } =
      await import("@/lib/newsroom/generated/pool-summary");
    clearGeneratedPoolSummaryCache();

    const first = await getGeneratedPoolSummary({ forceRefresh: true });
    expect(first.ok).toBe(true);
    expect(first.hasPublished).toBe(true);
    expect(first.publishedCount).toBe(42);
    expect(first.pendingCount).toBe(3);
    expect(first.fromCache).toBe(false);

    const second = await getGeneratedPoolSummary();
    expect(second.fromCache).toBe(true);
    expect(second.publishedCount).toBe(42);
  });

  it("falls back to last-known summary on timeout", async () => {
    maybeSingle.mockResolvedValue({
      data: { published_at: "2026-07-19T10:00:00.000Z" },
      error: null,
    });
    publishedHead.mockResolvedValue({ count: 10, error: null });
    pendingHead.mockResolvedValue({ count: 1, error: null });

    const { getGeneratedPoolSummary, clearGeneratedPoolSummaryCache } =
      await import("@/lib/newsroom/generated/pool-summary");
    clearGeneratedPoolSummaryCache();
    await getGeneratedPoolSummary({ forceRefresh: true });

    maybeSingle.mockResolvedValueOnce({
      data: null,
      error: {
        message: "canceling statement due to statement timeout",
        code: "57014",
      },
    });

    const timedOut = await getGeneratedPoolSummary({ forceRefresh: true });
    expect(timedOut.fromCache).toBe(true);
    expect(timedOut.timedOut).toBe(true);
    expect(timedOut.publishedCount).toBe(10);
  });
});
