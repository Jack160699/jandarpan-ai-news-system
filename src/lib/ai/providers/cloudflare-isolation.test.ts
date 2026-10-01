import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CLOUDFLARE_EMBEDDING_DIMENSIONS, CLOUDFLARE_EMBEDDINGS_HEALTH_KEY, requestCloudflareEmbeddings } from "./cloudflare-embeddings";
import { CLOUDFLARE_IMAGES_HEALTH_KEY, requestCloudflareImageGeneration } from "./cloudflare-images";
import { getAiProviderHealthSnapshots, getCloudflareCapabilityHealth, isProviderHealthy, resetProviderHealthForTests } from "./health";
import {
  EMBEDDING_PROVIDER_MAX_TOKENS,
  EMBEDDING_REQUEST_TOKEN_BUDGET,
  EMBEDDING_TEXT_TOKEN_CAP,
  conservativeEmbeddingTokens,
  planEmbeddingInput,
  truncateToTokenCap,
} from "./embedding-input";
import { __resetCloudflareNeuronsForTests, __resetQuotaCountersForTests } from "./quota";

const vec = (seed: number) => Array.from({ length: CLOUDFLARE_EMBEDDING_DIMENSIONS }, (_, i) => seed + i / 10_000);
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
const imageOk = () => new Response(new Uint8Array([1, 2, 3]), { status: 200, headers: { "content-type": "image/png" } });

beforeEach(() => {
  vi.stubEnv("CLOUDFLARE_ACCOUNT_ID", "test-account");
  vi.stubEnv("CLOUDFLARE_API_TOKEN", "test-token");
  resetProviderHealthForTests();
  __resetQuotaCountersForTests();
  __resetCloudflareNeuronsForTests();
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

/** What production sent: dozens of long Hindi texts that summed to ~77k tokens against a 60k limit. */
const hindi = (chars: number) => "छत्तीसगढ़ पुलिस मुख्यालय ने निरीक्षकों के तबादले के आदेश जारी किए। ".repeat(Math.ceil(chars / 38)).slice(0, chars);

describe("embedding input planning (pure)", () => {
  it("counts Indic text conservatively (every non-ASCII char is a full token)", () => {
    expect(conservativeEmbeddingTokens("abcdef")).toBe(2);
    expect(conservativeEmbeddingTokens("छत्तीसगढ़")).toBeGreaterThanOrEqual("छत्तीसगढ़".length);
  });

  it("truncates deterministically and never above the per-text cap", () => {
    const long = hindi(20_000);
    const a = truncateToTokenCap(long, EMBEDDING_TEXT_TOKEN_CAP);
    expect(conservativeEmbeddingTokens(a)).toBeLessThanOrEqual(EMBEDDING_TEXT_TOKEN_CAP);
    expect(truncateToTokenCap(long, EMBEDDING_TEXT_TOKEN_CAP)).toBe(a);
  });

  it("plans the ~77k-token production batch into requests that can never exceed the provider limit", () => {
    const texts = Array.from({ length: 30 }, () => hindi(2_600)); // 78,000 conservative tokens - the real incident
    expect(texts.reduce((n, t) => n + conservativeEmbeddingTokens(t), 0)).toBeGreaterThan(EMBEDDING_PROVIDER_MAX_TOKENS);
    const plan = planEmbeddingInput(texts);
    expect(plan.reduced).toBe(true);
    expect(plan.batches.length).toBeGreaterThan(1);
    for (const b of plan.batches) {
      expect(b.estimatedTokens).toBeLessThanOrEqual(EMBEDDING_REQUEST_TOKEN_BUDGET);
      expect(b.estimatedTokens).toBeLessThan(EMBEDDING_PROVIDER_MAX_TOKENS);
    }
    // order preserved and every input accounted for exactly once
    expect(plan.batches.flatMap((b) => b.indices)).toEqual(texts.map((_, i) => i));
    expect(planEmbeddingInput(texts)).toEqual(plan); // deterministic
  });

  it("clamps misconfigured limits so they can never reach the provider limit", () => {
    const plan = planEmbeddingInput([hindi(50_000)], { requestTokenBudget: 10_000_000, textTokenCap: 10_000_000, maxTexts: 999 } as never);
    // limits passed directly are the caller's; env-derived limits are what production uses:
    vi.stubEnv("CLOUDFLARE_EMBEDDING_MAX_REQUEST_TOKENS", "9999999");
    const real = planEmbeddingInput([hindi(200_000)]);
    expect(real.batches[0]!.estimatedTokens).toBeLessThanOrEqual(EMBEDDING_PROVIDER_MAX_TOKENS * 0.5);
    expect(plan.inputTexts).toBe(1);
  });

  it("leaves a normal small input untouched (no reduction, one request)", () => {
    const plan = planEmbeddingInput(["a short headline", "another short headline"]);
    expect(plan.reduced).toBe(false);
    expect(plan.batches).toHaveLength(1);
  });
});

describe("requestCloudflareEmbeddings never sends an oversized request", () => {
  it("chunks an oversized input BEFORE the provider call, keeps vector order, and logs the decision", async () => {
    const sizes: number[] = [];
    const fetchMock = vi.fn(async (_url: unknown, init: { body?: string }) => {
      const texts = (JSON.parse(String(init.body)) as { text: string[] }).text;
      sizes.push(texts.reduce((n, t) => n + conservativeEmbeddingTokens(t), 0));
      // each returned vector's first element encodes the text's length so we can verify positional alignment
      return json({ success: true, result: { data: texts.map((t) => vec(t.length)) } });
    });
    vi.stubGlobal("fetch", fetchMock);
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

    const texts = Array.from({ length: 30 }, (_, i) => hindi(2_000 + i * 20));
    const r = await requestCloudflareEmbeddings({ operation: "cluster_embeddings", texts });

    expect("error" in r).toBe(false);
    if ("error" in r) return;
    expect(fetchMock.mock.calls.length).toBeGreaterThan(1);
    for (const s of sizes) expect(s).toBeLessThanOrEqual(EMBEDDING_REQUEST_TOKEN_BUDGET);
    expect(Math.max(...sizes)).toBeLessThan(EMBEDDING_PROVIDER_MAX_TOKENS);
    expect(r.vectors).toHaveLength(30);
    // positional alignment: vector i was produced for (truncated) text i
    r.vectors.forEach((v, i) => {
      expect(v[0]).toBeCloseTo(Math.min(texts[i]!.length, truncateToTokenCap(texts[i]!, EMBEDDING_TEXT_TOKEN_CAP).length), 3);
    });
    const logged = warn.mock.calls.map((c) => String(c[0])).find((l) => l.includes("input_reduced"));
    expect(logged).toBeTruthy();
    expect(JSON.parse(logged!.replace("[cloudflare-embeddings] ", ""))).toMatchObject({ event: "input_reduced", operation: "cluster_embeddings", input_texts: 30 });
  });

  it("a provider 'Max context reached' 400 is OUR invalid request: it must not open any circuit", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => json({ success: false, errors: [{ code: 5006, message: "Max context reached 77841 tokens but model supports only 60000" }] }, 400)));
    const r = await requestCloudflareEmbeddings({ operation: "cluster_embeddings", texts: ["short"] });
    expect("error" in r && r.error.invalidRequest).toBe(true);
    expect(isProviderHealthy(CLOUDFLARE_EMBEDDINGS_HEALTH_KEY)).toBe(true);
    expect(isProviderHealthy(CLOUDFLARE_IMAGES_HEALTH_KEY)).toBe(true);
    expect(isProviderHealthy("cloudflare")).toBe(true);
  });
});

describe("Cloudflare capability circuits are independent", () => {
  it("an embeddings OUTAGE does not disable media/image processing", async () => {
    const fetchMock = vi.fn(async (url: unknown) => (String(url).includes("bge-m3") ? json({ success: false, errors: [{ message: "Authentication error" }] }, 401) : imageOk()));
    vi.stubGlobal("fetch", fetchMock);

    const e = await requestCloudflareEmbeddings({ operation: "cluster_embeddings", texts: ["a headline"] });
    expect("error" in e).toBe(true);
    expect(isProviderHealthy(CLOUDFLARE_EMBEDDINGS_HEALTH_KEY)).toBe(false); // the embeddings circuit opened ...
    expect(isProviderHealthy(CLOUDFLARE_IMAGES_HEALTH_KEY)).toBe(true); // ... and ONLY that one

    const img = await requestCloudflareImageGeneration({ operation: "editorial_image", prompt: "a factual illustration" });
    expect("url" in img).toBe(true); // media still works
  });

  it("a media OUTAGE does not disable embeddings", async () => {
    const fetchMock = vi.fn(async (url: unknown) =>
      String(url).includes("flux") || String(url).includes("stable-diffusion") || !String(url).includes("bge-m3")
        ? json({ success: false, errors: [{ message: "Authentication error" }] }, 401)
        : json({ success: true, result: { data: [vec(1)] } }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const img = await requestCloudflareImageGeneration({ operation: "editorial_image", prompt: "x" });
    expect("error" in img).toBe(true);
    expect(isProviderHealthy(CLOUDFLARE_IMAGES_HEALTH_KEY)).toBe(false); // the image circuit opened ...
    expect(isProviderHealthy(CLOUDFLARE_EMBEDDINGS_HEALTH_KEY)).toBe(true); // ... and embeddings are untouched

    const e = await requestCloudflareEmbeddings({ operation: "cluster_embeddings", texts: ["a headline"] });
    expect("vectors" in e).toBe(true);
  });

  it("the dashboard still reports Cloudflare as degraded (worst case) while exposing each capability", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => json({ success: false, errors: [{ message: "Authentication error" }] }, 401)));
    await requestCloudflareEmbeddings({ operation: "cluster_embeddings", texts: ["a headline"] });

    const cf = getAiProviderHealthSnapshots().find((s) => s.provider === "cloudflare")!;
    expect(cf.healthy).toBe(false);
    const caps = Object.fromEntries(getCloudflareCapabilityHealth().map((c) => [c.capability, c.healthy]));
    expect(caps).toEqual({ embeddings: false, images: true });
  });
});
