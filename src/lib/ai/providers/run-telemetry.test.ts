import { describe, expect, it } from "vitest";
import { buildAiUsageRecord } from "@/lib/observability/ai-usage/record";
import { noteProviderCall, summarizeProviderCalls, withRunTelemetry } from "./run-telemetry";

describe("run telemetry", () => {
  it("collects provider calls made inside the scope, with failure codes from fallbackReason", async () => {
    const run = await withRunTelemetry(async () => {
      buildAiUsageRecord({ provider: "codecraft", operation: "editorial_generate", endpoint: "chat.completions", model: "m", inputTokens: 0, outputTokens: 0, success: false, fallbackReason: "ai_unauthorized", latencyMs: 12 });
      buildAiUsageRecord({ provider: "gemini", operation: "editorial_generate", endpoint: "generateContent", model: "g", inputTokens: 100, outputTokens: 50, success: true, latencyMs: 900 });
      buildAiUsageRecord({ provider: "groq", operation: "editorial_generate", endpoint: "chat.completions", model: "q", inputTokens: 0, outputTokens: 0, success: false, metadata: { error: "ai_rate_limit" } });
      return "done";
    });
    expect(run.value).toBe("done");
    expect(run.calls.map((c) => [c.provider, c.success, c.errorCode])).toEqual([
      ["codecraft", false, "ai_unauthorized"],
      ["gemini", true, null],
      ["groq", false, "ai_rate_limit"],
    ]);
    expect(summarizeProviderCalls(run.calls)).toMatchObject({ calls: 3, succeeded: 1, failed: 2, inputTokens: 100, outputTokens: 50 });
  });

  it("is a no-op outside a scope and never records prompt text", () => {
    noteProviderCall({ provider: "x", model: "m", operation: "o", endpoint: "e", success: true, latencyMs: 1, inputTokens: 1, outputTokens: 1, errorCode: null });
    const rec = buildAiUsageRecord({ provider: "gemini", operation: "op", endpoint: "generateContent", model: "m", inputTokens: 1, outputTokens: 1, success: true, system: "SECRET-PROMPT", user: "SECRET-USER" });
    expect(JSON.stringify(rec)).not.toContain("SECRET-PROMPT");
  });

  it("isolates concurrent scopes", async () => {
    const [a, b] = await Promise.all([
      withRunTelemetry(async () => { await Promise.resolve(); buildAiUsageRecord({ provider: "gemini", operation: "a", endpoint: "chat.completions", model: "m", inputTokens: 1, outputTokens: 1, success: true }); }),
      withRunTelemetry(async () => { await Promise.resolve(); buildAiUsageRecord({ provider: "groq", operation: "b", endpoint: "chat.completions", model: "m", inputTokens: 1, outputTokens: 1, success: true }); }),
    ]);
    expect(a.calls.map((c) => c.operation)).toEqual(["a"]);
    expect(b.calls.map((c) => c.operation)).toEqual(["b"]);
  });
});
