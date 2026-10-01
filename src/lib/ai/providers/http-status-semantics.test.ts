import { describe, expect, it } from "vitest";
import { classifyAiHttpFailure, withRateLimitHints } from "./errors";
import { classifyCodeCraftFailure } from "./codecraft";
import { classifyGeminiFailure } from "./gemini";
import { computeRetryDelayMs } from "./retry";
import { shouldRetryAiError } from "@/lib/observability/ai-cost/retry-policy";
import { circuitCooldownMs } from "./circuit-policy";

const classifiers = {
  "openai-compatible (groq/openrouter)": (s: number) => classifyAiHttpFailure(s, "{}"),
  codecraft: (s: number) => classifyCodeCraftFailure(s, "{}"),
  gemini: (s: number) => classifyGeminiFailure(s, "{}"),
};

describe("401 / 403 / 404 are never retried (every provider adapter)", () => {
  for (const [name, classify] of Object.entries(classifiers)) {
    for (const status of [401, 403, 404]) {
      it(`${name}: HTTP ${status} is non-retryable and not retried in-run`, () => {
        const err = classify(status);
        expect(err.retryable).toBe(false);
        expect(shouldRetryAiError(err, 0, 5)).toBe(false);
      });
    }
  }

  it("401/403 are auth failures (long circuit cooldown); 404 is a model-unavailable config failure (6h)", () => {
    for (const s of [401, 403]) expect(classifyCodeCraftFailure(s, "{}").authFailure).toBe(true);
    const nf = { ...classifyCodeCraftFailure(404, JSON.stringify({ error: { message: "model not found" } })), consecutiveFailures: 1 };
    expect(circuitCooldownMs(nf)).toBe(6 * 3_600_000);
  });
});

describe("429 honours Retry-After", () => {
  const headers = (v: string) => ({ get: (n: string) => (n.toLowerCase() === "retry-after" ? v : null) });

  it("parses Retry-After on a 429 and never retries sooner than asked (jitter is upward only)", () => {
    const err = withRateLimitHints(classifyAiHttpFailure(429, JSON.stringify({ error: { message: "slow down" } })), headers("3"));
    expect(err.retryAfterMs).toBe(3000);
    for (const r of [0, 0.5, 0.99]) {
      const d = computeRetryDelayMs(0, err.retryAfterMs, () => r)!;
      expect(d).toBeGreaterThanOrEqual(3000);
    }
  });

  it("a long Retry-After fails over instead of blocking the (wall-clock limited) worker", () => {
    const err = withRateLimitHints(classifyAiHttpFailure(429, "{}"), headers("120"));
    expect(computeRetryDelayMs(0, err.retryAfterMs)).toBeNull();
  });

  it("the circuit cooldown uses Retry-After as a floor so the provider is not probed early", () => {
    const err = withRateLimitHints(classifyCodeCraftFailure(429, "{}"), headers("600"));
    expect(circuitCooldownMs({ ...err, consecutiveFailures: 1 })).toBeGreaterThanOrEqual(600_000);
  });
});

describe("retry jitter never produces an immediate retry", () => {
  it("backoff without Retry-After is at least 0.75 x base (>= 600ms) for the first retry", () => {
    for (const r of [0, 0.25, 0.5, 1]) expect(computeRetryDelayMs(0, undefined, () => r)!).toBeGreaterThanOrEqual(600);
  });
});
