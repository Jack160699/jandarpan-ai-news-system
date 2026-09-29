import { describe, expect, it } from "vitest";
import {
  modelBelongsToProvider,
  providerForModel,
  scopeModelOverride,
} from "@/lib/ai/providers/model-scope";

describe("model-scope", () => {
  it("does not leak the DeepSeek override to gemini or groq (the production bug)", () => {
    // "deepseek-v4-pro-max" contains "pro" — the old loose gemini check accepted it.
    expect(modelBelongsToProvider("gemini", "deepseek-v4-pro-max")).toBe(false);
    expect(modelBelongsToProvider("groq", "deepseek-v4-pro-max")).toBe(false);
    expect(modelBelongsToProvider("openai", "deepseek-v4-pro-max")).toBe(false);
    expect(modelBelongsToProvider("codecraft", "deepseek-v4-pro-max")).toBe(true);
  });

  it("attributes known model families to their provider", () => {
    expect(providerForModel("gemini-3.5-flash-lite")).toBe("gemini");
    expect(providerForModel("llama-3.3-70b-versatile")).toBe("groq");
    expect(providerForModel("openai/gpt-oss-120b")).toBe("groq");
    expect(providerForModel("gpt-4o-mini")).toBe("openai");
    expect(providerForModel("meta-llama/llama-3.1-8b-instruct:free")).toBe("groq");
    expect(providerForModel("mistralai/mistral-7b-instruct:free")).toBe("openrouter");
    expect(providerForModel("deepseek-v4-pro-max")).toBeNull();
  });

  it("scopeModelOverride returns undefined for a foreign model", () => {
    expect(scopeModelOverride("gemini", "llama-3.3-70b-versatile")).toBeUndefined();
    expect(scopeModelOverride("gemini", "gemini-3.6-flash")).toBe("gemini-3.6-flash");
    expect(scopeModelOverride("groq", undefined)).toBeUndefined();
    expect(scopeModelOverride("groq", "  ")).toBeUndefined();
  });
});
