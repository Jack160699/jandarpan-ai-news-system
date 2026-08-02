import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mockLogAiProviderUsage = vi.fn();
vi.mock("@/lib/observability/ai-usage/record", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/observability/ai-usage/record")>();
  return {
    ...actual,
    recordAiProviderUsage: (...args: unknown[]) => mockLogAiProviderUsage(...args),
  };
});

// next/server's after() requires an active Next.js request-scope
// (AsyncLocalStorage-tracked), which doesn't exist when calling
// requestGeminiChat directly in a unit test. Runs the callback immediately
// instead — fine for assertions, which only care the usage-record write
// was attempted with the right payload.
vi.mock("next/server", async (importOriginal) => {
  const actual = await importOriginal<typeof import("next/server")>();
  return { ...actual, after: (fn: () => unknown) => fn() };
});

import { isGeminiConfigured, requestGeminiChat, resolveGeminiModel } from "./gemini";

// health.ts's provider-health registry (src/lib/ai/providers/health.ts) is a
// module-level Map with no exported reset. Several tests below deliberately
// provoke a failure classification, and gemini.ts's postGemini calls
// markProviderUnhealthy on any non-ok HTTP response — which sets a 5-15
// minute real-time cooldown that isProviderHealthy would otherwise still be
// honoring in the *next* test (returning ai_provider_cooldown instead of
// actually exercising the classification path under test). Fake-timing each
// test's "now" forward by 20 minutes (safely past AUTH_COOLDOWN_MS's 15 min)
// relative to the previous test lets isProviderHealthy's own self-healing
// check (`Date.now() >= state.disabledUntil`) clear any cooldown a prior
// test left behind, without needing an exported reset from health.ts.
let fakeNowMs = Date.parse("2026-01-01T00:00:00Z");

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(fakeNowMs);
  fakeNowMs += 20 * 60 * 1000;
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  mockLogAiProviderUsage.mockReset();
});

function baseRequest(overrides: Partial<Parameters<typeof requestGeminiChat>[0]> = {}) {
  return {
    operation: "test",
    system: "You are a helpful assistant.",
    user: "Say hello.",
    ...overrides,
  };
}

describe("requestGeminiChat", () => {
  it("parses candidates[0].content.parts[].text from a successful generateContent response", async () => {
    vi.stubEnv("GEMINI_API_KEY", "test-key");
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          candidates: [
            {
              content: {
                parts: [{ text: "Hello " }, { text: "there." }],
              },
            },
          ],
          usageMetadata: { promptTokenCount: 5, candidatesTokenCount: 3 },
        }),
        { status: 200, headers: { "content-type": "application/json" } }
      )
    );
    vi.stubGlobal("fetch", fetchMock);

    const result = await requestGeminiChat(baseRequest());

    expect(result).toEqual({
      ok: true,
      content: "Hello there.",
      provider: "gemini",
      model: "gemini-3.5-flash-lite",
      latencyMs: expect.any(Number),
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const url = fetchMock.mock.calls[0][0] as string;
    expect(url).toContain("generativelanguage.googleapis.com");
  });

  it("returns a non-retryable ai_empty_response error for an empty response", async () => {
    vi.stubEnv("GEMINI_API_KEY", "test-key");
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({ candidates: [] }),
        { status: 200, headers: { "content-type": "application/json" } }
      )
    );
    vi.stubGlobal("fetch", fetchMock);

    const result = await requestGeminiChat(baseRequest());

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("ai_empty_response");
      expect(result.error.retryable).toBe(false);
    }
  });

  it("classifies a 401 response as ai_unauthorized, authFailure:true, non-retryable", async () => {
    vi.stubEnv("GEMINI_API_KEY", "test-key");
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({ error: { message: "API key not valid", status: "UNAUTHENTICATED" } }),
        { status: 401, headers: { "content-type": "application/json" } }
      )
    );
    vi.stubGlobal("fetch", fetchMock);

    const result = await requestGeminiChat(baseRequest());

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("ai_unauthorized");
      expect(result.error.authFailure).toBe(true);
      expect(result.error.retryable).toBe(false);
    }
  });

  it("classifies a 429 with RESOURCE_EXHAUSTED status as ai_quota_exhausted", async () => {
    vi.stubEnv("GEMINI_API_KEY", "test-key");
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({ error: { message: "Quota exceeded", status: "RESOURCE_EXHAUSTED" } }),
        { status: 429, headers: { "content-type": "application/json" } }
      )
    );
    vi.stubGlobal("fetch", fetchMock);

    const result = await requestGeminiChat(baseRequest());

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("ai_quota_exhausted");
      expect(result.error.rateLimited).toBe(true);
      expect(result.error.retryable).toBe(false);
    }
  });

  it("classifies a 500 response as ai_upstream_error, retryable:true", async () => {
    vi.stubEnv("GEMINI_API_KEY", "test-key");
    // Force a single attempt so this test doesn't wait out the real
    // withTransientAiRetry backoff delay (BASE_DELAY_MS * 2**attempt).
    vi.stubEnv("OPENAI_MAX_RETRY_ATTEMPTS", "1");
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({ error: { message: "Internal error", status: "INTERNAL" } }),
        { status: 500, headers: { "content-type": "application/json" } }
      )
    );
    vi.stubGlobal("fetch", fetchMock);

    const result = await requestGeminiChat(baseRequest());

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("ai_upstream_error");
      expect(result.error.retryable).toBe(true);
    }
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("returns ai_unavailable without calling fetch when GEMINI_API_KEY is unset", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    expect(isGeminiConfigured()).toBe(false);

    const result = await requestGeminiChat(baseRequest());

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("ai_unavailable");
    }
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("resolveGeminiModel — routing", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("routes normal editorial_generate to gemini-3.5-flash-lite by default", () => {
    expect(resolveGeminiModel("editorial_generate")).toBe("gemini-3.5-flash-lite");
  });

  it("routes translation and lightweight operations to gemini-3.5-flash-lite", () => {
    expect(resolveGeminiModel("translation")).toBe("gemini-3.5-flash-lite");
    expect(resolveGeminiModel("classification_lightweight")).toBe("gemini-3.5-flash-lite");
    expect(resolveGeminiModel("schema_repair")).toBe("gemini-3.5-flash-lite");
  });

  it("routes to gemini-3.6-flash only when premium:true is explicitly requested, regardless of operation", () => {
    expect(resolveGeminiModel("editorial_generate", undefined, true)).toBe("gemini-3.6-flash");
    // Premium never applies to translation/lightweight operations in practice
    // (callers never set it there), but the function itself just honors the
    // flag — the *decision* not to premium-escalate those lives in the
    // caller (generate-article.ts), not in this resolver.
  });

  it("respects GEMINI_PREMIUM_EDITORIAL_MODEL override for premium requests", () => {
    vi.stubEnv("GEMINI_PREMIUM_EDITORIAL_MODEL", "gemini-3.6-flash-custom");
    expect(resolveGeminiModel("editorial_generate", undefined, true)).toBe("gemini-3.6-flash-custom");
  });

  it("an explicit model override always wins, premium or not", () => {
    expect(resolveGeminiModel("editorial_generate", "gemini-explicit", true)).toBe("gemini-explicit");
  });
});

describe("requestGeminiChat — premium escalation telemetry", () => {
  it("calls the premium model URL and records premiumReason in usage telemetry metadata when premium:true", async () => {
    vi.stubEnv("GEMINI_API_KEY", "test-key");
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          candidates: [{ content: { parts: [{ text: "Sensitive story text." }] } }],
          usageMetadata: { promptTokenCount: 10, candidatesTokenCount: 6 },
        }),
        { status: 200, headers: { "content-type": "application/json" } }
      )
    );
    vi.stubGlobal("fetch", fetchMock);

    const result = await requestGeminiChat(
      baseRequest({
        operation: "editorial_generate",
        premium: true,
        premiumReason: "sensitive_category:crime",
      })
    );

    expect(result.ok).toBe(true);
    const url = fetchMock.mock.calls[0][0] as string;
    expect(url).toContain("gemini-3.6-flash");
    expect(url).not.toContain("gemini-3.5-flash-lite");

    expect(mockLogAiProviderUsage).toHaveBeenCalledWith(
      expect.objectContaining({
        provider: "gemini",
        model: "gemini-3.6-flash",
        metadata: expect.objectContaining({ premium: true, premiumReason: "sensitive_category:crime" }),
      })
    );
  });

  it("uses gemini-3.5-flash-lite (not premium) for a normal, non-escalated request", async () => {
    vi.stubEnv("GEMINI_API_KEY", "test-key");
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          candidates: [{ content: { parts: [{ text: "Routine local report." }] } }],
          usageMetadata: { promptTokenCount: 8, candidatesTokenCount: 4 },
        }),
        { status: 200, headers: { "content-type": "application/json" } }
      )
    );
    vi.stubGlobal("fetch", fetchMock);

    const result = await requestGeminiChat(baseRequest({ operation: "editorial_generate" }));

    expect(result.ok).toBe(true);
    const url = fetchMock.mock.calls[0][0] as string;
    expect(url).toContain("gemini-3.5-flash-lite");
  });
});

describe("requestGeminiChat — model-specific health isolation", () => {
  it("a cooldown on gemini-3.6-flash does not block gemini-3.5-flash-lite", async () => {
    vi.stubEnv("GEMINI_API_KEY", "test-key");
    const fetchMock = vi.fn().mockImplementation((url: string) => {
      if (url.includes("gemini-3.6-flash")) {
        return Promise.resolve(
          new Response(JSON.stringify({ error: { message: "blocked", status: "PERMISSION_DENIED" } }), {
            status: 403,
            headers: { "content-type": "application/json" },
          })
        );
      }
      return Promise.resolve(
        new Response(
          JSON.stringify({ candidates: [{ content: { parts: [{ text: "ok" }] } }], usageMetadata: {} }),
          { status: 200, headers: { "content-type": "application/json" } }
        )
      );
    });
    vi.stubGlobal("fetch", fetchMock);

    const premiumResult = await requestGeminiChat(baseRequest({ operation: "editorial_generate", premium: true, premiumReason: "test" }));
    expect(premiumResult.ok).toBe(false);

    const liteResult = await requestGeminiChat(baseRequest({ operation: "editorial_generate" }));
    expect(liteResult.ok).toBe(true);
  });
});
