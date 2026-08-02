import { afterEach, describe, expect, it, vi } from "vitest";
import { requestCloudflareImageGeneration } from "./cloudflare-images";
import { __resetCloudflareNeuronsForTests, getCloudflareNeuronForecast } from "./quota";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  __resetCloudflareNeuronsForTests();
});

function stubCloudflareEnv() {
  vi.stubEnv("CLOUDFLARE_ACCOUNT_ID", "test-account");
  vi.stubEnv("CLOUDFLARE_API_TOKEN", "test-token");
}

describe("requestCloudflareImageGeneration", () => {
  it("defaults to 1024x1024/4 steps and sends them as explicit request parameters", async () => {
    stubCloudflareEnv();
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(new Uint8Array([1, 2, 3]), { status: 200, headers: { "content-type": "image/png" } })
    );
    vi.stubGlobal("fetch", fetchMock);

    await requestCloudflareImageGeneration({ operation: "test", prompt: "a factual editorial illustration" });

    const body = JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body)) as Record<string, unknown>;
    expect(body.width).toBe(1024);
    expect(body.height).toBe(1024);
    expect(body.steps).toBe(4);
  });

  it("threads custom width/height/steps through to the request body", async () => {
    stubCloudflareEnv();
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(new Uint8Array([1, 2, 3]), { status: 200, headers: { "content-type": "image/png" } })
    );
    vi.stubGlobal("fetch", fetchMock);

    await requestCloudflareImageGeneration({ operation: "test", prompt: "test", width: 512, height: 768, steps: 6 });

    const body = JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body)) as Record<string, unknown>;
    expect(body.width).toBe(512);
    expect(body.height).toBe(768);
    expect(body.steps).toBe(6);
  });

  it("reserves 57.6 neurons for a default 1024x1024/4-step image, reflected in the forecast afterwards", async () => {
    stubCloudflareEnv();
    vi.stubEnv("AI_QUOTA_CLOUDFLARE_NEURON_CAP", "1000");
    vi.stubEnv("AI_QUOTA_BREAKING_RESERVE_FRACTION", "0");
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(new Uint8Array([1, 2, 3]), { status: 200, headers: { "content-type": "image/png" } })
    );
    vi.stubGlobal("fetch", fetchMock);

    await requestCloudflareImageGeneration({ operation: "test", prompt: "test" });

    const forecast = await getCloudflareNeuronForecast();
    expect(forecast.usedToday).toBeCloseTo(57.6, 5);
  });

  it("hard-stops before exceeding the daily neuron cap, without calling fetch", async () => {
    stubCloudflareEnv();
    vi.stubEnv("AI_QUOTA_CLOUDFLARE_NEURON_CAP", "50");
    vi.stubEnv("AI_QUOTA_BREAKING_RESERVE_FRACTION", "0");
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    // Default image costs 57.6 neurons — over the 50-neuron cap.
    const result = await requestCloudflareImageGeneration({ operation: "test", prompt: "test" });

    expect(result).toEqual({ error: expect.objectContaining({ code: "ai_quota_exhausted" }) });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("releases the neuron reservation when the request fails", async () => {
    stubCloudflareEnv();
    vi.stubEnv("AI_QUOTA_CLOUDFLARE_NEURON_CAP", "1000");
    vi.stubEnv("AI_QUOTA_BREAKING_RESERVE_FRACTION", "0");
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ success: false, errors: [{ message: "boom" }] }), {
        status: 500,
        headers: { "content-type": "application/json" },
      })
    );
    vi.stubGlobal("fetch", fetchMock);

    await requestCloudflareImageGeneration({ operation: "test", prompt: "test" });

    const forecast = await getCloudflareNeuronForecast();
    expect(forecast.usedToday).toBe(0);
  });

  it("returns ai_unavailable without calling fetch when Cloudflare credentials are not configured", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const result = await requestCloudflareImageGeneration({ operation: "test", prompt: "test" });

    expect(result).toEqual({ error: expect.objectContaining({ code: "ai_unavailable" }) });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
