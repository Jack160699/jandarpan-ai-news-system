import { describe, expect, it } from "vitest";
import {
  classifyIngestionOutcome,
  describeIngestionOutcome,
  type IngestionOutcomeInput,
} from "./ingestion-outcome";

function baseInput(
  overrides: Partial<IngestionOutcomeInput> = {}
): IngestionOutcomeInput {
  return {
    fetched: 100,
    inserted: 20,
    signalsInserted: 20,
    duplicates: 60,
    rejected: 0,
    queuedForAI: 20,
    completedProviders: ["newsdata", "gnews", "rss"],
    skippedProviders: [],
    errors: [],
    timedOutSafely: false,
    persistenceSucceeded: true,
    startedAt: 1_000,
    completedAt: 3_000,
    ...overrides,
  };
}

describe("classifyIngestionOutcome", () => {
  it("all providers healthy → success", () => {
    const o = classifyIngestionOutcome(baseInput());
    expect(o.status).toBe("success");
    expect(o.ok).toBe(true);
    expect(o.degraded).toBe(false);
    expect(o.durationMs).toBe(2_000);
  });

  it("one optional RSS feed dead but family healthy → not failed", () => {
    const o = classifyIngestionOutcome(
      baseInput({ errors: ["rss: etv-cg failed", "rss: zee-mpcg failed"] })
    );
    // Individual dead feeds are tolerated — family still completed.
    expect(o.status).toBe("success");
    expect(o.ok).toBe(true);
  });

  it("GNews quota exhausted (gnews skipped) → degraded, not failed", () => {
    const o = classifyIngestionOutcome(
      baseInput({
        completedProviders: ["newsdata", "rss"],
        skippedProviders: ["gnews"],
        errors: ["gnews: 403 quota exhausted"],
      })
    );
    expect(o.status).toBe("degraded");
    expect(o.ok).toBe(true);
    expect(o.degraded).toBe(true);
    expect(o.optionalProviderFailures).toContain("gnews");
    expect(o.requiredProviderFailures).toHaveLength(0);
  });

  it("GNews 429 while NewsData + RSS work → degraded", () => {
    const o = classifyIngestionOutcome(
      baseInput({
        completedProviders: ["newsdata", "rss"],
        skippedProviders: ["gnews"],
        errors: ["gnews: 429 Too Many Requests"],
      })
    );
    expect(o.status).toBe("degraded");
    expect(o.optionalProviderFailures).toEqual(["gnews"]);
  });

  it("NewsData unavailable but RSS working → degraded (preferred failure)", () => {
    const o = classifyIngestionOutcome(
      baseInput({
        completedProviders: ["gnews", "rss"],
        skippedProviders: ["newsdata"],
        errors: ["newsdata: connection reset"],
      })
    );
    expect(o.status).toBe("degraded");
    expect(o.optionalProviderFailures).toContain("newsdata");
  });

  it("RSS partially unavailable, safe deadline reached → degraded", () => {
    const o = classifyIngestionOutcome(
      baseInput({ timedOutSafely: true, errors: ["rss: batch skipped"] })
    );
    expect(o.status).toBe("degraded");
    expect(o.timedOutSafely).toBe(true);
  });

  it("all providers unavailable, nothing fetched → failed", () => {
    const o = classifyIngestionOutcome(
      baseInput({
        fetched: 0,
        inserted: 0,
        signalsInserted: 0,
        duplicates: 0,
        queuedForAI: 0,
        completedProviders: [],
        skippedProviders: ["newsdata", "gnews", "rss"],
        errors: ["newsdata: down", "gnews: down", "rss: down"],
      })
    );
    expect(o.status).toBe("failed");
    expect(o.ok).toBe(false);
    expect(o.failureReason).toBe("all_source_families_failed");
  });

  it("database persistence failure → failed even with inserts reported", () => {
    const o = classifyIngestionOutcome(
      baseInput({ persistenceSucceeded: false })
    );
    expect(o.status).toBe("failed");
    expect(o.ok).toBe(false);
    expect(o.failureReason).toBe("persistence_failed");
    expect(o.requiredProviderFailures).toContain("persistence");
  });

  it("useful ingestion reaching safe deadline → degraded", () => {
    const o = classifyIngestionOutcome(
      baseInput({ inserted: 40, timedOutSafely: true })
    );
    expect(o.status).toBe("degraded");
    expect(o.ok).toBe(true);
  });

  it("zero new content because everything was duplicate → success", () => {
    const o = classifyIngestionOutcome(
      baseInput({ inserted: 0, signalsInserted: 0, duplicates: 100, queuedForAI: 0 })
    );
    expect(o.status).toBe("success");
    expect(o.ok).toBe(true);
    expect(o.degraded).toBe(false);
  });

  it("never marks failed solely because errors.length > 0", () => {
    const o = classifyIngestionOutcome(
      baseInput({ errors: Array.from({ length: 12 }, (_, i) => `rss: feed-${i} failed`) })
    );
    expect(o.status).not.toBe("failed");
  });
});

describe("describeIngestionOutcome", () => {
  it("uses GNews-quota-specific language", () => {
    const o = classifyIngestionOutcome(
      baseInput({
        completedProviders: ["newsdata", "rss"],
        skippedProviders: ["gnews"],
        errors: ["gnews: 403 quota"],
      })
    );
    const msg = describeIngestionOutcome(o);
    expect(msg.title).toBe("News ingestion degraded");
    expect(msg.detail).toContain("GNews daily quota exhausted");
    expect(msg.detail).toContain("NewsData and RSS ingestion continue");
  });

  it("does not say 'Cron failed' for a degraded run", () => {
    const o = classifyIngestionOutcome(
      baseInput({ completedProviders: ["newsdata", "rss"], skippedProviders: ["gnews"] })
    );
    const msg = describeIngestionOutcome(o);
    expect(msg.title.toLowerCase()).not.toContain("cron failed");
  });
});
