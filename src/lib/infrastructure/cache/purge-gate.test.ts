import { describe, expect, it, vi } from "vitest";
import { purgeOncePerWindow, PURGE_DEBOUNCE_SECONDS, PURGE_GATE_KEY } from "./purge-gate";

/** Faithful stand-in for SET NX EX: the first caller in a window wins. */
function fakeGate() {
  let held = false;
  const calls: Array<{ keys: string[]; args: Array<string | number> }> = [];
  const evalGate = async (_s: string, keys: string[], args: Array<string | number>) => {
    calls.push({ keys, args });
    if (held) return 0;
    held = true;
    return 1;
  };
  return { evalGate, calls, expire: () => (held = false) };
}

describe("publish purge debounce (no duplicate cache refreshes)", () => {
  it("is 30 minutes and keyed in Redis", () => {
    expect(PURGE_DEBOUNCE_SECONDS).toBe(1800);
    expect(PURGE_GATE_KEY).toBe("jd:site-purge-gate");
  });

  it("many publishes in one window purge exactly once", async () => {
    const g = fakeGate();
    const purge = vi.fn(async () => {});
    const outcomes = [];
    for (let i = 0; i < 10; i++) outcomes.push(await purgeOncePerWindow(g.evalGate, purge));
    expect(purge).toHaveBeenCalledTimes(1);
    expect(outcomes.filter((o) => o === "purged")).toHaveLength(1);
    expect(outcomes.filter((o) => o === "debounced")).toHaveLength(9);
    expect(g.calls[0]!.args[0]).toBe(1800);
  });

  it("concurrent publishers race for the window: one winner", async () => {
    const g = fakeGate();
    const purge = vi.fn(async () => {});
    await Promise.all(Array.from({ length: 8 }, () => purgeOncePerWindow(g.evalGate, purge)));
    expect(purge).toHaveBeenCalledTimes(1);
  });

  it("a new window (key expired) allows the next purge", async () => {
    const g = fakeGate();
    const purge = vi.fn(async () => {});
    await purgeOncePerWindow(g.evalGate, purge);
    g.expire();
    await purgeOncePerWindow(g.evalGate, purge);
    expect(purge).toHaveBeenCalledTimes(2);
  });

  it("FAILS TOWARD FEWER READS: an unreadable gate (Redis down / error) skips the purge", async () => {
    const purge = vi.fn(async () => {});
    expect(await purgeOncePerWindow(async () => null, purge)).toBe("gate_unavailable");
    expect(await purgeOncePerWindow(async () => { throw new Error("down"); }, purge)).toBe("gate_unavailable");
    expect(purge).not.toHaveBeenCalled();
  });
});
