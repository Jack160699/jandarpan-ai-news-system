import { afterEach, describe, expect, it, vi } from "vitest";

// isRedisConfigured is backed by INFRA_CONFIG (a module-level singleton
// computed at import time), not a live env-var read, so vi.stubEnv can't
// toggle it after the fact — mock the redis module directly instead,
// defaulting to "not configured" so every test except the dedicated
// "Redis path wiring" block exercises the in-memory fallback.
const mockIsRedisConfigured = vi.fn(() => false);
const mockRedisEval = vi.fn();
vi.mock("@/lib/infrastructure/cache/redis", () => ({
  isRedisConfigured: () => mockIsRedisConfigured(),
  redisEval: (...args: unknown[]) => mockRedisEval(...args),
  redisGet: vi.fn(async () => null),
  redisIncrBy: vi.fn(async () => null),
}));

import {
  __resetCloudflareNeuronsForTests,
  __resetQuotaCountersForTests,
  acquireConcurrencySlot,
  checkAndConsumeQuota,
  estimateCloudflareNeurons,
  getCloudflareNeuronForecast,
  getGeminiEditorialCapacityForecast,
  getProviderLimits,
  peekQuota,
  reconcileCloudflareNeurons,
  reconcileQuotaUsage,
  reserveCloudflareNeurons,
  reserveQuota,
} from "./quota";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  mockIsRedisConfigured.mockReturnValue(false);
  mockRedisEval.mockReset();
  __resetCloudflareNeuronsForTests();
  __resetQuotaCountersForTests();
});

// NOTE on test isolation: reserveQuota's in-memory fallback (used here since
// Redis isn't configured in this test env — no UPSTASH_REDIS_REST_URL/TOKEN
// stubbed) lives in a module-level Map keyed by
// `ai-quota:<provider>[:<model>]:<scope>` with no exported reset. Every test
// below uses a distinct provider (or provider+model pair) so windows can
// never bleed into another test, regardless of run order.
//
// The in-memory reservation has no `await` between reading and writing its
// Map, so it is atomic within one Node process by construction — this is
// what "concurrent reservations cannot exceed the hard limit" is actually
// verifying below. The Redis path's equivalent guarantee comes from Lua
// script atomicity on the Redis server itself, which a unit test can't
// independently prove; the "reserveQuota respects the Redis eval result"
// test further down instead verifies the *wiring* is correct.

describe("reserveQuota — RPM window", () => {
  it("allows requests while under the RPM limit", async () => {
    vi.stubEnv("AI_QUOTA_CLOUDFLARE_RPM_LIMIT", "2");
    const first = await reserveQuota({ provider: "cloudflare", operation: "test" });
    const second = await reserveQuota({ provider: "cloudflare", operation: "test" });
    expect(first.allowed).toBe(true);
    expect(second.allowed).toBe(true);
  });

  it("denies once the RPM limit is exceeded within the same window", async () => {
    vi.stubEnv("AI_QUOTA_LOCAL_RPM_LIMIT", "2");
    const first = await reserveQuota({ provider: "local", operation: "test" });
    const second = await reserveQuota({ provider: "local", operation: "test" });
    const third = await reserveQuota({ provider: "local", operation: "test" });

    expect(first.allowed).toBe(true);
    expect(second.allowed).toBe(true);
    expect(third.allowed).toBe(false);
    if (third.allowed) throw new Error("unreachable");
    expect(third.scope).toBe("rpm");
    expect(typeof third.reason).toBe("string");
    expect(third.reason).toMatch(/rpm/);
  });

  it("denies immediately when limit<=0 (openai's default RPM is 0)", async () => {
    const result = await reserveQuota({ provider: "openai", operation: "test" });
    expect(result.allowed).toBe(false);
    if (result.allowed) throw new Error("unreachable");
    expect(result.reason).toMatch(/disabled \(limit=0\)/);
  });
});

// Each test below gives "local" a distinct `model` string purely for
// bucket-key isolation (see the file-level note above) — "local" has no
// real per-model limits, this just prevents unrelated tests' rpm/tpm/rpd/tpd
// windows from bleeding into each other via the shared `ai-quota:local:*`
// keys.

describe("reserveQuota — weighted token accounting", () => {
  it("accumulates variable-sized requests as their true token weight, not a per-call count of 1", async () => {
    vi.stubEnv("AI_QUOTA_LOCAL_TPM_LIMIT", "10000");
    const model = "test-weighted-sum";
    // 500 + 5000 + 1500 = 7000 — the TPM counter must reflect the sum of the
    // actual estimated weights, not three separate "1 request" increments.
    await reserveQuota({ provider: "local", model, operation: "test", estimatedTokens: 500 });
    await reserveQuota({ provider: "local", model, operation: "test", estimatedTokens: 5_000 });
    await reserveQuota({ provider: "local", model, operation: "test", estimatedTokens: 1_500 });

    const snapshot = await peekQuota("local", "tpm", model);
    expect(snapshot.used).toBe(7_000);
    expect(snapshot.remaining).toBe(3_000);
  });

  it("rejects a request whose token weight would exceed TPM, without charging it", async () => {
    vi.stubEnv("AI_QUOTA_LOCAL_TPM_LIMIT", "1000");
    const model = "test-weighted-reject";
    const first = await reserveQuota({ provider: "local", model, operation: "test", estimatedTokens: 900 });
    expect(first.allowed).toBe(true);

    const second = await reserveQuota({ provider: "local", model, operation: "test", estimatedTokens: 500 });
    expect(second.allowed).toBe(false);
    if (second.allowed) throw new Error("unreachable");
    expect(second.scope).toBe("tpm");

    // Rejected request must not have consumed anything — usage stays at 900.
    const snapshot = await peekQuota("local", "tpm", model);
    expect(snapshot.used).toBe(900);
  });
});

describe("reserveQuota — all-or-nothing multi-scope reservation", () => {
  it("does not permanently consume an earlier scope when a later scope in the same reservation rejects", async () => {
    // RPM has plenty of room, but TPM is tiny — the reservation must check
    // both before committing either, so a TPM rejection must not have
    // consumed the RPM slot.
    vi.stubEnv("AI_QUOTA_LOCAL_RPM_LIMIT", "100");
    vi.stubEnv("AI_QUOTA_LOCAL_TPM_LIMIT", "10");
    const model = "test-all-or-nothing";

    const rejected = await reserveQuota({ provider: "local", model, operation: "test", estimatedTokens: 50 });
    expect(rejected.allowed).toBe(false);

    const rpmSnapshot = await peekQuota("local", "rpm", model);
    expect(rpmSnapshot.used).toBe(0);

    // A subsequent request within budget must still succeed — proving the
    // rejected attempt left no partial state behind.
    const ok = await reserveQuota({ provider: "local", model, operation: "test", estimatedTokens: 5 });
    expect(ok.allowed).toBe(true);
  });
});

describe("reserveQuota — concurrent reservations", () => {
  it("cannot admit more requests than the hard RPM limit even when fired concurrently", async () => {
    vi.stubEnv("AI_QUOTA_LOCAL_RPM_LIMIT", "5");
    const model = "test-concurrent";
    const attempts = Array.from({ length: 12 }, () => reserveQuota({ provider: "local", model, operation: "test" }));
    const results = await Promise.all(attempts);
    const allowedCount = results.filter((r) => r.allowed).length;
    expect(allowedCount).toBe(5);
  });
});

describe("reserveQuota — provider+model bucket isolation", () => {
  it("keeps two Groq models' RPD budgets independent — one model's larger allowance never authorizes the other's traffic", async () => {
    vi.stubEnv("AI_QUOTA_GROQ_OPENAI_GPT_OSS_120B_RPD_LIMIT", "2");
    vi.stubEnv("AI_QUOTA_GROQ_LLAMA_3_1_8B_INSTANT_RPD_LIMIT", "100");
    vi.stubEnv("AI_QUOTA_BREAKING_RESERVE_FRACTION", "0");

    for (let i = 0; i < 2; i++) {
      const r = await reserveQuota({ provider: "groq", model: "openai/gpt-oss-120b", operation: "editorial_review" });
      expect(r.allowed).toBe(true);
    }
    const exhausted = await reserveQuota({ provider: "groq", model: "openai/gpt-oss-120b", operation: "editorial_review" });
    expect(exhausted.allowed).toBe(false);

    // The lightweight model's much larger budget is completely unaffected.
    const lightweight = await reserveQuota({ provider: "groq", model: "llama-3.1-8b-instant", operation: "classification_lightweight" });
    expect(lightweight.allowed).toBe(true);
  });

  it("uses the sourced default limits for openai/gpt-oss-120b and llama-3.1-8b-instant", () => {
    const reviewer = getProviderLimits("groq", "openai/gpt-oss-120b");
    expect(reviewer).toMatchObject({ rpm: 28, rpd: 900, tpm: 7_000, tpd: 180_000 });

    const lightweight = getProviderLimits("groq", "llama-3.1-8b-instant");
    expect(lightweight).toMatchObject({ rpm: 28, rpd: 13_000, tpm: 5_500, tpd: 450_000 });
  });

  it("falls back to the groq provider-level default for a model with no sourced entry (qwen/qwen3.6-27b)", () => {
    const fallback = getProviderLimits("groq", "qwen/qwen3.6-27b");
    const providerLevel = getProviderLimits("groq");
    expect(fallback).toEqual(providerLevel);
  });
});

describe("reconcileQuotaUsage", () => {
  it("adjusts TPM down when actual usage is lower than the pre-request estimate", async () => {
    vi.stubEnv("AI_QUOTA_LOCAL_TPM_LIMIT", "10000");
    const model = "test-reconcile-down";
    const result = await reserveQuota({ provider: "local", model, operation: "test", estimatedTokens: 2_000 });
    expect(result.allowed).toBe(true);
    if (!result.allowed) throw new Error("unreachable");

    await reconcileQuotaUsage(result.reservation, { inputTokens: 300, outputTokens: 200 });

    const snapshot = await peekQuota("local", "tpm", model);
    expect(snapshot.used).toBe(500);
  });

  it("gives back the full estimate when a request fails with zero actual usage", async () => {
    vi.stubEnv("AI_QUOTA_LOCAL_TPM_LIMIT", "1000");
    const model = "test-reconcile-release";
    const result = await reserveQuota({ provider: "local", model, operation: "test", estimatedTokens: 900 });
    expect(result.allowed).toBe(true);
    if (!result.allowed) throw new Error("unreachable");

    await reconcileQuotaUsage(result.reservation, { inputTokens: 0, outputTokens: 0 });

    const snapshot = await peekQuota("local", "tpm", model);
    expect(snapshot.used).toBe(0);

    // The full budget is available again for a subsequent request.
    const next = await reserveQuota({ provider: "local", model, operation: "test", estimatedTokens: 900 });
    expect(next.allowed).toBe(true);
  });

  it("does not touch rpm/rpd — a sent request still counts against rate limits regardless of outcome", async () => {
    vi.stubEnv("AI_QUOTA_LOCAL_RPM_LIMIT", "5");
    const model = "test-reconcile-rpm-untouched";
    const result = await reserveQuota({ provider: "local", model, operation: "test" });
    expect(result.allowed).toBe(true);
    if (!result.allowed) throw new Error("unreachable");

    await reconcileQuotaUsage(result.reservation, { inputTokens: 0, outputTokens: 0 });

    const rpmSnapshot = await peekQuota("local", "rpm", model);
    expect(rpmSnapshot.used).toBe(1);
  });
});

describe("reserveQuota — quota exhaustion is terminal", () => {
  it("keeps rejecting subsequent calls in the same window with no automatic retry/backoff inside quota.ts", async () => {
    vi.stubEnv("AI_QUOTA_LOCAL_RPM_LIMIT", "1");
    const model = "test-exhaustion-terminal";
    const first = await reserveQuota({ provider: "local", model, operation: "test" });
    expect(first.allowed).toBe(true);
    const second = await reserveQuota({ provider: "local", model, operation: "test" });
    const third = await reserveQuota({ provider: "local", model, operation: "test" });
    expect(second.allowed).toBe(false);
    expect(third.allowed).toBe(false);
  });
});

describe("reserveQuota — breaking-news RPD reserve", () => {
  it("exhausts normal-priority requests at a lower RPD count than breaking-priority requests, per BREAKING_NEWS_RESERVE_FRACTION", async () => {
    vi.stubEnv("AI_QUOTA_GEMINI_RPD_LIMIT", "10");
    vi.stubEnv("AI_QUOTA_GROQ_RPD_LIMIT", "10");
    vi.stubEnv("AI_QUOTA_BREAKING_RESERVE_FRACTION", "0.2");

    const normalResults = [];
    for (let i = 0; i < 8; i++) {
      normalResults.push(await reserveQuota({ provider: "gemini", operation: "test", priority: "normal" }));
    }
    expect(normalResults.every((r) => r.allowed)).toBe(true);
    const ninthNormal = await reserveQuota({ provider: "gemini", operation: "test", priority: "normal" });
    expect(ninthNormal.allowed).toBe(false);

    const breakingResults = [];
    for (let i = 0; i < 10; i++) {
      breakingResults.push(await reserveQuota({ provider: "groq", operation: "test", priority: "breaking" }));
    }
    expect(breakingResults.every((r) => r.allowed)).toBe(true);
    const eleventhBreaking = await reserveQuota({ provider: "groq", operation: "test", priority: "breaking" });
    expect(eleventhBreaking.allowed).toBe(false);
  });
});

describe("reserveQuota — Redis path wiring", () => {
  it("commits when the Lua script reports success", async () => {
    mockIsRedisConfigured.mockReturnValue(true);
    mockRedisEval.mockResolvedValue([1, "ok"]);
    vi.stubEnv("AI_QUOTA_OPENROUTER_RPM_LIMIT", "5");

    const result = await reserveQuota({ provider: "openrouter", operation: "test" });
    expect(result.allowed).toBe(true);
    expect(mockRedisEval).toHaveBeenCalledTimes(1);
  });

  it("rejects when the Lua script reports a scope over budget", async () => {
    mockIsRedisConfigured.mockReturnValue(true);
    mockRedisEval.mockResolvedValue([0, "tpd"]);

    const result = await reserveQuota({ provider: "openrouter", operation: "test" });
    expect(result.allowed).toBe(false);
    if (result.allowed) throw new Error("unreachable");
    expect(result.scope).toBe("tpd");
  });

  it("degrades to the in-memory fallback when Redis is configured but eval fails/times out", async () => {
    mockIsRedisConfigured.mockReturnValue(true);
    mockRedisEval.mockResolvedValue(null);
    vi.stubEnv("AI_QUOTA_OPENROUTER_RPM_LIMIT", "5");

    // Distinct model purely for bucket isolation from the bare "openrouter"
    // provider-level tests elsewhere in this file (see the file-level note).
    const result = await reserveQuota({ provider: "openrouter", model: "test-redis-degrade", operation: "test" });
    expect(result.allowed).toBe(true);
  });
});

describe("checkAndConsumeQuota (legacy simple wrapper)", () => {
  it("still exposes allowed/reason for callers that don't need reconciliation", async () => {
    vi.stubEnv("AI_QUOTA_LOCAL_RPM_LIMIT", "1");
    const model = "test-legacy-wrapper";
    const first = await checkAndConsumeQuota({ provider: "local", model, operation: "test" });
    const second = await checkAndConsumeQuota({ provider: "local", model, operation: "test" });
    expect(first.allowed).toBe(true);
    expect(second.allowed).toBe(false);
    expect(typeof second.reason).toBe("string");
  });
});

describe("acquireConcurrencySlot / release", () => {
  it("allows acquiring up to maxConcurrent slots, denies one more, then frees a slot after release()", () => {
    const first = acquireConcurrencySlot("openrouter");
    expect(first.acquired).toBe(true);

    const second = acquireConcurrencySlot("openrouter");
    expect(second.acquired).toBe(false);

    first.release();

    const third = acquireConcurrencySlot("openrouter");
    expect(third.acquired).toBe(true);
    third.release();
  });
});

describe("peekQuota", () => {
  it("returns an estimated snapshot when Redis isn't configured and no prior state exists", async () => {
    const snapshot = await peekQuota("openrouter", "tpm");
    expect(snapshot.estimated).toBe(true);
    expect(snapshot.used).toBe(0);
    expect(snapshot.provider).toBe("openrouter");
    expect(snapshot.scope).toBe("tpm");
    expect(snapshot.remaining).toBe(snapshot.limit);
  });
});

describe("Cloudflare neuron accounting", () => {
  it("estimates embedding cost at 1,075 neurons per 1M input tokens", () => {
    const neurons = estimateCloudflareNeurons({ kind: "embedding", inputTokens: 1_000_000 });
    expect(neurons).toBeCloseTo(1_075, 5);
  });

  it("estimates a 1024x1024/4-step image at 57.6 neurons (4 tiles * 4.8 + 4 steps * 9.6)", () => {
    const neurons = estimateCloudflareNeurons({ kind: "image", width: 1024, height: 1024, steps: 4 });
    expect(neurons).toBeCloseTo(57.6, 5);
  });

  it("reserves against the shared daily cap and hard-stops before exceeding it", async () => {
    vi.stubEnv("AI_QUOTA_CLOUDFLARE_NEURON_CAP", "100");
    vi.stubEnv("AI_QUOTA_BREAKING_RESERVE_FRACTION", "0");
    const first = await reserveCloudflareNeurons(60);
    expect(first.allowed).toBe(true);
    const second = await reserveCloudflareNeurons(60);
    expect(second.allowed).toBe(false);
    expect(second.reason).toMatch(/neuron/);
  });

  it("reconciles neuron usage and forecasts remaining image/embedding capacity", async () => {
    vi.stubEnv("AI_QUOTA_CLOUDFLARE_NEURON_CAP", "1000");
    vi.stubEnv("AI_QUOTA_BREAKING_RESERVE_FRACTION", "0");
    await reserveCloudflareNeurons(500);
    await reconcileCloudflareNeurons(500, 400);

    const forecast = await getCloudflareNeuronForecast();
    expect(forecast.usedToday).toBe(400);
    expect(forecast.remaining).toBe(600);
    expect(forecast.estimatedImagesRemaining).toBeGreaterThan(0);
    expect(forecast.estimatedEmbeddingCallsRemaining).toBeGreaterThan(0);
  });
});

describe("Gemini model-specific quotas (real Free-tier dashboard limits)", () => {
  it("uses the sourced dashboard limits for gemini-3.6-flash and gemini-3.5-flash-lite, with tpd unavailable for both", () => {
    const premium = getProviderLimits("gemini", "gemini-3.6-flash");
    expect(premium).toMatchObject({ rpm: 4, tpm: 240_000, rpd: 20 });
    expect(premium.tpd).toBeNull();

    const lite = getProviderLimits("gemini", "gemini-3.5-flash-lite");
    expect(lite).toMatchObject({ rpm: 14, tpm: 240_000, rpd: 500 });
    expect(lite.tpd).toBeNull();
  });

  it("gives gemini-3.6-flash and gemini-3.5-flash-lite fully independent quota buckets", async () => {
    vi.stubEnv("AI_QUOTA_GEMINI_GEMINI_3_6_FLASH_RPD_LIMIT", "2");
    vi.stubEnv("AI_QUOTA_GEMINI_GEMINI_3_5_FLASH_LITE_RPD_LIMIT", "100");
    vi.stubEnv("AI_QUOTA_BREAKING_RESERVE_FRACTION", "0");

    for (let i = 0; i < 2; i++) {
      const r = await reserveQuota({ provider: "gemini", model: "gemini-3.6-flash", operation: "editorial_generate" });
      expect(r.allowed).toBe(true);
    }
    // Exhausting the premium model...
    const exhausted = await reserveQuota({ provider: "gemini", model: "gemini-3.6-flash", operation: "editorial_generate" });
    expect(exhausted.allowed).toBe(false);

    // ...does not block the lite model, which has its own, much larger budget.
    const lite = await reserveQuota({ provider: "gemini", model: "gemini-3.5-flash-lite", operation: "editorial_generate" });
    expect(lite.allowed).toBe(true);
  });

  it("exhausting gemini-3.5-flash-lite does not affect gemini-3.6-flash's independent budget", async () => {
    vi.stubEnv("AI_QUOTA_GEMINI_GEMINI_3_5_FLASH_LITE_RPD_LIMIT", "2");
    vi.stubEnv("AI_QUOTA_GEMINI_GEMINI_3_6_FLASH_RPD_LIMIT", "100");
    vi.stubEnv("AI_QUOTA_BREAKING_RESERVE_FRACTION", "0");

    for (let i = 0; i < 2; i++) {
      const r = await reserveQuota({ provider: "gemini", model: "gemini-3.5-flash-lite", operation: "editorial_generate" });
      expect(r.allowed).toBe(true);
    }
    const exhausted = await reserveQuota({ provider: "gemini", model: "gemini-3.5-flash-lite", operation: "editorial_generate" });
    expect(exhausted.allowed).toBe(false);

    const premium = await reserveQuota({ provider: "gemini", model: "gemini-3.6-flash", operation: "editorial_generate" });
    expect(premium.allowed).toBe(true);
  });

  it("reports Gemini TPD as unavailable — never zero, never a fabricated remaining value — and does not block reservations on it", async () => {
    const snapshot = await peekQuota("gemini", "tpd", "gemini-3.6-flash");
    expect(snapshot.unavailable).toBe(true);
    expect(snapshot.limit).toBeNull();
    expect(snapshot.used).toBeNull();
    expect(snapshot.remaining).toBeNull();

    // A token estimate within TPM (240,000) but that would exceed any
    // plausible real TPD limit if one existed — since TPD is unavailable it
    // must not be enforced, so this succeeds on rpm/tpm/rpd alone.
    vi.stubEnv("AI_QUOTA_GEMINI_GEMINI_3_6_FLASH_RPD_LIMIT", "20");
    const result = await reserveQuota({
      provider: "gemini",
      model: "gemini-3.6-flash",
      operation: "editorial_generate",
      estimatedTokens: 200_000,
    });
    expect(result.allowed).toBe(true);
    if (result.allowed) {
      // Confirms the reservation truly never touched the tpd scope.
      expect(result.reservation.tpdTracked).toBe(false);
    }
  });

  it("reserves ~4 of gemini-3.6-flash's 20 daily requests for breaking news, per the 18% reserve fraction", async () => {
    vi.stubEnv("AI_QUOTA_GEMINI_GEMINI_3_6_FLASH_RPD_LIMIT", "20");
    // RPM stays high here so only RPD gates this loop — RPM=4 is the real
    // per-model default and is exercised by its own test elsewhere.
    vi.stubEnv("AI_QUOTA_GEMINI_GEMINI_3_6_FLASH_RPM_LIMIT", "1000");
    vi.stubEnv("AI_QUOTA_BREAKING_RESERVE_FRACTION", "0.18");

    // Normal-priority effective limit = floor(20 * (1 - 0.18)) = 16.
    for (let i = 0; i < 16; i++) {
      const r = await reserveQuota({ provider: "gemini", model: "gemini-3.6-flash", operation: "editorial_generate", priority: "normal" });
      expect(r.allowed).toBe(true);
    }
    const seventeenthNormal = await reserveQuota({ provider: "gemini", model: "gemini-3.6-flash", operation: "editorial_generate", priority: "normal" });
    expect(seventeenthNormal.allowed).toBe(false);

    // Breaking-priority can still use the reserved ~4 remaining slots.
    let breakingSucceeded = 0;
    for (let i = 0; i < 4; i++) {
      const r = await reserveQuota({ provider: "gemini", model: "gemini-3.6-flash", operation: "editorial_generate", priority: "breaking" });
      if (r.allowed) breakingSucceeded += 1;
    }
    expect(breakingSucceeded).toBe(4);
  });

  it("computes the 100-article capacity forecast from gemini-3.5-flash-lite's model-specific remaining RPD", async () => {
    vi.stubEnv("AI_QUOTA_GEMINI_GEMINI_3_5_FLASH_LITE_RPD_LIMIT", "500");
    vi.stubEnv("AI_QUOTA_GEMINI_GEMINI_3_6_FLASH_RPD_LIMIT", "20");
    vi.stubEnv("AI_QUOTA_BREAKING_RESERVE_FRACTION", "0");

    for (let i = 0; i < 10; i++) {
      await reserveQuota({ provider: "gemini", model: "gemini-3.5-flash-lite", operation: "editorial_generate" });
    }

    const forecast = await getGeminiEditorialCapacityForecast();
    expect(forecast.liteModel).toBe("gemini-3.5-flash-lite");
    expect(forecast.liteRpdLimit).toBe(500);
    expect(forecast.liteRpdRemaining).toBe(490);
    expect(forecast.estimatedArticlesRemaining).toBe(490);
    // Premium model's own remaining is reported separately, not conflated with the lite-model article count.
    expect(forecast.premiumModel).toBe("gemini-3.6-flash");
    expect(forecast.premiumRpdLimit).toBe(20);
  });
});
