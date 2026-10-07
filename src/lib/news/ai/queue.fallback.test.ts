import { beforeEach, describe, expect, it, vi } from "vitest";

const calls: Array<[string, unknown[]]> = [];

// A chainable, awaitable query builder that records every call.
function builder(result: unknown) {
  const b: Record<string, unknown> = {};
  const chain = (name: string) => (...args: unknown[]) => {
    calls.push([name, args]);
    return b;
  };
  for (const m of ["select", "update", "eq", "is", "lt", "gte", "or", "order", "limit", "in"]) b[m] = chain(m);
  b.then = (resolve: (v: unknown) => unknown) => resolve(result);
  return b;
}

vi.mock("@/lib/supabase", () => ({
  createAdminClient: () => ({
    rpc: async () => ({ data: null, error: { message: "rpc down" } }),
    from: () => builder({ data: [], error: null }),
  }),
}));
vi.mock("@/lib/infrastructure/config", () => ({ INFRA_CONFIG: { aiQueueStaleProcessingMs: 600_000 } }));
vi.mock("@/lib/ai/providers", () => ({ isAnyChatProviderConfigured: () => true, isLocalEnrichEnabled: () => false }));

import { AI_QUEUE_FRESH_WINDOW_MS, claimAiQueueBatch } from "@/lib/news/ai/queue";

describe("claimAiQueueBatch RPC-failure fallback", () => {
  beforeEach(() => {
    calls.length = 0;
  });

  it("claims freshest first, inside the 48 h window, honouring retry backoff", async () => {
    const before = Date.now();
    await claimAiQueueBatch(5);

    const order = calls.filter(([n, a]) => n === "order" && a[0] === "created_at");
    expect(order.length).toBeGreaterThan(0);
    expect(order[order.length - 1][1][1]).toEqual({ ascending: false });

    const gte = calls.find(([n, a]) => n === "gte" && a[0] === "created_at");
    expect(gte).toBeDefined();
    const cutoff = Date.parse(String(gte![1][1]));
    expect(cutoff).toBeGreaterThanOrEqual(before - AI_QUEUE_FRESH_WINDOW_MS - 1_000);
    expect(cutoff).toBeLessThanOrEqual(Date.now() - AI_QUEUE_FRESH_WINDOW_MS + 1_000);

    const or = calls.find(([n]) => n === "or");
    expect(String(or?.[1][0])).toContain("next_attempt_at.is.null,next_attempt_at.lte.");
  });
});
