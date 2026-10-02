import { describe, expect, it } from "vitest";
import {
  coverageTierOf,
  maxPollDelayMs,
  RSS_SOURCES,
  sourceEffectivePriority,
} from "./rss-sources";
import { selectRssShard } from "./rss-batch";
import { isNewsDataDue, NEWSDATA_MIN_INTERVAL_MS, NEWSDATA_QUERIES } from "./newsdata";
import { nextPollDelayMs, shouldPollSource } from "@/lib/news/ingestion/source-health";

const HOUR = 3_600_000;
const MIN = 60_000;
const byId = (id: string) => RSS_SOURCES.find((s) => s.id === id)!;

describe("source registry", () => {
  it("has unique ids and valid absolute https URLs", () => {
    const ids = RSS_SOURCES.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const s of RSS_SOURCES) expect(s.url).toMatch(/^https:\/\//);
  });

  it("registers the verified direct Chhattisgarh publishers (and only live feed URLs)", () => {
    for (const id of ["ibc24-cg-direct", "bhilai-times-direct", "thihacg-direct", "dailychhattisgarh-direct", "lalluram-direct", "cg24news-direct", "cgvaibhav-direct"]) {
      const s = byId(id);
      expect(s, id).toBeTruthy();
      expect(s.tier).toBe("publisher");
      expect(s.region).toBe("cg");
      expect(s.language).toBe("hi");
    }
    expect(byId("lalluram-direct").fullText).toBe("page");
    expect(byId("thihacg-direct").fullText).toBe("feed");
  });

  it("classifies coverage tiers: district queries are primary, other CG is statewide, national/international stay out", () => {
    expect(coverageTierOf(byId("bhilai-times-direct"))).toBe("primary_district");
    for (const id of ["gnews-cg-raipur", "gnews-cg-durg-bhilai", "gnews-cg-bilaspur", "gnews-cg-rajnandgaon"]) {
      expect(coverageTierOf(byId(id)), id).toBe("primary_district");
    }
    expect(coverageTierOf(byId("thihacg-direct"))).toBe("statewide");
    expect(coverageTierOf(byId("gnews-cg-bastar"))).toBe("statewide");
    expect(coverageTierOf(byId("gnews-india-hi"))).toBe("national");
    expect(coverageTierOf(byId("bbc-world"))).toBe("international");
  });

  it("polls primary-district and statewide Chhattisgarh sources ahead of every national feed", () => {
    const national = Math.max(...RSS_SOURCES.filter((s) => coverageTierOf(s) === "national" || coverageTierOf(s) === "international").map(sourceEffectivePriority));
    const local = RSS_SOURCES.filter((s) => s.region === "cg" && s.tier === "publisher").map(sourceEffectivePriority);
    expect(Math.min(...local)).toBeGreaterThan(national);
    expect(sourceEffectivePriority(byId("bhilai-times-direct"))).toBeGreaterThan(sourceEffectivePriority(byId("thihacg-direct")));
  });

  it("every primary-district source is polled-ranked in the first shard slots, so they land on distinct shards", () => {
    const sorted = [...RSS_SOURCES].sort((a, b) => sourceEffectivePriority(b) - sourceEffectivePriority(a) || a.id.localeCompare(b.id));
    const top = sorted.slice(0, 10).map((s) => s.id);
    const shardOf = (id: string) => [...Array(10).keys()].find((i) => selectRssShard(sorted, { index: i, count: 10 }).some((s) => s.id === id));
    expect(new Set(top.map(shardOf)).size).toBe(10);
  });
});

describe("bounded polling for verified local sources", () => {
  const stale = (over: Record<string, unknown> = {}) =>
    ({
      enabled: true, health_state: "healthy", last_attempted_at: null, last_successful_at: new Date(Date.now() - 31 * MIN).toISOString(),
      last_new_item_at: new Date(Date.now() - 10 * 24 * HOUR).toISOString(), last_item_timestamp: null,
      consecutive_failures: 0, consecutive_empty_runs: 200, disabled_until: null, quota_exhausted_until: null,
      rate_limited_until: null, retirement_reason: null, ...over,
    }) as never;

  it("direct publishers: a long run of empty polls can never push the interval past 30 minutes", () => {
    const cap = maxPollDelayMs(byId("thihacg-direct"));
    expect(cap).toBe(30 * MIN);
    expect(nextPollDelayMs(stale(), {})).toBe(12 * HOUR); // the uncapped behaviour (what starved them)
    expect(nextPollDelayMs(stale(), { maxDelayMs: cap })).toBe(30 * MIN);
    expect(shouldPollSource(stale(), { maxDelayMs: cap })).toBe(true);
  });

  it("failing local sources are retried within the cap too, and primary-district aggregator queries within an hour", () => {
    expect(nextPollDelayMs(stale({ consecutive_failures: 9 }), { maxDelayMs: 30 * MIN })).toBe(30 * MIN);
    expect(maxPollDelayMs(byId("gnews-cg-raipur"))).toBe(60 * MIN);
  });

  it("national feeds keep the adaptive backoff (no cap)", () => {
    expect(maxPollDelayMs(byId("gnews-india-hi"))).toBeNull();
    expect(nextPollDelayMs(stale(), { maxDelayMs: maxPollDelayMs(byId("gnews-india-hi")) })).toBe(12 * HOUR);
  });

  it("a source polled 10 minutes ago is not due again (the cap bounds the maximum, not the minimum)", () => {
    expect(shouldPollSource(stale({ consecutive_empty_runs: 0, last_new_item_at: new Date().toISOString(), last_successful_at: new Date(Date.now() - 10 * MIN).toISOString() }), {})).toBe(true);
    expect(shouldPollSource(stale({ last_successful_at: new Date(Date.now() - 5 * MIN).toISOString() }), { maxDelayMs: 30 * MIN })).toBe(false);
  });
});

describe("NewsData query targeting and credit budget", () => {
  it("targets the four primary districts (Hindi + English) and statewide, with one major-national query and no world query", () => {
    const qs = NEWSDATA_QUERIES.map((q) => q.q ?? "").join(" | ");
    for (const t of ["रायपुर", "दुर्ग", "भिलाई", "बिलासपुर", "राजनांदगांव", "Raipur", "Durg", "Bhilai", "Bilaspur", "Rajnandgaon", "छत्तीसगढ़"]) expect(qs).toContain(t);
    expect(NEWSDATA_QUERIES.filter((q) => !q.q)).toHaveLength(1);
    expect(NEWSDATA_QUERIES.some((q) => q.category === "world")).toBe(false);
    for (const q of NEWSDATA_QUERIES) expect((q.q ?? "").length).toBeLessThanOrEqual(100);
  });

  it("stays inside the 200-credit/day free plan at one run per interval", () => {
    const runsPerDay = (24 * 60 * MIN) / NEWSDATA_MIN_INTERVAL_MS;
    expect(runsPerDay * NEWSDATA_QUERIES.length).toBeLessThanOrEqual(200);
  });

  it("is due only after the minimum interval", () => {
    const now = Date.now();
    expect(isNewsDataDue(null, now)).toBe(true);
    expect(isNewsDataDue(new Date(now - 10 * MIN).toISOString(), now)).toBe(false);
    expect(isNewsDataDue(new Date(now - NEWSDATA_MIN_INTERVAL_MS - 1).toISOString(), now)).toBe(true);
  });
});
