import { describe, expect, it } from "vitest";
import {
  buildAdminMetric,
  buildEnvelope,
  metricFreshnessFromAge,
} from "@/lib/admin-v3/metric-contract";

describe("metric-contract", () => {
  it("builds a metric with source, period, freshness, and availability", () => {
    const metric = buildAdminMetric(12, {
      source: "generated_articles",
      unit: "stories",
      period: "today",
      generatedAt: new Date().toISOString(),
      ok: true,
      comparison: { value: 10, period: "yesterday" },
    });
    expect(metric.value).toBe(12);
    expect(metric.source).toBe("generated_articles");
    expect(metric.availability).toBe("available");
    expect(metric.comparison?.value).toBe(10);
    expect(["live", "fresh"]).toContain(metric.freshness);
  });

  it("marks forbidden envelopes without leaking values", () => {
    const env = buildEnvelope({ ok: true, forbidden: true });
    expect(env.availability).toBe("forbidden");
    expect(env.freshness).toBe("unavailable");
  });

  it("ages into stale", () => {
    const old = new Date(Date.now() - 10 * 60_000).toISOString();
    expect(metricFreshnessFromAge(old)).toBe("stale");
  });
});
