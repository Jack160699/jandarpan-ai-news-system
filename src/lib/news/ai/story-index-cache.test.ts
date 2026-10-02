import { beforeEach, describe, expect, it, vi } from "vitest";

const store = new Map<string, string>();
let configured = true;
let redisBroken = false;
const evalCalls: Array<{ script: string; keys: string[]; args: unknown[] }> = [];

vi.mock("@/lib/infrastructure/cache/redis", () => ({
  isRedisConfigured: () => configured,
  redisGet: async (k: string) => {
    if (redisBroken) throw new Error("redis down");
    return store.get(k) ?? null;
  },
  redisDel: async (k: string) => {
    if (redisBroken) throw new Error("redis down");
    store.delete(k);
  },
  redisEval: async (script: string, keys: string[], args: unknown[]) => {
    if (redisBroken) throw new Error("redis down");
    evalCalls.push({ script, keys, args });
    store.set(keys[0]!, String(args[0]));
    return 1;
  },
}));

import {
  invalidateStoryIndexCache,
  packStoryIndex,
  readStoryIndexCache,
  STORY_INDEX_CACHE_KEY,
  STORY_INDEX_CACHE_TTL_SECONDS,
  unpackStoryIndex,
  writeStoryIndexCache,
  type StoryIndexCacheRow,
} from "./story-index-cache";

const rows: StoryIndexCacheRow[] = Array.from({ length: 150 }, (_, i) => ({
  id: `a${i}`, headline: `शीर्षक ${i}`, event_id: `e${i}`, hero_image_url: i % 3 ? `https://img/${i}.jpg` : null,
  workflow_status: "published", published_at: "2026-10-01T00:00:00Z", fingerprint: `fp${i}`,
}));

beforeEach(() => {
  store.clear();
  evalCalls.length = 0;
  configured = true;
  redisBroken = false;
});

describe("story index cache (Redis)", () => {
  it("round-trips every field and is compact", () => {
    const raw = packStoryIndex(rows, 150);
    expect(unpackStoryIndex(raw, 150)).toEqual(rows);
    expect(raw.length).toBeLessThan(150 * 140);
  });

  it("rejects a copy written for a different limit, an expired copy, corrupt JSON and empty values (all = cache miss)", () => {
    const raw = packStoryIndex(rows, 150, 1_000_000);
    expect(unpackStoryIndex(raw, 300, 1_000_000)).toBeNull();
    expect(unpackStoryIndex(raw, 150, 1_000_000 + (STORY_INDEX_CACHE_TTL_SECONDS + 1) * 1000)).toBeNull();
    expect(unpackStoryIndex("{not json", 150)).toBeNull();
    expect(unpackStoryIndex('{"v":2}', 150)).toBeNull();
    expect(unpackStoryIndex(null, 150)).toBeNull();
  });

  it("write -> read hits; the value travels in the EVAL body with a TTL (never in a URL)", async () => {
    await writeStoryIndexCache(rows, 150);
    expect(evalCalls).toHaveLength(1);
    expect(evalCalls[0]!.script).toMatch(/'EX'/);
    expect(evalCalls[0]!.args[1]).toBe(STORY_INDEX_CACHE_TTL_SECONDS);
    expect(await readStoryIndexCache(150)).toEqual(rows);
  });

  it("invalidate (called when a story is persisted) forces the next read to miss", async () => {
    await writeStoryIndexCache(rows, 150);
    await invalidateStoryIndexCache();
    expect(store.has(STORY_INDEX_CACHE_KEY)).toBe(false);
    expect(await readStoryIndexCache(150)).toBeNull();
  });

  it("is fail-OPEN to the database: Redis unreachable / not configured is a miss and never throws", async () => {
    redisBroken = true;
    await expect(writeStoryIndexCache(rows, 150)).resolves.toBeUndefined();
    await expect(invalidateStoryIndexCache()).resolves.toBeUndefined();
    configured = false;
    expect(await readStoryIndexCache(150)).toBeNull();
    await writeStoryIndexCache(rows, 150);
    expect(evalCalls).toHaveLength(0);
  });

  it("never caches an empty index", async () => {
    await writeStoryIndexCache([], 150);
    expect(evalCalls).toHaveLength(0);
  });
});
