import { describe, expect, it } from "vitest";
import {
  buildTenantCacheKey,
  isTenantScopedCacheKey,
  redisFailureImpact,
} from "@/lib/infrastructure/cache/tenant-keys";

describe("Phase 8 tenant-safe cache keys", () => {
  it("builds tenant-scoped keys", () => {
    const key = buildTenantCacheKey("news:homepage", "tenant-1", "hi");
    expect(key).toContain(":t:tenant-1:");
    expect(isTenantScopedCacheKey(key)).toBe(true);
  });

  it("rejects missing tenant", () => {
    expect(() => buildTenantCacheKey("news:homepage", null, "hi")).toThrow(
      /missing_tenant/
    );
  });

  it("classifies redis failure as performance-only", () => {
    const impact = redisFailureImpact();
    expect(impact.correctness).toBe("unaffected");
    expect(impact.performance).toBe("degraded");
  });
});
