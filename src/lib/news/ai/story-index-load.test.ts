import { beforeEach, describe, expect, it, vi } from "vitest";

const store = new Map<string, string>();
vi.mock("@/lib/infrastructure/cache/redis", async (orig) => ({
  ...(await orig<object>()),
  isRedisConfigured: () => true,
  redisGet: async (k: string) => store.get(k) ?? null,
  redisDel: async (k: string) => void store.delete(k),
  redisEval: async (_s: string, keys: string[], args: unknown[]) => (store.set(keys[0]!, String(args[0])), 1),
}));

const dbCalls: string[] = [];
const dbRows = Array.from({ length: 5 }, (_, i) => ({
  id: `a${i}`, headline: `h${i}`, event_id: `e${i}`, hero_image_url: null, workflow_status: "published", published_at: "2026-10-01T00:00:00Z", body_fingerprint: `fp${i}`,
}));
const fakeSupabase = {
  from: (t: string) => ({
    select: (cols: string) => {
      dbCalls.push(`${t}:${cols.slice(0, 40)}`);
      const chain: Record<string, unknown> = {};
      chain.order = () => chain;
      chain.limit = () => Promise.resolve({ data: dbRows, error: null });
      chain.in = () => Promise.resolve({ data: [], error: null });
      return chain;
    },
  }),
};

beforeEach(() => {
  store.clear();
  dbCalls.length = 0;
});

describe("loadStoryIndexRows", () => {
  it("first wake reads Supabase once and fills Redis; the next wakes read NOTHING from Supabase until a story is persisted", async () => {
    const { loadStoryIndexRows } = await import("./generate-article");
    const { invalidateStoryIndexCache } = await import("./story-index-cache");

    const first = await loadStoryIndexRows(fakeSupabase as never);
    expect(first).toHaveLength(5);
    expect(dbCalls).toHaveLength(1);

    dbCalls.length = 0;
    const second = await loadStoryIndexRows(fakeSupabase as never);
    const third = await loadStoryIndexRows(fakeSupabase as never);
    expect(second).toEqual(first);
    expect(third).toEqual(first);
    expect(dbCalls).toHaveLength(0);

    await invalidateStoryIndexCache(); // what persistGeneratedArticle does after inserting a story
    await loadStoryIndexRows(fakeSupabase as never);
    expect(dbCalls).toHaveLength(1);
  });
});
