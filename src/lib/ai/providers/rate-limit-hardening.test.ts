import { afterEach, describe, expect, it, vi } from "vitest";
import {
  detectDailyExhaustion,
  parseRetryAfterMs,
  withRateLimitHints,
} from "./errors";
import { computeRetryDelayMs, MAX_INLINE_RETRY_WAIT_MS, withJitter } from "./retry";
import {
  circuitCooldownMs,
  classifyCircuitFailure,
  msUntilUtcMidnight,
} from "./circuit-policy";
import { getProviderLimits } from "./quota";
import type { ClassifiedAiError } from "./types";

afterEach(() => {
  vi.unstubAllEnvs();
});

const rateLimited = (over: Partial<ClassifiedAiError> = {}): ClassifiedAiError => ({
  code: "ai_rate_limited",
  message: "rate limit",
  httpStatus: 429,
  retryable: true,
  authFailure: false,
  invalidRequest: false,
  rateLimited: true,
  ...over,
});

describe("Retry-After parsing", () => {
  it("parses delta-seconds, fractional seconds and HTTP dates", () => {
    expect(parseRetryAfterMs("7")).toBe(7_000);
    expect(parseRetryAfterMs("1.5")).toBe(1_500);
    const now = Date.parse("2026-09-30T00:00:00Z");
    expect(parseRetryAfterMs("Wed, 30 Sep 2026 00:00:20 GMT", now)).toBe(20_000);
  });

  it("ignores junk and caps absurd values", () => {
    expect(parseRetryAfterMs(undefined)).toBeUndefined();
    expect(parseRetryAfterMs("")).toBeUndefined();
    expect(parseRetryAfterMs("soon")).toBeUndefined();
    expect(parseRetryAfterMs("999999999")).toBe(24 * 3_600_000);
  });

  it("attaches retryAfterMs to a classified failure without changing its class", () => {
    const headers = { get: (n: string) => (n === "retry-after" ? "12" : null) };
    const out = withRateLimitHints(rateLimited(), headers);
    expect(out.retryAfterMs).toBe(12_000);
    expect(out.retryable).toBe(true);
  });
});

describe("daily exhaustion detection", () => {
  it("flags per-day / billing exhaustion but not per-minute limits", () => {
    expect(detectDailyExhaustion(429, "You exceeded your daily request limit (RPD)")).toBe(true);
    expect(detectDailyExhaustion(429, "Rate limit reached: 200 requests per day")).toBe(true);
    expect(detectDailyExhaustion(402, "payment required")).toBe(true);
    expect(detectDailyExhaustion(429, "insufficient_quota")).toBe(true);
    expect(detectDailyExhaustion(429, "Too many requests, retry in 20s")).toBe(false);
    expect(detectDailyExhaustion(500, "daily maintenance")).toBe(false);
  });

  it("marks the failure non-retryable so nothing burns more calls today", () => {
    const out = withRateLimitHints(rateLimited({ message: "daily quota exceeded" }), null);
    expect(out.dailyExhausted).toBe(true);
    expect(out.retryable).toBe(false);
    expect(out.rateLimited).toBe(true);
  });
});

describe("retry delay: Retry-After + jitter", () => {
  it("jitters within +/-25%", () => {
    expect(withJitter(1000, () => 0)).toBe(750);
    expect(withJitter(1000, () => 1)).toBe(1250);
    expect(withJitter(1000, () => 0.5)).toBe(1000);
  });

  it("never retries sooner than the provider asked", () => {
    for (const r of [0, 0.3, 0.999]) {
      const d = computeRetryDelayMs(0, 3_000, () => r)!;
      expect(d).toBeGreaterThanOrEqual(3_000);
      expect(d).toBeLessThanOrEqual(3_750);
    }
  });

  it("fails over instead of blocking when Retry-After is longer than the inline cap", () => {
    expect(computeRetryDelayMs(0, MAX_INLINE_RETRY_WAIT_MS + 1)).toBeNull();
  });

  it("uses jittered exponential backoff when there is no Retry-After", () => {
    expect(computeRetryDelayMs(0, undefined, () => 0.5)).toBe(800);
    expect(computeRetryDelayMs(2, undefined, () => 0.5)).toBe(3_200);
  });
});

describe("daily_exhausted circuit state", () => {
  const noon = Date.parse("2026-09-30T12:00:00Z");

  it("stays disabled until the UTC day resets", () => {
    const input = { ...rateLimited({ message: "daily quota exceeded" }), dailyExhausted: true, consecutiveFailures: 1 };
    expect(classifyCircuitFailure(input)).toBe("daily_exhausted");
    expect(circuitCooldownMs(input, noon)).toBe(12 * 3_600_000);
    const lateEvening = Date.parse("2026-09-30T23:59:00Z");
    expect(circuitCooldownMs(input, lateEvening)).toBe(60_000);
  });

  it("computes time to the next UTC midnight", () => {
    expect(msUntilUtcMidnight(Date.parse("2026-09-30T00:00:00Z"))).toBe(24 * 3_600_000);
  });

  it("uses Retry-After as a floor for ordinary rate limits, capped at 1h", () => {
    const base = { ...rateLimited(), consecutiveFailures: 1 };
    expect(circuitCooldownMs({ ...base, retryAfterMs: 5 * 60_000 }, noon)).toBe(5 * 60_000);
    expect(circuitCooldownMs({ ...base, retryAfterMs: 10 * 3_600_000 }, noon)).toBe(3_600_000);
  });
});

describe("CodeCraft conservative safety defaults", () => {
  it("is RPM 6 / TPM 30k / RPD 300 / TPD 400k / 1 concurrent", () => {
    expect(getProviderLimits("codecraft")).toEqual({
      rpm: 6,
      tpm: 30_000,
      rpd: 300,
      tpd: 400_000,
      maxConcurrent: 1,
    });
    expect(getProviderLimits("codecraft", "some-model")).toMatchObject({ rpm: 6, rpd: 300, maxConcurrent: 1 });
  });

  it("can only be raised explicitly via env", () => {
    vi.stubEnv("AI_QUOTA_CODECRAFT_RPD_LIMIT", "1000");
    expect(getProviderLimits("codecraft").rpd).toBe(1000);
    expect(getProviderLimits("codecraft").rpm).toBe(6);
  });
});
