import { describe, expect, it } from "vitest";
import {
  computeChatCostUsd,
  computeEmbeddingCostUsd,
  computeImageCostUsd,
  estimateCostUsd,
} from "@/lib/observability/openai-cost/pricing";
import { estimateTokensFromText, hashPrompt } from "@/lib/observability/openai-cost/token-estimate";
import { buildUsageRecord } from "@/lib/observability/openai-cost/record";

describe("openai-cost pricing", () => {
  it("computes gpt-4o-mini chat cost", () => {
    const cost = computeChatCostUsd({
      model: "gpt-4o-mini",
      inputTokens: 1000,
      outputTokens: 500,
    });
    expect(cost).toBeGreaterThan(0);
    expect(cost).toBeLessThan(0.01);
  });

  it("computes embedding cost", () => {
    const cost = computeEmbeddingCostUsd({
      model: "text-embedding-3-small",
      inputTokens: 10_000,
    });
    expect(cost).toBeCloseTo(0.0002, 4);
  });

  it("computes dall-e-3 image cost", () => {
    const cost = computeImageCostUsd({
      model: "dall-e-3",
      size: "1792x1024",
    });
    expect(cost).toBe(0.08);
  });

  it("routes estimateCostUsd by endpoint", () => {
    expect(
      estimateCostUsd({
        endpoint: "chat.completions",
        model: "gpt-4o-mini",
        inputTokens: 100,
        outputTokens: 50,
      })
    ).toBeGreaterThan(0);
  });
});

describe("openai-cost token estimate", () => {
  it("estimates tokens from text", () => {
    expect(estimateTokensFromText("hello world")).toBeGreaterThan(0);
  });

  it("hashes prompts consistently", () => {
    expect(hashPrompt("test")).toBe(hashPrompt("test"));
    expect(hashPrompt("test")).not.toBe(hashPrompt("other"));
  });
});

describe("openai-cost record builder", () => {
  it("builds usage record with cost", () => {
    const record = buildUsageRecord({
      operation: "test",
      endpoint: "chat.completions",
      model: "gpt-4o-mini",
      inputTokens: 100,
      outputTokens: 50,
      success: true,
      system: "sys",
      user: "usr",
    });
    expect(record.estimatedCostUsd).toBeGreaterThan(0);
    expect(record.promptHash).toBeDefined();
  });
});
