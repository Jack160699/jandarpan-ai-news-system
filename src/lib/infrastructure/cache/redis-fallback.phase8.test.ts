import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/infrastructure/config", () => ({
  INFRA_CONFIG: { redisEnabled: false, homepageCacheSeconds: 60 },
}));

vi.mock("@/lib/infrastructure/cache/redis", () => ({
  isRedisConfigured: () => false,
  redisGet: vi.fn(),
  redisSet: vi.fn(),
  redisDel: vi.fn(),
}));

vi.mock("@/lib/infrastructure/analytics/ingestion", () => ({
  logIngestionAnalytics: vi.fn(),
}));

describe("Phase 8 Redis unavailable fallback", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("serves memory cache when Redis is not configured", async () => {
    const { cacheSet, cacheGet } = await import("@/lib/infrastructure/cache");
    await cacheSet("phase8:test:key", "value", 60);
    await expect(cacheGet("phase8:test:key")).resolves.toBe("value");
  });
});
