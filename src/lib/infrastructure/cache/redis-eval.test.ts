import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

describe("redisEval request shape (Upstash REST)", () => {
  const OLD = { ...process.env };
  beforeEach(() => {
    process.env.UPSTASH_REDIS_REST_URL = "https://example.upstash.io";
    process.env.UPSTASH_REDIS_REST_TOKEN = "tok";
    vi.resetModules();
  });
  afterEach(() => {
    process.env = { ...OLD };
    vi.unstubAllGlobals();
  });

  it("posts EVAL in positional form to the command endpoint (the /eval path rejects [script, keys, args])", async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ result: [1, "ok"] }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    const { redisEval } = await import("./redis");

    const out = await redisEval<[number, string]>("return {1,'ok'}", ["k1", "k2"], [5, "x"]);

    expect(out).toEqual([1, "ok"]);
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://example.upstash.io");
    expect(JSON.parse(String(init.body))).toEqual(["EVAL", "return {1,'ok'}", "2", "k1", "k2", "5", "x"]);
  });

  it("returns null (caller degrades) when Redis answers with an error status", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ error: "ERR" }), { status: 400 })));
    const { redisEval } = await import("./redis");
    expect(await redisEval("return 1", [], [])).toBeNull();
  });
});
