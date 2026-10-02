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

describe("single-flight (no duplicate cache refreshes)", () => {
  it("a burst of concurrent requests for an expired key runs the loader ONCE and all callers get the same value", async () => {
    let calls = 0;
    const loader = async () => {
      calls++;
      await new Promise((r) => setTimeout(r, 20));
      return { rows: calls };
    };
    const results = await Promise.all(Array.from({ length: 25 }, () => cachedRead(["burst"], { ttlSeconds: 60 }, loader)));
    expect(calls).toBe(1);
    expect(new Set(results.map((r) => r.rows))).toEqual(new Set([1]));
  });

  it("a failed shared load rejects every waiter once, is not cached, and the next caller retries", async () => {
    const boom = new Error("db down");
    const loader = vi.fn().mockRejectedValueOnce(boom).mockResolvedValueOnce("ok");
    const burst = await Promise.allSettled(Array.from({ length: 5 }, () => cachedRead(["flaky"], { ttlSeconds: 60 }, loader)));
    expect(burst.every((r) => r.status === "rejected")).toBe(true);
    expect(loader).toHaveBeenCalledTimes(1);
    await expect(cachedRead(["flaky"], { ttlSeconds: 60 }, loader)).resolves.toBe("ok");
    expect(loader).toHaveBeenCalledTimes(2);
  });

  it("different keys are never merged", async () => {
    const loader = vi.fn(async () => 1);
    await Promise.all([cachedRead(["a"], { ttlSeconds: 60 }, loader), cachedRead(["b"], { ttlSeconds: 60 }, loader)]);
    expect(loader).toHaveBeenCalledTimes(2);
  });
});
