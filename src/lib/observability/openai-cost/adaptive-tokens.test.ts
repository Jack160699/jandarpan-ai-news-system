import { describe, expect, it } from "vitest";
import {
  adaptiveTranslationBodySlice,
  classifyEditorialTier,
  editorialMaxTokens,
  translationMaxTokens,
} from "@/lib/observability/openai-cost/adaptive-tokens";
import { buildOptimizedFactPack } from "@/lib/news/ai/optimized-fact-pack";
import type { NewsEventRow, NewsSignalRow } from "@/lib/types/newsroom";

describe("adaptive-tokens", () => {
  it("classifies breaking tier", () => {
    expect(classifyEditorialTier({ urgencyScore: 80, signalCount: 2 })).toBe("breaking");
  });

  it("limits editorial tokens for breaking", () => {
    expect(editorialMaxTokens("breaking")).toBe(1000);
  });

  it("slices translation body adaptively", () => {
    const long = "x".repeat(10_000);
    const sliced = adaptiveTranslationBodySlice(long, 80);
    expect(sliced.length).toBeLessThanOrEqual(6000);
  });

  it("scales translation max tokens by tier", () => {
    expect(translationMaxTokens({ bodyChars: 1000, targetLanguage: "en" })).toBeLessThanOrEqual(1400);
  });
});

describe("optimized-fact-pack", () => {
  it("uses top 5 signals only", () => {
    const event = {
      id: "e1",
      canonical_title: "Test Event",
      category: "local",
      region: "chhattisgarh",
      event_summary: "Summary",
    } as NewsEventRow;

    const signals = Array.from({ length: 8 }, (_, i) => ({
      id: `s${i}`,
      title: `Unique headline number ${i}`,
      source: "wire",
      provider: "rss",
      article_url: `https://example.com/${i}`,
      published_at: new Date().toISOString(),
      raw_content: "content ".repeat(20),
    })) as NewsSignalRow[];

    const pack = buildOptimizedFactPack(event, signals);
    expect(pack.signalCountUsed).toBe(5);
    expect(pack.signalCountTotal).toBe(8);
    expect(pack.factPackText).toContain("Top sources used: 5 of 8");
    expect(pack.factPackText.length).toBeLessThan(8000);
  });
});
