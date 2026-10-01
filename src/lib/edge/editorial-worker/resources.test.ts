import { afterEach, describe, expect, it, vi } from "vitest";
import { startResourceTracker } from "./resources";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("resource tracker never reports a stubbed runtime as a measurement", () => {
  it("cpu/rss returning zeros (hosted Supabase Edge behaviour) => unverified, not '0 ms verified'", () => {
    vi.spyOn(process, "cpuUsage").mockReturnValue({ user: 0, system: 0 });
    vi.spyOn(process, "memoryUsage").mockReturnValue({ rss: 0, heapUsed: 12 * 1048576, heapTotal: 0, external: 0, arrayBuffers: 0 } as never);
    const t = startResourceTracker(10_000);
    const r = t.stop();
    expect(r.cpu_verified).toBe(false);
    expect(r.cpu_ms).toBeNull();
    expect(r.cpu_note).toMatch(/stubbed|unavailable/);
    expect(r.rss_verified).toBe(false);
    expect(r.rss_peak_mb).toBeNull();
    expect(r.heap_peak_mb).toBeGreaterThan(0); // heap is a real number in that runtime
    expect(r.memory_verified).toBe(true);
  });

  it("a runtime with real counters is reported as measured", () => {
    let calls = 0;
    vi.spyOn(process, "cpuUsage").mockImplementation(() => ({ user: 1_000 + 40_000 * calls++, system: 500 }));
    const r = startResourceTracker(10_000).stop();
    expect(r.cpu_verified).toBe(true);
    expect(r.cpu_ms).toBeGreaterThan(0);
    expect(r.cpu_note).toBeNull();
  });
});
