import { describe, expect, it } from "vitest";
import sample from "@/lib/admin-ops/__fixtures__/snapshot.sample.json";
import { FAILURE_CLASSES, categorizeFailureItem, failureClassOf } from "@/lib/admin-ops/health";
import { buildOpsView, UNKNOWN_OUTCOME_COUNTS, type OutcomeCounts } from "@/lib/admin-ops/snapshot";
import type { OpsSnapshotRaw } from "@/lib/admin-ops/types";

const NOW = new Date("2026-10-01T19:00:00Z").getTime();
const base = sample as unknown as OpsSnapshotRaw;

/** The sample snapshot with every classic failure source emptied, so only what a test adds is counted. */
function quiet(): OpsSnapshotRaw {
  const raw = JSON.parse(JSON.stringify(base)) as OpsSnapshotRaw;
  raw.failures = { ...raw.failures, editorial_skip_reasons_24h: [], ai_queue_reasons: [], dead_jobs: [], ai_failures_24h: [], cron_failures_24h: [] } as OpsSnapshotRaw["failures"];
  raw.language = { ...raw.language, gate_failure_codes_24h: {} } as OpsSnapshotRaw["language"];
  raw.sources = { ...raw.sources, provider_errors_24h: [] } as OpsSnapshotRaw["sources"];
  return raw;
}

const classTotals = (view: ReturnType<typeof buildOpsView>) => Object.fromEntries(view.failureClasses.map((c) => [c.klass, c.total]));
const outcomes = (rows: Array<[string, string, number]>, dead = 0): OutcomeCounts => ({
  known: true,
  byOutcome: rows.map(([job, outcome, n]) => ({ job, outcome, n })),
  deadLetteredCandidates24h: dead,
});

describe("item categorization uses status/source before reason text", () => {
  it.each([
    [{ reason: "rejected_stale" }, "stale_source", "stale_freshness"],
    [{ reason: "rejected_freshness" }, "stale_source", "stale_freshness"],
    [{ reason: "stale_candidate:live_event_without_recent_source_evidence" }, "stale_source", "stale_freshness"],
    [{ reason: "no_work" }, "no_work", "no_work"],
    [{ reason: "quarantined" }, "quarantine", "quarantine"],
    [{ reason: "whatever", status: "quarantined" }, "quarantine", "quarantine"],
    [{ reason: "last error was a timeout", status: "dead" }, "dead_letter", "dead_letter"],
    [{ reason: "rejected_quality" }, "quality_rejection", "quality_rejection"],
    [{ reason: "rejected_duplicate" }, "duplicate", "quality_rejection"],
    [{ reason: "ai_upstream_error" }, "provider_error", "infrastructure"],
    [{ reason: "429 rate limit" }, "provider_quota", "infrastructure"],
  ])("%j -> %s -> %s", (input, category, klass) => {
    const c = categorizeFailureItem(input as never);
    expect(c).toBe(category);
    expect(failureClassOf(c)).toBe(klass);
  });
});

describe("failure center: six distinct classes", () => {
  it("always reports all six classes, in a fixed order, even when everything is zero", () => {
    const view = buildOpsView(quiet(), { snapshotLatencyMs: 1, now: NOW, outcomes: outcomes([]) });
    expect(view.failureClasses.map((c) => c.klass)).toEqual([...FAILURE_CLASSES]);
    expect(Object.values(classTotals(view)).every((n) => n === 0)).toBe(true);
  });

  it("stale / freshness rejections, empty shards, quarantines and dead-letters are NOT infrastructure failures", () => {
    const view = buildOpsView(quiet(), {
      snapshotLatencyMs: 1,
      now: NOW,
      outcomes: outcomes(
        [
          ["editorial-generate", "rejected_stale", 4],
          ["editorial-generate", "rejected_freshness", 7],
          ["editorial-generate", "rejected_quality", 3],
          ["fetch-news", "no_work", 12],
          ["editorial-generate", "quarantined", 2],
        ],
        5,
      ),
    });
    expect(classTotals(view)).toEqual({ infrastructure: 0, quality_rejection: 3, stale_freshness: 11, no_work: 12, quarantine: 2, dead_letter: 5 });
  });

  it("genuine provider/runtime failures still land in infrastructure", () => {
    const raw = quiet();
    raw.failures.cron_failures_24h = [{ job: "fetch-news", last_error: "ai_upstream_error", n: 3 }] as never;
    raw.failures.ai_failures_24h = [{ provider: "codecraft", model: "m", reason: "ai_timeout", n: 2 }] as never;
    const view = buildOpsView(raw, { snapshotLatencyMs: 1, now: NOW, outcomes: outcomes([["editorial-generate", "rejected_stale", 9]]) });
    expect(classTotals(view)).toMatchObject({ infrastructure: 5, stale_freshness: 9 });
  });

  it("dead worker jobs are dead-letter regardless of their last error text", () => {
    const raw = quiet();
    raw.failures.dead_jobs = [{ job_type: "translate_article", reason: "ai_timeout: provider timed out", n: 6 }] as never;
    const view = buildOpsView(raw, { snapshotLatencyMs: 1, now: NOW, outcomes: outcomes([]) });
    expect(classTotals(view)).toMatchObject({ dead_letter: 6, infrastructure: 0 });
  });

  it("published/ok/failure outcomes are not double counted as problems", () => {
    const view = buildOpsView(quiet(), {
      snapshotLatencyMs: 1,
      now: NOW,
      outcomes: outcomes([["editorial-generate", "published", 40], ["fetch-news", "ok", 100], ["fetch-news", "degraded", 3], ["editorial-generate", "failure", 2]]),
    });
    expect(Object.values(classTotals(view)).every((n) => n === 0)).toBe(true);
  });

  it("an unreadable outcome source degrades gracefully (classic sources still shown, nothing invented)", () => {
    const view = buildOpsView(quiet(), { snapshotLatencyMs: 1, now: NOW, outcomes: UNKNOWN_OUTCOME_COUNTS });
    expect(view.failureClasses).toHaveLength(6);
    expect(Object.values(classTotals(view)).every((n) => n === 0)).toBe(true);
  });
});
