import { describe, expect, it } from "vitest";
import {
  deriveSourceHealth,
  nextPollDelayMs,
  shouldPollSource,
} from "@/lib/news/ingestion/source-health";

const NOW = Date.parse("2026-09-30T12:00:00Z");
const ago = (h: number) => new Date(NOW - h * 3_600_000).toISOString();

const base = {
  enabled: true,
  health_state: "healthy" as const,
  last_attempted_at: ago(0.2),
  last_successful_at: ago(0.2),
  last_new_item_at: ago(1),
  last_item_timestamp: ago(1),
  consecutive_failures: 0,
  consecutive_empty_runs: 0,
  disabled_until: null,
  quota_exhausted_until: null,
  rate_limited_until: null,
  retirement_reason: null,
};

describe("deriveSourceHealth", () => {
  it("healthy when producing new items", () => {
    expect(deriveSourceHealth(base, { now: NOW }).status).toBe("healthy");
  });

  it("does NOT trust a stored 'healthy' label for a feed with no success in 9 days (production case)", () => {
    const r = deriveSourceHealth({ ...base, last_successful_at: ago(9 * 24), last_attempted_at: ago(9 * 24) }, { now: NOW });
    expect(r.status).toBe("degraded");
    expect(r.reason).toMatch(/no successful fetch/);
  });

  it("flags a feed that responds but has produced nothing new for weeks as dormant", () => {
    const r = deriveSourceHealth({ ...base, last_new_item_at: ago(30 * 24), consecutive_empty_runs: 66 }, { now: NOW });
    expect(r.status).toBe("dormant");
  });

  it("degraded after 72h without new items or 30 empty runs", () => {
    expect(deriveSourceHealth({ ...base, last_new_item_at: ago(80) }, { now: NOW }).status).toBe("degraded");
    expect(deriveSourceHealth({ ...base, consecutive_empty_runs: 31 }, { now: NOW }).status).toBe("degraded");
  });

  it("a feed that succeeded recently but has a null last_attempted_at is NOT 'never run' (RSS path)", () => {
    const r = deriveSourceHealth({ ...base, last_attempted_at: null }, { now: NOW });
    expect(r.status).toBe("healthy");
    expect(deriveSourceHealth({ ...base, last_attempted_at: null, last_successful_at: null }, { now: NOW }).status).toBe("never_run");
  });

  it("maps quota / rate-limit / failures / retired / disabled / orphaned", () => {
    expect(deriveSourceHealth({ ...base, quota_exhausted_until: new Date(NOW + 3_600_000).toISOString() }, { now: NOW }).status).toBe("rate_limited");
    expect(deriveSourceHealth({ ...base, rate_limited_until: new Date(NOW + 60_000).toISOString() }, { now: NOW }).status).toBe("rate_limited");
    expect(deriveSourceHealth({ ...base, consecutive_failures: 4 }, { now: NOW }).status).toBe("failing");
    expect(deriveSourceHealth({ ...base, health_state: "permanently_retired", enabled: false, retirement_reason: "HTTP 404" }, { now: NOW })).toMatchObject({ status: "retired", reason: "HTTP 404" });
    expect(deriveSourceHealth({ ...base, enabled: false }, { now: NOW }).status).toBe("disabled");
    expect(deriveSourceHealth(base, { now: NOW, known: false }).status).toBe("orphaned");
    expect(deriveSourceHealth(null, { now: NOW }).status).toBe("never_run");
  });

  it("ignores an expired disable/rate-limit window", () => {
    expect(deriveSourceHealth({ ...base, rate_limited_until: new Date(NOW - 60_000).toISOString() }, { now: NOW }).status).toBe("healthy");
  });
});

describe("adaptive polling", () => {
  it("polls a producing feed every run", () => {
    expect(nextPollDelayMs(base, { now: NOW })).toBe(0);
    expect(shouldPollSource({ ...base, last_attempted_at: ago(0.01), last_successful_at: ago(0.01) }, { now: NOW })).toBe(true);
  });

  it("backs off progressively with consecutive empty runs", () => {
    const d = (empty: number) => nextPollDelayMs({ ...base, consecutive_empty_runs: empty }, { now: NOW });
    expect(d(2)).toBe(0);
    expect(d(3)).toBe(20 * 60_000);
    expect(d(6)).toBe(3_600_000);
    expect(d(12)).toBe(3 * 3_600_000);
    expect(d(30)).toBe(6 * 3_600_000);
  });

  it("skips a backed-off feed until its delay has elapsed, then polls again", () => {
    const polled = (h: number) => ({ last_attempted_at: ago(h), last_successful_at: ago(h) });
    const row = { ...base, consecutive_empty_runs: 12, ...polled(1) };
    expect(shouldPollSource(row, { now: NOW })).toBe(false);
    expect(shouldPollSource({ ...row, ...polled(3.1) }, { now: NOW })).toBe(true);
  });

  it("dormant feeds are polled at most every 12h", () => {
    const row = { ...base, last_new_item_at: ago(20 * 24), consecutive_empty_runs: 3 };
    expect(nextPollDelayMs(row, { now: NOW })).toBe(12 * 3_600_000);
  });

  it("never backs high-value (direct CG publisher) feeds off beyond 30 minutes", () => {
    const row = { ...base, consecutive_empty_runs: 60, last_new_item_at: ago(20 * 24) };
    expect(nextPollDelayMs(row, { now: NOW, highValue: true })).toBe(30 * 60_000);
  });

  it("backs off failing feeds exponentially (capped at 6h)", () => {
    const f = (n: number) => nextPollDelayMs({ ...base, consecutive_failures: n }, { now: NOW });
    expect(f(3)).toBe(15 * 60_000);
    expect(f(4)).toBe(30 * 60_000);
    expect(f(20)).toBe(6 * 3_600_000);
  });

  it("polls a source that has no state row yet", () => {
    expect(shouldPollSource(null, { now: NOW })).toBe(true);
  });
});
