import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// next/server's after() requires an active Next.js request-scope
// (AsyncLocalStorage-tracked), which doesn't exist when calling
// requestChatCompletion directly in a unit test. Runs the callback
// immediately instead — fine for assertions, which only care that the
// usage-record write was attempted with the right payload.
vi.mock("next/server", async (importOriginal) => {
  const actual = await importOriginal<typeof import("next/server")>();
  return { ...actual, after: (fn: () => unknown) => fn() };
});

import { requestChatCompletion } from "./chat";

// health.ts's provider-health registry is a module-level Map with no
// exported reset (see the same note in gemini.test.ts). None of the
// scenarios below provoke a failure response from a *configured* provider
// (the "openai disabled" case never reaches a provider at all — it fails
// before any fetch), so no cooldown gets set here, but we still fast-time
// between tests defensively/cheaply in case that changes.
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
});

function baseRequest(overrides: Partial<Parameters<typeof requestChatCompletion>[0]> = {}) {
  return {
    operation: "editorial_generate",
    system: "You are a helpful assistant.",
    user: "Say hello.",
    ...overrides,
  };
}

const geminiSuccessBody = JSON.stringify({
  candidates: [{ content: { parts: [{ text: "Hello from Gemini." }] } }],
  usageMetadata: { promptTokenCount: 5, candidatesTokenCount: 3 },
});

const openAiCompatSuccessBody = JSON.stringify({
  choices: [{ message: { content: "Hello from the chat endpoint." } }],
  usage: { prompt_tokens: 5, completion_tokens: 3 },
});

function mockFetchByUrl(handlers: Record<string, () => Response>) {
  return vi.fn().mockImplementation((url: string) => {
    for (const [needle, respond] of Object.entries(handlers)) {
      if (String(url).includes(needle)) return Promise.resolve(respond());
    }
    return Promise.resolve(
      new Response(JSON.stringify({ error: { message: "unexpected URL in test" } }), {
        status: 500,
        headers: { "content-type": "application/json" },
      })
    );
  });
}

describe("requestChatCompletion", () => {
  it("uses gemini when only GEMINI_API_KEY is set", async () => {
    vi.stubEnv("GEMINI_API_KEY", "test-key");
    const fetchMock = mockFetchByUrl({
      "generativelanguage.googleapis.com": () =>
        new Response(geminiSuccessBody, { status: 200, headers: { "content-type": "application/json" } }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await requestChatCompletion(baseRequest());

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.provider).toBe("gemini");
      expect(result.content).toBe("Hello from Gemini.");
    }
  });

  it("uses groq when only GROQ_API_KEY is set, hitting api.groq.com with an OpenAI-compatible body", async () => {
    vi.stubEnv("GROQ_API_KEY", "test-key");
    const fetchMock = mockFetchByUrl({
      "api.groq.com": () =>
        new Response(openAiCompatSuccessBody, { status: 200, headers: { "content-type": "application/json" } }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await requestChatCompletion(baseRequest());

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.provider).toBe("groq");
      expect(result.content).toBe("Hello from the chat endpoint.");
    }
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const url = fetchMock.mock.calls[0][0] as string;
    expect(url).toContain("api.groq.com");
  });

  it("sends max_completion_tokens (not max_tokens) to Groq, especially under jsonMode — confirmed live that Groq's json_object mode 400s (json_validate_failed) with the legacy max_tokens param but succeeds with max_completion_tokens", async () => {
    vi.stubEnv("GROQ_API_KEY", "test-key");
    const fetchMock = mockFetchByUrl({
      "api.groq.com": () =>
        new Response(openAiCompatSuccessBody, { status: 200, headers: { "content-type": "application/json" } }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await requestChatCompletion(
      baseRequest({ operation: "editorial_review", jsonMode: true, maxTokens: 500 })
    );

    expect(result.ok).toBe(true);
    const body = JSON.parse(fetchMock.mock.calls[0][1].body as string) as Record<string, unknown>;
    expect(body.max_completion_tokens).toBe(500);
    expect(body.max_tokens).toBeUndefined();
    expect(body.response_format).toEqual({ type: "json_object" });
  });

  it("still sends max_tokens (not max_completion_tokens) to OpenAI — the Groq-specific fix must not change other providers", async () => {
    vi.stubEnv("AI_PROVIDER_OPENAI_ENABLED", "true");
    vi.stubEnv("OPENAI_API_KEY", "test-key");
    const fetchMock = mockFetchByUrl({
      "api.openai.com": () =>
        new Response(openAiCompatSuccessBody, { status: 200, headers: { "content-type": "application/json" } }),
    });
    vi.stubGlobal("fetch", fetchMock);

    await requestChatCompletion(baseRequest({ maxTokens: 500 }));

    const body = JSON.parse(fetchMock.mock.calls[0][1].body as string) as Record<string, unknown>;
    expect(body.max_tokens).toBe(500);
    expect(body.max_completion_tokens).toBeUndefined();
  });

  it("never silently uses OpenAI: OPENAI_API_KEY set but AI_PROVIDER_OPENAI_ENABLED not 'true' and no other provider configured -> ai_unavailable", async () => {
    vi.stubEnv("OPENAI_API_KEY", "test-key");
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const result = await requestChatCompletion(baseRequest());

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("ai_unavailable");
    }
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("uses openai once AI_PROVIDER_OPENAI_ENABLED=true and only OPENAI_API_KEY is set", async () => {
    vi.stubEnv("AI_PROVIDER_OPENAI_ENABLED", "true");
    vi.stubEnv("OPENAI_API_KEY", "test-key");
    const fetchMock = mockFetchByUrl({
      "api.openai.com": () =>
        new Response(openAiCompatSuccessBody, { status: 200, headers: { "content-type": "application/json" } }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await requestChatCompletion(baseRequest());

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.provider).toBe("openai");
      expect(result.content).toBe("Hello from the chat endpoint.");
    }
    const url = fetchMock.mock.calls[0][0] as string;
    expect(url).toContain("api.openai.com");
  });

  it("defaults the reviewer to openai/gpt-oss-120b and the lightweight model to llama-3.1-8b-instant", async () => {
    vi.stubEnv("GROQ_API_KEY", "test-key");
    let sentModels: string[] = [];
    const fetchMock = vi.fn().mockImplementation((_url: string, init: RequestInit) => {
      const body = JSON.parse(String(init.body)) as { model: string };
      sentModels.push(body.model);
      return Promise.resolve(
        new Response(openAiCompatSuccessBody, { status: 200, headers: { "content-type": "application/json" } })
      );
    });
    vi.stubGlobal("fetch", fetchMock);

    await requestChatCompletion(baseRequest({ operation: "editorial_review" }));
    expect(sentModels).toEqual(["openai/gpt-oss-120b"]);

    sentModels = [];
    await requestChatCompletion(baseRequest({ operation: "classification_lightweight" }));
    expect(sentModels).toEqual(["llama-3.1-8b-instant"]);
  });

  it("falls back from openai/gpt-oss-120b to llama-3.3-70b-versatile within Groq when the primary reviewer model is blocked, and reports the transition (not silently)", async () => {
    vi.stubEnv("GROQ_API_KEY", "test-key");
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const fetchMock = vi.fn().mockImplementation((_url: string, init: RequestInit) => {
      const body = JSON.parse(String(init.body)) as { model: string };
      if (body.model === "openai/gpt-oss-120b") {
        return Promise.resolve(
          new Response(JSON.stringify({ error: { message: "model access denied for this account" } }), {
            status: 403,
            headers: { "content-type": "application/json" },
          })
        );
      }
      return Promise.resolve(
        new Response(openAiCompatSuccessBody, { status: 200, headers: { "content-type": "application/json" } })
      );
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await requestChatCompletion(baseRequest({ operation: "editorial_review" }));

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.provider).toBe("groq");

    const sentModels = fetchMock.mock.calls.map((call) => (JSON.parse(String(call[1].body)) as { model: string }).model);
    expect(sentModels).toEqual(["openai/gpt-oss-120b", "llama-3.3-70b-versatile"]);

    // The fallback must be visibly reported, not a silent downgrade.
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining("[ai-model-fallback]"));
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining("openai/gpt-oss-120b"));
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining("llama-3.3-70b-versatile"));
    warnSpy.mockRestore();
  });

  it("respects GROQ_REVIEW_MODEL / GROQ_REVIEW_FALLBACK_MODEL overrides", async () => {
    vi.stubEnv("GROQ_API_KEY", "test-key");
    vi.stubEnv("GROQ_REVIEW_MODEL", "custom-primary");
    vi.stubEnv("GROQ_REVIEW_FALLBACK_MODEL", "custom-fallback");
    const sentModels: string[] = [];
    const fetchMock = vi.fn().mockImplementation((_url: string, init: RequestInit) => {
      const body = JSON.parse(String(init.body)) as { model: string };
      sentModels.push(body.model);
      return Promise.resolve(
        new Response(openAiCompatSuccessBody, { status: 200, headers: { "content-type": "application/json" } })
      );
    });
    vi.stubGlobal("fetch", fetchMock);

    await requestChatCompletion(baseRequest({ operation: "editorial_review" }));
    expect(sentModels).toEqual(["custom-primary"]);
  });
});
