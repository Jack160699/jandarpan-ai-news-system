import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/server", async (importOriginal) => {
  const actual = await importOriginal<typeof import("next/server")>();
  return { ...actual, after: (fn: () => unknown) => fn() };
});

import { requestChatCompletion } from "./chat";
import { resetProviderHealthForTests } from "./health";

const ok = (text: string) =>
  new Response(
    JSON.stringify({
      choices: [{ message: { content: text } }],
      candidates: [{ content: { parts: [{ text }] } }],
      usage: { prompt_tokens: 1, completion_tokens: 1 },
    }),
    { status: 200, headers: { "content-type": "application/json" } }
  );

const err = (status: number, message: string) =>
  new Response(JSON.stringify({ error: { message } }), {
    status,
    headers: { "content-type": "application/json" },
  });

const base = { operation: "editorial_generate", system: "s", user: "u" };

beforeEach(() => {
  resetProviderHealthForTests();
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("provider failover", () => {
  it("never forwards a codecraft-only model override to gemini or groq", async () => {
    vi.stubEnv("GEMINI_API_KEY", "g");
    vi.stubEnv("GROQ_API_KEY", "q");
    const seen: Array<{ url: string; model?: string }> = [];
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation((url: string, init?: RequestInit) => {
        const u = String(url);
        const body = init?.body ? JSON.parse(String(init.body)) : {};
        seen.push({ url: u, model: body.model ?? u.match(/models\/([^:]+):/)?.[1] });
        if (u.includes("generativelanguage")) return Promise.resolve(err(503, "overloaded"));
        return Promise.resolve(ok("from groq"));
      })
    );

    const result = await requestChatCompletion({ ...base, model: "deepseek-v4-pro-max" });

    expect(result.ok).toBe(true);
    for (const call of seen) {
      expect(call.model).not.toBe("deepseek-v4-pro-max");
    }
    // gemini was attempted with its own model, groq answered with its own model
    expect(seen.some((c) => c.url.includes("generativelanguage") && c.model?.startsWith("gemini-"))).toBe(true);
    expect(seen.some((c) => c.url.includes("api.groq.com") && c.model === "llama-3.3-70b-versatile")).toBe(true);
    if (result.ok) expect(result.provider).toBe("groq");
  });

  it("fails over past a dead provider and does not re-probe it while its circuit is open", async () => {
    vi.stubEnv("GEMINI_API_KEY", "g");
    vi.stubEnv("GROQ_API_KEY", "q");
    let geminiCalls = 0;
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation((url: string) => {
        if (String(url).includes("generativelanguage")) {
          geminiCalls++;
          return Promise.resolve(err(404, "models/gemini-3.5-flash-lite is not found for API version"));
        }
        return Promise.resolve(ok("from groq"));
      })
    );

    const first = await requestChatCompletion(base);
    const second = await requestChatCompletion(base);
    const third = await requestChatCompletion(base);

    for (const r of [first, second, third]) {
      expect(r.ok).toBe(true);
      if (r.ok) expect(r.provider).toBe("groq");
    }
    // one probe only — a nonexistent model opens the circuit for hours
    expect(geminiCalls).toBe(1);
  });

  it("reports the last real failure when every provider fails, without throwing", async () => {
    vi.stubEnv("GEMINI_API_KEY", "g");
    vi.stubEnv("GROQ_API_KEY", "q");
    vi.stubGlobal("fetch", vi.fn().mockImplementation(() => Promise.resolve(err(500, "boom"))));
    const result = await requestChatCompletion(base);
    expect(result.ok).toBe(false);
  });
});
