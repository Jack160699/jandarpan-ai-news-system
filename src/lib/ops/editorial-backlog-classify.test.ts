import { describe, expect, it } from "vitest";
import {
  buildDefaultContext,
  classifyBacklogJob,
  classifyDeadLetterEntry,
  selectRecoveryBatch,
  shouldStopOnErrors,
} from "@/lib/ops/editorial-backlog-classify";
import type { BacklogJobSnapshot } from "@/lib/ops/editorial-backlog-types";
import { RECOVERY_RATE_LIMITS } from "@/lib/ops/editorial-backlog-types";

function job(overrides: Partial<BacklogJobSnapshot> = {}): BacklogJobSnapshot {
  const now = Date.now();
  return {
    id: overrides.id ?? "job-1",
    jobType: overrides.jobType ?? "editorial_generate",
    status: overrides.status ?? "pending",
    tenantId: "tenant-1" in overrides ? overrides.tenantId! : "tenant-1",
    dedupeKey: overrides.dedupeKey ?? "editorial_generate:tenant-1:evt",
    payload: overrides.payload ?? { signalsInserted: 3, sourceEventId: "bus-1" },
    attempts: overrides.attempts ?? 1,
    maxAttempts: overrides.maxAttempts ?? 5,
    lastError: overrides.lastError ?? null,
    claimedAt: overrides.claimedAt ?? null,
    scheduledAt: overrides.scheduledAt ?? new Date(now).toISOString(),
    createdAt: overrides.createdAt ?? new Date(now - 60_000).toISOString(),
    result: overrides.result ?? null,
  };
}

describe("classifyBacklogJob", () => {
  it("classifies eligible immediate retry when fresh uncovered events exist", () => {
    const c = classifyBacklogJob(
      job({ lastError: "job_timeout" }),
      buildDefaultContext({
        uncoveredEventCount: 12,
        freshUncoveredEventCount: 5,
        staleUncoveredEventCount: 7,
      })
    );
    expect(c.class).toBe("eligible_immediate_retry");
    expect(c.action).toBe("retry");
    expect(c.safeToAutoPublish).toBe(true);
  });

  it("marks already completed when no uncovered events remain", () => {
    const c = classifyBacklogJob(
      job(),
      buildDefaultContext({ uncoveredEventCount: 0 })
    );
    expect(c.class).toBe("already_completed");
    expect(c.action).toBe("quarantine");
  });

  it("detects duplicate active siblings", () => {
    const c = classifyBacklogJob(
      job(),
      buildDefaultContext({
        hasActiveDuplicate: true,
        uncoveredEventCount: 4,
        freshUncoveredEventCount: 4,
      })
    );
    expect(c.class).toBe("duplicate");
  });

  it("detects stale claims by lease age", () => {
    const now = Date.now();
    const c = classifyBacklogJob(
      job({
        status: "claimed",
        claimedAt: new Date(now - RECOVERY_RATE_LIMITS.staleClaimMs - 1_000).toISOString(),
      }),
      buildDefaultContext({
        nowMs: now,
        uncoveredEventCount: 3,
        freshUncoveredEventCount: 3,
      })
    );
    expect(c.class).toBe("stale_claim");
    expect(c.action).toBe("release_stale_claim");
  });

  it("flags malformed payloads", () => {
    const c = classifyBacklogJob(
      job({ payload: [] as unknown as Record<string, unknown> }),
      buildDefaultContext()
    );
    expect(c.class).toBe("malformed");
  });

  it("flags missing tenant when tenant row is absent", () => {
    const c = classifyBacklogJob(
      job(),
      buildDefaultContext({ tenantExists: false })
    );
    expect(c.class).toBe("missing_tenant");
    expect(c.action).toBe("mark_manual_review");
  });

  it("routes obsolete stale stories to manual review (no auto-publish)", () => {
    const c = classifyBacklogJob(
      job(),
      buildDefaultContext({
        uncoveredEventCount: 8,
        freshUncoveredEventCount: 0,
        staleUncoveredEventCount: 8,
      })
    );
    expect(c.class).toBe("manual_review_required");
    expect(c.safeToAutoPublish).toBe(false);
  });

  it("classifies payload event already generated", () => {
    const c = classifyBacklogJob(
      job({ payload: { eventId: "evt-1" } }),
      buildDefaultContext({
        payloadEventExists: true,
        payloadEventAlreadyGenerated: true,
        uncoveredEventCount: 2,
        freshUncoveredEventCount: 2,
      })
    );
    expect(c.class).toBe("already_completed");
  });

  it("classifies missing source news_event", () => {
    const c = classifyBacklogJob(
      job({ payload: { eventId: "missing" } }),
      buildDefaultContext({
        payloadEventExists: false,
        payloadEventAlreadyGenerated: false,
      })
    );
    expect(c.class).toBe("missing_source_record");
  });

  it("marks dead jobs as dead-letter candidates", () => {
    const c = classifyBacklogJob(
      job({ status: "dead", lastError: "job_timeout" }),
      buildDefaultContext({
        uncoveredEventCount: 2,
        freshUncoveredEventCount: 2,
      })
    );
    expect(c.class).toBe("dead_letter_candidate");
  });

  it("treats already quarantined jobs as obsolete", () => {
    const c = classifyBacklogJob(
      job({ result: { quarantined: true } }),
      buildDefaultContext({
        alreadyQuarantined: true,
        uncoveredEventCount: 5,
        freshUncoveredEventCount: 5,
      })
    );
    expect(c.class).toBe("obsolete");
  });
});

describe("classifyDeadLetterEntry", () => {
  it("marks editorial job_timeout as fixed_by_new_architecture", () => {
    const c = classifyDeadLetterEntry({
      id: "dlq-1",
      jobType: "editorial_generate",
      lastError: "job_timeout",
      hasActiveDuplicate: false,
    });
    expect(c.resolution).toBe("fixed_by_new_architecture");
  });

  it("marks intelligence_snapshot timeouts retryable", () => {
    const c = classifyDeadLetterEntry({
      id: "dlq-2",
      jobType: "intelligence_snapshot",
      lastError: "job_timeout",
      hasActiveDuplicate: false,
    });
    expect(c.resolution).toBe("retryable");
  });

  it("marks urgencyScore DLQ as fixed by Phase 4 translation repair", () => {
    const c = classifyDeadLetterEntry({
      id: "dlq-3",
      jobType: "translate_article",
      lastError: "urgencyScore is not defined",
      hasActiveDuplicate: false,
    });
    expect(c.resolution).toBe("fixed_by_new_architecture");
  });
});

describe("selectRecoveryBatch + stop-on-error + audit shape", () => {
  it("respects batch limit", () => {
    const classifications = Array.from({ length: 10 }, (_, i) =>
      classifyBacklogJob(
        job({ id: `j-${i}` }),
        buildDefaultContext({
          uncoveredEventCount: 5,
          freshUncoveredEventCount: 5,
        })
      )
    );
    const batch = selectRecoveryBatch(classifications, { batchSize: 3 });
    expect(batch).toHaveLength(3);
    expect(batch.every((b) => b.class === "eligible_immediate_retry")).toBe(
      true
    );
  });

  it("stops when consecutive errors hit threshold", () => {
    expect(shouldStopOnErrors(1, 2)).toBe(false);
    expect(shouldStopOnErrors(2, 2)).toBe(true);
  });

  it("dry-run audit entries are idempotent in shape", () => {
    const c = classifyBacklogJob(
      job(),
      buildDefaultContext({
        uncoveredEventCount: 2,
        freshUncoveredEventCount: 2,
      })
    );
    const entry = {
      at: new Date().toISOString(),
      dryRun: true,
      command: "retry" as const,
      jobId: c.jobId,
      jobType: c.jobType,
      class: c.class,
      action: c.action,
      ok: true,
      detail: c.reasons.join(","),
    };
    expect(entry.dryRun).toBe(true);
    expect(entry.action).toBe("retry");
    // Re-classifying the same inputs yields the same class (idempotent decision)
    const again = classifyBacklogJob(
      job(),
      buildDefaultContext({
        uncoveredEventCount: 2,
        freshUncoveredEventCount: 2,
      })
    );
    expect(again.class).toBe(c.class);
  });

  it("does not select unsafe stale-only stories for retry", () => {
    const unsafe = classifyBacklogJob(
      job({ id: "stale-only" }),
      buildDefaultContext({
        uncoveredEventCount: 4,
        freshUncoveredEventCount: 0,
        staleUncoveredEventCount: 4,
      })
    );
    const batch = selectRecoveryBatch([unsafe], {
      classes: ["eligible_immediate_retry"],
      onlySafeAutoPublish: true,
    });
    expect(batch).toHaveLength(0);
  });
});
