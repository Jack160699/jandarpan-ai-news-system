import { describe, expect, it } from "vitest";
import {
  defaultRunCallBudget,
  isLlmBudgetExhausted,
  llmBudgetSnapshot,
  refundLlmCall,
  tryConsumeLlmCall,
  withLlmCallBudget,
} from "./call-budget";

describe("per-run LLM call budget", () => {
  it("does nothing outside a budget scope", () => {
    expect(tryConsumeLlmCall("editorial_generate")).toBe(true);
    expect(llmBudgetSnapshot()).toBeNull();
  });

  it("caps real editorial calls and reports usage", async () => {
    const run = await withLlmCallBudget(3, async () => {
      const results = [1, 2, 3, 4, 5].map(() => tryConsumeLlmCall("editorial_generate"));
      return { results, exhausted: isLlmBudgetExhausted("editorial_repair") };
    });
    expect(run.value.results).toEqual([true, true, true, false, false]);
    expect(run.value.exhausted).toBe(true);
    expect(run.used).toBe(3);
    expect(run.max).toBe(3);
  });

  it("does not budget non-editorial operations", async () => {
    const run = await withLlmCallBudget(1, async () => {
      tryConsumeLlmCall("editorial_generate");
      return [tryConsumeLlmCall("translation"), tryConsumeLlmCall("lightweight")];
    });
    expect(run.value).toEqual([true, true]);
    expect(run.used).toBe(1);
  });

  it("refunds calls that never reached a provider", async () => {
    const run = await withLlmCallBudget(2, async () => {
      tryConsumeLlmCall("editorial_generate");
      refundLlmCall("editorial_generate");
      return [tryConsumeLlmCall("editorial_generate"), tryConsumeLlmCall("editorial_generate")];
    });
    expect(run.value).toEqual([true, true]);
    expect(run.used).toBe(2);
  });

  it("isolates concurrent runs", async () => {
    const [a, b] = await Promise.all([
      withLlmCallBudget(1, async () => {
        await Promise.resolve();
        return [tryConsumeLlmCall("editorial_generate"), tryConsumeLlmCall("editorial_generate")];
      }),
      withLlmCallBudget(2, async () => {
        await Promise.resolve();
        return [tryConsumeLlmCall("editorial_generate"), tryConsumeLlmCall("editorial_generate")];
      }),
    ]);
    expect(a.value).toEqual([true, false]);
    expect(b.value).toEqual([true, true]);
  });

  it("defaults to 12 and honours EDITORIAL_MAX_LLM_CALLS_PER_RUN", () => {
    expect(defaultRunCallBudget({})).toBe(12);
    expect(defaultRunCallBudget({ EDITORIAL_MAX_LLM_CALLS_PER_RUN: "6" })).toBe(6);
    expect(defaultRunCallBudget({ EDITORIAL_MAX_LLM_CALLS_PER_RUN: "0" })).toBe(12);
    expect(defaultRunCallBudget({ EDITORIAL_MAX_LLM_CALLS_PER_RUN: "abc" })).toBe(12);
  });
});
