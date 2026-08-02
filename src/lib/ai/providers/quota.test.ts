import { afterEach, describe, expect, it, vi } from "vitest";
import {
  acquireConcurrencySlot,
  checkAndConsumeQuota,
  peekQuota,
} from "./quota";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

// NOTE on test isolation: checkAndConsumeQuota ultimately calls
// checkRateLimit (src/lib/infrastructure/cache/rate-limit.ts), whose
// in-memory fallback window state lives in a module-level Map keyed by
// `ai-quota:<provider>:<scope>` — there is no exported reset. Redis isn't
// configured in this test env (no UPSTASH_REDIS_REST_URL/TOKEN stubbed), so
// every call here goes through that in-memory Map. Each test below uses a
// distinct AiProviderId so windows from one test can never bleed into
// another, regardless of run order.

describe("checkAndConsumeQuota — RPM window", () => {
  it("allows requests while under the RPM limit", async () => {
    vi.stubEnv("AI_QUOTA_CLOUDFLARE_RPM_LIMIT", "2");
    const first = await checkAndConsumeQuota({ provider: "cloudflare", operation: "test" });
    const second = await checkAndConsumeQuota({ provider: "cloudflare", operation: "test" });
    expect(first.allowed).toBe(true);
    expect(second.allowed).toBe(true);
  });

  it("denies once the RPM limit is exceeded within the same window", async () => {
    vi.stubEnv("AI_QUOTA_LOCAL_RPM_LIMIT", "2");
    const first = await checkAndConsumeQuota({ provider: "local", operation: "test" });
    const second = await checkAndConsumeQuota({ provider: "local", operation: "test" });
    const third = await checkAndConsumeQuota({ provider: "local", operation: "test" });

    expect(first.allowed).toBe(true);
    expect(second.allowed).toBe(true);
    expect(third.allowed).toBe(false);
    expect(third.scope).toBe("rpm");
    expect(typeof third.reason).toBe("string");
    expect(third.reason).toMatch(/rpm/);
  });

  it("denies immediately when limit<=0 (openai's default RPM is 0)", async () => {
    const result = await checkAndConsumeQuota({ provider: "openai", operation: "test" });
    expect(result.allowed).toBe(false);
    expect(result.scope).toBe("rpm");
    expect(result.limit).toBe(0);
    expect(result.reason).toMatch(/disabled \(limit=0\)/);
  });
});

describe("checkAndConsumeQuota — breaking-news RPD reserve", () => {
  // Two distinct providers (each otherwise untouched) so the two scenarios'
  // in-memory rpd windows can't collide with each other or with the RPM
  // tests above — driving each priority to exhaustion independently avoids
  // relying on the shared cumulative counter across priorities (the rpd key
  // is `ai-quota:<provider>:rpd` regardless of priority, so mixing
  // priorities against the same provider in one scenario would make the
  // arithmetic depend on call order, not just the reserve fraction).
  it("exhausts normal-priority requests at a lower RPD count than breaking-priority requests, per BREAKING_NEWS_RESERVE_FRACTION", async () => {
    vi.stubEnv("AI_QUOTA_GEMINI_RPD_LIMIT", "10");
    vi.stubEnv("AI_QUOTA_GROQ_RPD_LIMIT", "10");
    vi.stubEnv("AI_QUOTA_BREAKING_RESERVE_FRACTION", "0.2");

    // Normal priority: effective rpd limit = floor(10 * (1 - 0.2)) = 8.
    const normalResults = [];
    for (let i = 0; i < 8; i++) {
      normalResults.push(await checkAndConsumeQuota({ provider: "gemini", operation: "test", priority: "normal" }));
    }
    expect(normalResults.every((r) => r.allowed)).toBe(true);
    const ninthNormal = await checkAndConsumeQuota({ provider: "gemini", operation: "test", priority: "normal" });
    expect(ninthNormal.allowed).toBe(false);
    expect(ninthNormal.scope).toBe("rpd");

    // Breaking priority: effective rpd limit = the full 10 (no reserve
    // deduction) — a strictly larger budget than normal's 8.
    const breakingResults = [];
    for (let i = 0; i < 10; i++) {
      breakingResults.push(await checkAndConsumeQuota({ provider: "groq", operation: "test", priority: "breaking" }));
    }
    expect(breakingResults.every((r) => r.allowed)).toBe(true);
    const eleventhBreaking = await checkAndConsumeQuota({ provider: "groq", operation: "test", priority: "breaking" });
    expect(eleventhBreaking.allowed).toBe(false);
    expect(eleventhBreaking.scope).toBe("rpd");
  });
});

describe("acquireConcurrencySlot / release", () => {
  it("allows acquiring up to maxConcurrent slots, denies one more, then frees a slot after release()", () => {
    // openrouter's maxConcurrent default is 1 (see quota.ts DEFAULT_LIMITS);
    // maxConcurrent is not env-configurable, only rpm/tpm/rpd/tpd are.
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
    // checkRateLimit's in-memory fallback (used because Redis isn't
    // configured in this test env) never writes through memoryCacheSet, so
    // peekQuota — which only reads memoryCacheGet/redisGet — can never see
    // that state; it reports a fresh, estimated window regardless of
    // whether checkAndConsumeQuota was called for this provider elsewhere.
    const snapshot = await peekQuota("openrouter", "tpm");
    expect(snapshot.estimated).toBe(true);
    expect(snapshot.used).toBe(0);
    expect(snapshot.provider).toBe("openrouter");
    expect(snapshot.scope).toBe("tpm");
    expect(snapshot.remaining).toBe(snapshot.limit);
  });
});
