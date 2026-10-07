import { describe, expect, it } from "vitest";
import sample from "@/lib/admin-ops/__fixtures__/snapshot.sample.json";
import {
  ageMinutes,
  categorizeFailure,
  evaluateDistrictCoverage,
  evaluateJobs,
  evaluatePace,
  evaluateSources,
  evaluateSubsystems,
  formatAge,
  freshnessTone,
  geoShares,
} from "@/lib/admin-ops/health";
import { HEALTH_JOBS } from "@/lib/infrastructure/cron/scheduler-manifest";
import { RSS_SOURCES } from "@/lib/news/providers/rss-sources";
import type { OpsSnapshotRaw } from "@/lib/admin-ops/types";

// Real production snapshot captured 2026-09-29 ~21:15 UTC (rolled-back dry run of migration 086).
const snap = sample as unknown as OpsSnapshotRaw;
const NOW = new Date(snap.generated_at).getTime();
const known = new Set(RSS_SOURCES.map((s) => s.id));

describe("freshness & pace", () => {
  it("colours freshness lag", () => {
    expect(freshnessTone(20)).toBe("healthy");
    expect(freshnessTone(120)).toBe("warning");
    expect(freshnessTone(400)).toBe("critical");
    expect(freshnessTone(null)).toBe("critical");
  });

  it("reports 'Publishing pipeline stalled' when nothing has published for 3h+ (the real state)", () => {
    const lagMin = ageMinutes(snap.publishing.latest?.published_at, NOW);
    const pace = evaluatePace({
      today: snap.publishing.today,
      target: 100,
      istHour: snap.publishing.ist_hour_now,
      istMinute: snap.publishing.ist_minute_now,
      lastPublishAgeMinutes: lagMin,
    });
    expect(lagMin).toBeGreaterThan(180);
    expect(pace.message).toBe("Publishing pipeline stalled");
    expect(pace.tone).toBe("critical");
  });

  it("reports 'Below production pace' when publishing but behind the linear pace", () => {
    const p = evaluatePace({ today: 20, target: 100, istHour: 18, istMinute: 0, lastPublishAgeMinutes: 20 });
    expect(p.expectedByNow).toBe(75);
    expect(p.message).toBe("Below production pace");
  });

  it("reports 'On pace' when at or above pace", () => {
    expect(evaluatePace({ today: 60, target: 100, istHour: 12, istMinute: 0, lastPublishAgeMinutes: 10 }).message).toBe("On pace");
    expect(evaluatePace({ today: 0, target: 100, istHour: 0, istMinute: 30, lastPublishAgeMinutes: 30 }).message).toBe("On pace");
  });

  it("formats ages", () => {
    expect(formatAge(0)).toBe("just now");
    expect(formatAge(45)).toBe("45m ago");
    expect(formatAge(125)).toBe("2h 5m ago");
    expect(formatAge(60 * 72)).toBe("3d ago");
    expect(formatAge(null)).toBe("never");
  });
});

describe("cron / scheduler jobs", () => {
  const jobs = evaluateJobs(snap, NOW);
  const by = Object.fromEntries(jobs.map((j) => [j.id, j]));

  it("covers every manifest job", () => {
    expect(jobs.map((j) => j.id).sort()).toEqual(HEALTH_JOBS.map((j) => j.id).sort());
  });

  it("flags critical lanes that have not run recently as critical (real 3–7h burst gaps)", () => {
    // fetch-news expected every 10 min; the last recorded run is > 30 min before the snapshot
    expect(by["fetch-news"]!.lastRunAgeMinutes).toBeGreaterThan(30);
    expect(by["fetch-news"]!.tone).toBe("critical");
    expect(by["editorial-generate"]!.tone).toBe("critical");
  });

  it("does not turn non-critical jobs red on their own", () => {
    expect(by["district-coverage"]!.tone).toBe("warning"); // never ran, non-critical => warning
  });

  it("flags orchestrate: 8 of 12 runs recorded ok=false", () => {
    expect(by["orchestrate"]!.failures24h).toBe(8);
  });
});

describe("sources", () => {
  const rows = evaluateSources(snap, known, NOW);
  const byKey = Object.fromEntries(rows.map((r) => [r.key, r]));

  it("does not report a feed with no success for 9 days as healthy", () => {
    expect(byKey["rss:gnews-bastar"]!.status).not.toBe("healthy");
    expect(byKey["rss:gnews-cg-patrika"]!.status).not.toBe("healthy");
  });

  it("marks retired feeds retired and quota-exhausted GNews as rate limited", () => {
    expect(byKey["rss:dd-news"]!.status).toBe("retired");
    expect(byKey["gnews:api"]!.status).toBe("rate_limited");
  });

  it("flags state rows for feeds no longer in the registry as orphaned", () => {
    const orphans = rows.filter((r) => r.status === "orphaned");
    expect(orphans.map((o) => o.key)).toContain("rss:webdunia-cg");
  });

  it("sorts problems first", () => {
    expect(rows[0]!.tone).not.toBe("healthy");
  });
});

describe("geo coverage", () => {
  it("lists all 33 districts, highlighting those with no verified coverage", () => {
    const d = evaluateDistrictCoverage(snap, NOW);
    expect(d).toHaveLength(33);
    expect(d.filter((x) => x.status === "none").length).toBe(33); // no evidence-based (scope) district rows exist yet
    expect(d[0]!.status).toBe("none");
  });

  it("collapses scope counts into shares (legacy rows are reported separately, not as evidence)", () => {
    const s = geoShares({ DISTRICT_SPECIFIC: 3, STATEWIDE_CHHATTISGARH: 2, NATIONAL: 4, UNKNOWN: 1, LEGACY_DISTRICT: 2 });
    expect(s.total).toBe(12);
    expect(s.chhattisgarh).toBe(7);
    expect(s.districtTagged).toBe(5);
    expect(s.national).toBe(4);
    expect(s.unknown).toBe(1);
    expect(s.legacyUnclassified).toBe(2);
  });
});

describe("subsystems", () => {
  const jobs = evaluateJobs(snap, NOW);
  const sources = evaluateSources(snap, known, NOW);
  const subs = evaluateSubsystems(snap, jobs, sources, { redisConfigured: true, vercelEnv: "production", vercelRegion: "hnd1", commitSha: "abcdef0123", snapshotLatencyMs: 400 }, NOW);
  const by = Object.fromEntries(subs.map((s) => [s.id, s]));

  it("returns the 12 subsystems requested", () => {
    expect(subs.map((s) => s.id)).toEqual([
      "database", "fetch-news", "newsdata", "rss", "gnews", "editorial-ai",
      "translation-backfill", "images", "caching", "cron", "vercel", "supabase",
    ]);
  });

  it("gives every subsystem a tone and a human-readable reason", () => {
    for (const s of subs) {
      expect(["healthy", "warning", "critical"]).toContain(s.tone);
      expect(s.reason.length).toBeGreaterThan(3);
    }
  });

  it("reflects real conditions: ingestion critical, GNews degraded, AI degraded", () => {
    expect(by["fetch-news"]!.tone).toBe("critical");
    expect(by["gnews"]!.tone).toBe("warning");
    expect(by["gnews"]!.reason).toMatch(/rate limited|quota/i);
    expect(["warning", "critical"]).toContain(by["editorial-ai"]!.tone);
  });
});

describe("failure categorisation", () => {
  it.each([
    ["llm_generation_failed", "provider_error"],
    ["DEFERRED_QUOTA", "provider_quota"],
    ["ai_quota_exhausted", "provider_quota"],
    ["ai_timeout", "provider_timeout"],
    ["stale_candidate:source_evidence_older_than_36h", "stale_source"],
    ["unproven_cg_geography", "missing_geography"],
    ["quality_checks_failed", "quality_rejection"],
    ["slug_already_exists", "duplicate"],
    ["script_mismatch:devanagari_in_en_headline", "quality_rejection"],
    ["translate_article failed", "translation_failure"],
    ["something odd", "other"],
  ])("%s -> %s", (reason, cat) => {
    expect(categorizeFailure(reason)).toBe(cat);
  });
});

describe("sources while the scheduler is paused", () => {
  it("shows a stale-but-not-faulty source as paused (healthy tone) only when the scheduler is off", () => {
    const paused = evaluateSources(snap, known, NOW, { schedulerPaused: true });
    const running = evaluateSources(snap, known, NOW, { schedulerPaused: false });
    const pausedStatuses = new Set(paused.map((r) => r.status));
    const runningStatuses = new Set(running.map((r) => r.status));
    // the fixture contains a feed with no success for 9 days: degraded when running, paused when the scheduler is off
    expect(runningStatuses.has("degraded")).toBe(true);
    expect(pausedStatuses.has("paused")).toBe(true);
    expect(paused.filter((r) => r.status === "paused").every((r) => r.tone === "healthy")).toBe(true);
    // genuine faults are identical either way
    const faults = (rows: typeof paused) => rows.filter((r) => ["failing", "retired", "orphaned", "disabled", "rate_limited"].includes(r.status)).map((r) => `${r.key}:${r.status}`).sort();
    expect(faults(paused)).toEqual(faults(running));
  });
});
