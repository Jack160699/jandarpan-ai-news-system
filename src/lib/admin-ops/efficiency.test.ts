import { describe, expect, it } from "vitest";
import { buildEfficiencyView, type EfficiencyRaw } from "@/lib/admin-ops/efficiency";

const base: EfficiencyRaw = {
  window_hours: 24,
  generate: { calls: 40, ok: 36, avg_latency_ms: 24_000 },
  repair: { calls: 10, ok: 9, avg_latency_ms: 16_000 },
  repair_pct: 25,
  tokens: 300_000,
  events_with_calls: 38,
  articles: { generated: 30, approved: 24, not_publish: 6, rejection_pct: 20, repaired_flag: 2, avg_depth_retries: 0.2 },
  tokens_per_approved_article: 12_500,
  per_model: [
    { provider: "codecraft", model: "deepseek-v4-pro-0813", operation: "editorial_generate", calls: 40, ok: 36, avg_latency_ms: 24_000, tokens: 200_000 },
    { provider: "codecraft", model: "deepseek-v4-pro-0813", operation: "editorial_repair", calls: 10, ok: 9, avg_latency_ms: 16_000, tokens: 100_000 },
  ],
};

describe("buildEfficiencyView", () => {
  it("reports recorded numbers and success percentages", () => {
    const v = buildEfficiencyView(base);
    expect(v.generate.okPct).toBe(90);
    expect(v.repair.okPct).toBe(90);
    expect(v.repairPct).toBe(25);
    expect(v.rejectionPct).toBe(20);
    expect(v.tokensPerApprovedArticle).toBe(12_500);
    expect(v.rejectionTone).toBe("warning");
    expect(v.repairTone).toBe("healthy");
  });

  it("returns null, never 0, when there is no data to divide", () => {
    const v = buildEfficiencyView({
      ...base,
      generate: { calls: 0, ok: 0, avg_latency_ms: null },
      repair: { calls: 0, ok: 0, avg_latency_ms: null },
      repair_pct: null,
      tokens: 0,
      tokens_per_approved_article: null,
      articles: { generated: 0, approved: 0, not_publish: 0, rejection_pct: null, repaired_flag: 0, avg_depth_retries: null },
      per_model: [],
    });
    expect(v.generate.okPct).toBeNull();
    expect(v.repairPct).toBeNull();
    expect(v.rejectionPct).toBeNull();
    expect(v.tokensPerApprovedArticle).toBeNull();
    expect(v.providerPolicy.message).toMatch(/no Gemini editorial calls/);
  });

  it("raises the repair tone when most drafts need a second paid pass", () => {
    expect(buildEfficiencyView({ ...base, repair_pct: 67 }).repairTone).toBe("critical");
    expect(buildEfficiencyView({ ...base, repair_pct: 30 }).repairTone).toBe("warning");
  });

  it("CodeCraft is primary and Gemini editorial calls are surfaced loudly when they happen", () => {
    const clean = buildEfficiencyView(base);
    expect(clean.providerPolicy.codecraftPrimary).toBe(true);
    expect(clean.geminiEditorialCalls).toBe(0);
    expect(clean.providerPolicy.geminiEditorialCallsTone).toBe("healthy");

    const leaked = buildEfficiencyView({
      ...base,
      per_model: [
        ...base.per_model,
        { provider: "gemini", model: "gemini-3.5-flash-lite", operation: "editorial_generate", calls: 577, ok: 568, avg_latency_ms: 5191, tokens: 1_233_835 },
      ],
    });
    expect(leaked.geminiEditorialCalls).toBe(577);
    expect(leaked.providerPolicy.codecraftPrimary).toBe(false);
    expect(leaked.providerPolicy.geminiEditorialCallsTone).toBe("critical");
    expect(leaked.providerPolicy.message).toContain("577");
    expect(leaked.providerPolicy.message).toContain("GEMINI_EDITORIAL_FALLBACK");
  });
});
