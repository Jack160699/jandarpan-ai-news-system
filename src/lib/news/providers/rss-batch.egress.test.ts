import { beforeEach, describe, expect, it, vi } from "vitest";

const loadHealth = vi.fn(async (_ids?: string[]) => new Map());
const loadStates = vi.fn(async (_tenant: string | null, _o?: { sourceKeys?: string[]; forPollGating?: boolean }) => new Map());

vi.mock("@/lib/news/providers/rss", () => ({ fetchRssSourceBatch: vi.fn() }));
vi.mock("@/lib/news/rss-health", () => ({
  loadSourceHealth: (ids?: string[]) => loadHealth(ids),
  isSourceSkipped: () => false,
}));
vi.mock("@/lib/news/ingestion/source-state", () => ({
  buildSourceKey: (family: string, id: string) => `${family}:${id}`,
  loadAllIngestionSourceStates: (t: string | null, o?: { sourceKeys?: string[]; forPollGating?: boolean }) => loadStates(t, o),
}));

import { runRssBatched } from "./rss-batch";
import { RSS_SOURCES } from "./rss-sources";

beforeEach(() => {
  loadHealth.mockClear();
  loadStates.mockClear();
});

describe("fetch shard reads only its own sources' health and state", () => {
  it("passes the shard's source ids/keys and the poll-gating column subset (not all 60 + 61 full rows)", async () => {
    await runRssBatched({ shouldStop: () => true, onBatchComplete: async () => {}, shard: { index: 3, count: 10 } });
    const ids = loadHealth.mock.calls[0]![0]!;
    expect(ids.length).toBeGreaterThan(0);
    expect(ids.length).toBeLessThanOrEqual(Math.ceil(RSS_SOURCES.length / 10));
    const [, opts] = loadStates.mock.calls[0]!;
    expect(opts?.forPollGating).toBe(true);
    expect(opts?.sourceKeys).toEqual(ids.map((id) => `rss:${id}`));
  });

  it("the ten shards partition the registry exactly (every source is polled by exactly one shard)", async () => {
    const seen: string[] = [];
    for (let i = 0; i < 10; i++) {
      loadHealth.mockClear();
      await runRssBatched({ shouldStop: () => true, onBatchComplete: async () => {}, shard: { index: i, count: 10 } });
      seen.push(...loadHealth.mock.calls[0]![0]!);
    }
    expect(seen.sort()).toEqual(RSS_SOURCES.map((s) => s.id).sort());
  });
});
