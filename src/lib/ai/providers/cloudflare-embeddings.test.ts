import { afterEach, describe, expect, it, vi } from "vitest";
import {
  isCloudflareEmbeddingsConfigured,
  requestCloudflareEmbeddings,
} from "./cloudflare-embeddings";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

function stubCloudflareEnv() {
  vi.stubEnv("CLOUDFLARE_ACCOUNT_ID", "test-account");
  vi.stubEnv("CLOUDFLARE_API_TOKEN", "test-token");
}

describe("requestCloudflareEmbeddings", () => {
  it("returns vectors/model from a successful nested {result:{data:[[...],[...]]}} response", async () => {
    stubCloudflareEnv();
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          result: { data: [[0.1, 0.2, 0.3], [0.4, 0.5, 0.6]] },
          success: true,
        }),
        { status: 200, headers: { "content-type": "application/json" } }
      )
    );
    vi.stubGlobal("fetch", fetchMock);

    const result = await requestCloudflareEmbeddings({
      operation: "test",
      texts: ["first text", "second text"],
    });

    expect(result).toEqual({
      vectors: [[0.1, 0.2, 0.3], [0.4, 0.5, 0.6]],
      model: "@cf/baai/bge-m3",
    });
  });

  it("normalizes a flat single-vector response into a 1-vector array", async () => {
    stubCloudflareEnv();
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          result: { data: [0.1, 0.2, 0.3] },
          success: true,
        }),
        { status: 200, headers: { "content-type": "application/json" } }
      )
    );
    vi.stubGlobal("fetch", fetchMock);

    const result = await requestCloudflareEmbeddings({
      operation: "test",
      texts: ["single text"],
    });

    expect(result).toEqual({
      vectors: [[0.1, 0.2, 0.3]],
      model: "@cf/baai/bge-m3",
    });
  });

  it("classifies a {success:false, errors:[...]} envelope as an error, not a thrown exception", async () => {
    stubCloudflareEnv();
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          success: false,
          errors: [{ code: 5007, message: "Model not found" }],
        }),
        { status: 200, headers: { "content-type": "application/json" } }
      )
    );
    vi.stubGlobal("fetch", fetchMock);

    const result = await requestCloudflareEmbeddings({
      operation: "test",
      texts: ["some text"],
    });

    expect(result).toEqual({
      error: expect.objectContaining({
        code: "ai_http_error",
        message: "Model not found",
        retryable: false,
      }),
    });
  });

  it("returns ai_unavailable without calling fetch when Cloudflare credentials are not configured", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    expect(isCloudflareEmbeddingsConfigured()).toBe(false);

    const result = await requestCloudflareEmbeddings({
      operation: "test",
      texts: ["some text"],
    });

    expect(result).toEqual({
      error: expect.objectContaining({ code: "ai_unavailable" }),
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
