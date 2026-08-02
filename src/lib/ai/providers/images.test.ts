import { afterEach, describe, expect, it, vi } from "vitest";
import { requestImageGeneration } from "./images";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("requestImageGeneration", () => {
  // Cloudflare is first in the free-first chain (router.ts's IMAGE_CHAIN);
  // leaving CLOUDFLARE_ACCOUNT_ID/CLOUDFLARE_API_TOKEN unset here so these
  // OpenAI-specific tests exercise the OpenAI branch directly. OpenAI only
  // ever appears in the chain when explicitly enabled.
  it("uses GPT Image's base64 response without the legacy response_format field", async () => {
    vi.stubEnv("AI_PROVIDER_OPENAI_ENABLED", "true");
    vi.stubEnv("OPENAI_API_KEY", "test-key");
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({ data: [{ b64_json: "cG5n" }] }),
        { status: 200, headers: { "content-type": "application/json" } }
      )
    );
    vi.stubGlobal("fetch", fetchMock);

    const result = await requestImageGeneration({
      operation: "test",
      prompt: "A factual editorial illustration",
      model: "gpt-image-1",
    });

    const request = fetchMock.mock.calls[0][1] as RequestInit;
    const body = JSON.parse(String(request.body)) as Record<string, unknown>;
    expect(body.response_format).toBeUndefined();
    expect(result).toEqual({
      url: "data:image/png;base64,cG5n",
      provider: "openai",
      model: "gpt-image-1",
    });
  });

  it("keeps URL response format for DALL-E models", async () => {
    vi.stubEnv("AI_PROVIDER_OPENAI_ENABLED", "true");
    vi.stubEnv("OPENAI_API_KEY", "test-key");
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({ data: [{ url: "https://example.test/image.png" }] }),
        { status: 200, headers: { "content-type": "application/json" } }
      )
    );
    vi.stubGlobal("fetch", fetchMock);

    await requestImageGeneration({
      operation: "test",
      prompt: "A factual editorial illustration",
      model: "dall-e-3",
    });

    const request = fetchMock.mock.calls[0][1] as RequestInit;
    const body = JSON.parse(String(request.body)) as Record<string, unknown>;
    expect(body.response_format).toBe("url");
  });

  it("returns ai_unavailable when no provider in the chain is configured", async () => {
    const result = await requestImageGeneration({
      operation: "test",
      prompt: "A factual editorial illustration",
    });

    expect(result).toEqual({
      error: expect.objectContaining({ code: "ai_unavailable" }),
    });
  });
});
