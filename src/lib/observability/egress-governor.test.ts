import { beforeEach, describe, expect, it, vi } from "vitest";

// ---- in-memory Redis with the two Lua scripts the governor uses -------------------------------------------------------------
const store = new Map<string, number>();
const ttls = new Map<string, number>();
let redisConfigured = true;
let redisBroken = false;
let evalCount = 0;

vi.mock("@/lib/infrastructure/cache/redis", () => ({
  isRedisConfigured: () => redisConfigured,
  redisEval: async (script: string, keys: string[], args: Array<string | number>) => {
    evalCount++;
    if (redisBroken) return null;
    const k = keys[0]!;
    if (script.includes("INCRBY")) {
      store.set(k, (store.get(k) ?? 0) + Number(args[0]));
      if (!ttls.has(k)) ttls.set(k, Number(args[1]));
      return store.get(k)!;
    }
    return store.get(k) ?? 0;
  },
}));

import {
  addCycleBytes,
  cycleEndUtc,
  cycleKey,
  cycleStartUtc,
  evaluateEgressGovernor,
  getEgressGovernorSnapshot,
  GOVERNOR_DEFAULTS,
  readGovernorConfig,
  recordRunEgress,
  stateForUsage,
  thresholdsFor,
} from "./egress-governor";
import { meteredFetch, resetEgress } from "./egress-meter";

const ENFORCE = { JD_EGRESS_GOVERNOR: "enforce", JD_EGRESS_METER: "true", JD_EGRESS_CYCLE_ANCHOR_DAY: "21" };
const NOW = new Date("2026-10-25T12:00:00Z");

beforeEach(() => {
  store.clear();
  ttls.clear();
  redisConfigured = true;
  redisBroken = false;
  evalCount = 0;
  resetEgress();
});

describe("configuration", () => {
  it("defaults: OFF, 5 GB budget, 1.5 GB site reserve, warn 60% / stop 80% of the remainder", () => {
    const c = readGovernorConfig({});
    expect(c).toMatchObject({ mode: "off", valid: true, ...GOVERNOR_DEFAULTS });
    const t = thresholdsFor(c);
    expect(t).toEqual({ workerBudgetBytes: 3_500_000_000, warnAtBytes: 2_100_000_000, stopAtBytes: 2_800_000_000 });
  });

  it("only the exact words 'observe' / 'enforce' switch it on: a typo is OFF, never a surprise block", () => {
    expect(readGovernorConfig({ JD_EGRESS_GOVERNOR: "enforce" }).mode).toBe("enforce");
    expect(readGovernorConfig({ JD_EGRESS_GOVERNOR: "ENFORCE " }).mode).toBe("enforce");
    expect(readGovernorConfig({ JD_EGRESS_GOVERNOR: "observe" }).mode).toBe("observe");
    for (const typo of ["enfroce", "true", "1", "on", ""]) expect(readGovernorConfig({ JD_EGRESS_GOVERNOR: typo }).mode).toBe("off");
  });

  it("rejects unusable values and falls back to the safe defaults, flagging the problem", () => {
    const c = readGovernorConfig({ JD_EGRESS_WARN_RATIO: "0.9", JD_EGRESS_STOP_RATIO: "0.8", JD_EGRESS_CYCLE_ANCHOR_DAY: "31", JD_EGRESS_MONTHLY_BUDGET_BYTES: "-5" });
    expect(c.valid).toBe(false);
    expect(c.problems).toEqual(expect.arrayContaining(["JD_EGRESS_CYCLE_ANCHOR_DAY_invalid", "JD_EGRESS_MONTHLY_BUDGET_BYTES_invalid", "warn_ratio_must_be_below_stop_ratio"]));
    expect(c.anchorDay).toBe(1);
    expect(c.budgetBytes).toBe(5_000_000_000);
  });
});

describe("threshold enforcement", () => {
  const t = thresholdsFor(readGovernorConfig({}));
  it("ok below warn, warn at/above the warn line, stop at/above the stop line (boundaries inclusive)", () => {
    expect(stateForUsage(0, t)).toBe("ok");
    expect(stateForUsage(t.warnAtBytes - 1, t)).toBe("ok");
    expect(stateForUsage(t.warnAtBytes, t)).toBe("warn");
    expect(stateForUsage(t.stopAtBytes - 1, t)).toBe("warn");
    expect(stateForUsage(t.stopAtBytes, t)).toBe("stop");
    expect(stateForUsage(t.stopAtBytes * 10, t)).toBe("stop");
  });

  it("enforce blocks at stop, allows at warn, allows below", async () => {
    const key = cycleKey(NOW, 21);
    store.set(key, 100);
    expect((await evaluateEgressGovernor({ env: ENFORCE, now: NOW })).allow).toBe(true);
    store.set(key, t.warnAtBytes + 1);
    const warn = await evaluateEgressGovernor({ env: ENFORCE, now: NOW });
    expect(warn).toMatchObject({ state: "warn", allow: true, reason: "egress_budget_warn" });
    store.set(key, t.stopAtBytes);
    const stop = await evaluateEgressGovernor({ env: ENFORCE, now: NOW });
    expect(stop).toMatchObject({ state: "stop", allow: false, reason: "egress_budget_stop", usedBytes: t.stopAtBytes });
  });

  it("observe reports STOP but never blocks", async () => {
    store.set(cycleKey(NOW, 21), t.stopAtBytes + 1);
    const d = await evaluateEgressGovernor({ env: { ...ENFORCE, JD_EGRESS_GOVERNOR: "observe" }, now: NOW });
    expect(d).toMatchObject({ state: "stop", allow: true, mode: "observe" });
  });

  it("the stop line sits below the allowance by at least the site reserve plus the stop margin (never spends the whole budget)", () => {
    expect(t.stopAtBytes + GOVERNOR_DEFAULTS.siteReserveBytes).toBeLessThan(GOVERNOR_DEFAULTS.budgetBytes);
  });
});

describe("fail-closed behaviour (enforce) vs. never-blocking (off / observe)", () => {
  it("enforce: Redis unreadable -> STOP; Redis not configured -> STOP; meter off -> STOP; invalid config -> STOP", async () => {
    redisBroken = true;
    expect(await evaluateEgressGovernor({ env: ENFORCE, now: NOW })).toMatchObject({ state: "unknown", allow: false, reason: "counter_unreadable" });
    redisBroken = false;
    redisConfigured = false;
    expect(await evaluateEgressGovernor({ env: ENFORCE, now: NOW })).toMatchObject({ allow: false, reason: "redis_not_configured" });
    redisConfigured = true;
    expect(await evaluateEgressGovernor({ env: { ...ENFORCE, JD_EGRESS_METER: "false" }, now: NOW })).toMatchObject({ allow: false, reason: "meter_disabled" });
    const bad = await evaluateEgressGovernor({ env: { ...ENFORCE, JD_EGRESS_STOP_RATIO: "banana" }, now: NOW });
    expect(bad.allow).toBe(false);
    expect(bad.reason).toMatch(/^invalid_config:/);
  });

  it("an unreadable counter is NOT treated as zero usage (a missing key IS zero, a failed read is not)", async () => {
    expect((await evaluateEgressGovernor({ env: ENFORCE, now: NOW })).usedBytes).toBe(0); // key absent -> 0
    redisBroken = true;
    expect((await evaluateEgressGovernor({ env: ENFORCE, now: NOW })).usedBytes).toBeNull();
  });

  it("observe never blocks even when it cannot decide", async () => {
    redisBroken = true;
    expect(await evaluateEgressGovernor({ env: { ...ENFORCE, JD_EGRESS_GOVERNOR: "observe" }, now: NOW })).toMatchObject({ allow: true, state: "unknown" });
  });

  it("OFF (the default) has no effect and touches Redis ZERO times", async () => {
    const d = await evaluateEgressGovernor({ env: {}, now: NOW });
    expect(d).toMatchObject({ mode: "off", state: "disabled", allow: true });
    expect(await recordRunEgress({ env: {}, now: NOW })).toMatchObject({ recorded: false, reason: "governor_off" });
    expect(evalCount).toBe(0);
    redisBroken = true;
    expect((await evaluateEgressGovernor({ env: {}, now: NOW })).allow).toBe(true);
  });
});

describe("byte accounting", () => {
  it("run bytes from the meter are added to the cycle counter, atomically, with a TTL", async () => {
    const res = (n: number) => (async () => new Response("x".repeat(n))) as unknown as typeof fetch;
    await meteredFetch(res(1000))("https://p.supabase.co/rest/v1/news_events?select=id");
    await meteredFetch(res(2500))("https://p.supabase.co/rest/v1/rpc/jd_editorial_candidate_events");
    const rec = await recordRunEgress({ env: ENFORCE, now: NOW });
    expect(rec).toEqual({ recorded: true, bytes: 3500, total: 3500 });
    await meteredFetch(res(500))("https://p.supabase.co/rest/v1/worker_jobs");
    expect((await recordRunEgress({ env: ENFORCE, now: NOW, snapshot: { requests: 1, bytes: 500, kb: 0.5, top: [] } })).total).toBe(4000);
    expect(ttls.get(cycleKey(NOW, 21))).toBeGreaterThan(30 * 86_400);
  });

  it("records nothing for an empty run, a disabled meter, or a failed write (reported, not thrown)", async () => {
    expect(await recordRunEgress({ env: ENFORCE, now: NOW })).toMatchObject({ recorded: false, reason: "no_bytes" });
    expect(await recordRunEgress({ env: { ...ENFORCE, JD_EGRESS_METER: "false" }, now: NOW, snapshot: { requests: 1, bytes: 9, kb: 0, top: [] } })).toMatchObject({ reason: "meter_disabled" });
    redisBroken = true;
    expect(await recordRunEgress({ env: ENFORCE, now: NOW, snapshot: { requests: 1, bytes: 9, kb: 0, top: [] } })).toMatchObject({ recorded: false, reason: "write_failed", bytes: 9 });
    expect(await addCycleBytes(0, NOW, 21)).toBeNull();
  });

  it("two overlapping runs both count (no lost update)", async () => {
    await Promise.all([addCycleBytes(1000, NOW, 21), addCycleBytes(2000, NOW, 21)]);
    expect(store.get(cycleKey(NOW, 21))).toBe(3000);
  });
});

describe("monthly counter reset handling", () => {
  it("cycle boundaries follow the configured anchor day (UTC), including year rollover", () => {
    expect(cycleStartUtc(new Date("2026-10-25T00:00:00Z"), 21).toISOString()).toBe("2026-10-21T00:00:00.000Z");
    expect(cycleStartUtc(new Date("2026-10-20T23:59:59Z"), 21).toISOString()).toBe("2026-09-21T00:00:00.000Z");
    expect(cycleStartUtc(new Date("2026-10-21T00:00:00Z"), 21).toISOString()).toBe("2026-10-21T00:00:00.000Z");
    expect(cycleStartUtc(new Date("2027-01-10T00:00:00Z"), 21).toISOString()).toBe("2026-12-21T00:00:00.000Z");
    expect(cycleEndUtc(new Date("2026-12-25T00:00:00Z"), 21).toISOString()).toBe("2027-01-21T00:00:00.000Z");
  });

  it("a new cycle starts from ZERO automatically (new key) while the old cycle's key is left to expire", async () => {
    const lastDay = new Date("2026-10-20T23:59:00Z");
    const firstDay = new Date("2026-10-21T00:01:00Z");
    await addCycleBytes(2_900_000_000, lastDay, 21);
    expect((await evaluateEgressGovernor({ env: ENFORCE, now: lastDay })).state).toBe("stop");
    const after = await evaluateEgressGovernor({ env: ENFORCE, now: firstDay });
    expect(after).toMatchObject({ state: "ok", allow: true, usedBytes: 0 });
    expect(cycleKey(lastDay, 21)).not.toBe(cycleKey(firstDay, 21));
    expect(store.get(cycleKey(lastDay, 21))).toBe(2_900_000_000); // history kept
  });

  it("never invents the billing date: the anchor is flagged as a placeholder until configured", async () => {
    const d = await evaluateEgressGovernor({ env: { JD_EGRESS_GOVERNOR: "observe", JD_EGRESS_METER: "true" }, now: NOW });
    expect(d.anchorDayIsPlaceholder).toBe(true);
    const snap = await getEgressGovernorSnapshot({ env: { JD_EGRESS_GOVERNOR: "observe", JD_EGRESS_METER: "true" }, now: NOW });
    expect(snap.notes.join(" ")).toMatch(/PLACEHOLDER/);
    expect((await evaluateEgressGovernor({ env: ENFORCE, now: NOW })).anchorDayIsPlaceholder).toBe(false);
  });
});

describe("admin diagnostics snapshot", () => {
  it("exposes mode, thresholds, usage, state, cycle and the counter key -- and no secrets", async () => {
    store.set(cycleKey(NOW, 21), 123_456);
    const snap = await getEgressGovernorSnapshot({ env: ENFORCE, now: NOW });
    expect(snap.config).toMatchObject({ mode: "enforce", anchorDay: 21, valid: true });
    expect(snap.decision).toMatchObject({ state: "ok", usedBytes: 123_456, cycleStart: "2026-10-21T00:00:00.000Z" });
    expect(snap.decision.thresholds.stopAtBytes).toBe(2_800_000_000);
    expect(snap.counterKey).toBe("jd:egress:cycle:2026-10-21");
    expect(JSON.stringify(snap)).not.toMatch(/token|secret|bearer/i);
  });
});
