import { beforeEach, describe, expect, it, vi } from "vitest";
import { cachedRead, clearSharedReadMemo } from "./shared-read-cache";

beforeEach(() => {
  clearSharedReadMemo();
  delete process.env.JD_DISABLE_READ_CACHE;
});

describe("cachedRead", () => {
  it("runs the loader once per TTL and serves repeat calls from cache (outside Next: in-process memo)", async () => {
    const loader = vi.fn(async () => ({ rows: [1, 2, 3] }));
    const a = await cachedRead(["k1"], { ttlSeconds: 60 }, loader);
    const b = await cachedRead(["k1"], { ttlSeconds: 60 }, loader);
    expect(a).toEqual({ rows: [1, 2, 3] });
    expect(b).toEqual(a);
    expect(loader).toHaveBeenCalledTimes(1);
  });

  it("keys are independent", async () => {
    const loader = vi.fn(async () => 1);
    await cachedRead(["a"], { ttlSeconds: 60 }, loader);
    await cachedRead(["b"], { ttlSeconds: 60 }, loader);
    expect(loader).toHaveBeenCalledTimes(2);
  });

  it("never caches a failing loader and propagates its own error", async () => {
    const boom = new Error("pool read failed");
    const loader = vi.fn().mockRejectedValueOnce(boom).mockResolvedValueOnce("ok");
    await expect(cachedRead(["f"], { ttlSeconds: 60 }, loader)).rejects.toBe(boom);
    await expect(cachedRead(["f"], { ttlSeconds: 60 }, loader)).resolves.toBe("ok");
    expect(loader).toHaveBeenCalledTimes(2);
  });

  it("is a pass-through when the TTL is 0 or JD_DISABLE_READ_CACHE=true", async () => {
    const loader = vi.fn(async () => 1);
    await cachedRead(["z"], { ttlSeconds: 0 }, loader);
    await cachedRead(["z"], { ttlSeconds: 0 }, loader);
    process.env.JD_DISABLE_READ_CACHE = "true";
    await cachedRead(["y"], { ttlSeconds: 60 }, loader);
    await cachedRead(["y"], { ttlSeconds: 60 }, loader);
    expect(loader).toHaveBeenCalledTimes(4);
  });
});
