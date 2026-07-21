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
  it("all providers healthy with inserts → healthy_new_content", () => {
    const o = classifyIngestionOutcome(baseInput());
    expect(o.status).toBe("success");
    expect(o.classification).toBe("healthy_new_content");
    expect(o.ok).toBe(true);
    expect(o.degraded).toBe(false);
    expect(o.durationMs).toBe(2_000);
  });

  it("one optional RSS feed dead but family healthy → not failed", () => {
    const o = classifyIngestionOutcome(
      baseInput({ errors: ["rss: etv-cg failed", "rss: zee-mpcg failed"] })
    );
    expect(o.status).toBe("success");
    expect(o.classification).toBe("healthy_new_content");
    expect(o.ok).toBe(true);
  });

  it("GNews quota exhausted (gnews skipped) → degraded_quota", () => {
    const o = classifyIngestionOutcome(
      baseInput({
        completedProviders: ["newsdata", "rss"],
        skippedProviders: ["gnews"],
        errors: ["gnews: 403 quota exhausted"],
      })
    );
    expect(o.status).toBe("degraded");
    expect(o.classification).toBe("degraded_quota");
    expect(o.ok).toBe(true);
    expect(o.degraded).toBe(true);
    expect(o.optionalProviderFailures).toContain("gnews");
    expect(o.requiredProviderFailures).toHaveLength(0);
  });

  it("GNews 429 while NewsData + RSS work → degraded_quota", () => {
    const o = classifyIngestionOutcome(
      baseInput({
        completedProviders: ["newsdata", "rss"],
        skippedProviders: ["gnews"],
        errors: ["gnews: 429 Too Many Requests"],
      })
    );
    expect(o.status).toBe("degraded");
    expect(o.classification).toBe("degraded_quota");
    expect(o.optionalProviderFailures).toEqual(["gnews"]);
  });

  it("NewsData unavailable but RSS working → degraded_provider_failure", () => {
    const o = classifyIngestionOutcome(
      baseInput({
        completedProviders: ["gnews", "rss"],
        skippedProviders: ["newsdata"],
        errors: ["newsdata: connection reset"],
      })
    );
    expect(o.status).toBe("degraded");
    expect(o.classification).toBe("degraded_provider_failure");
    expect(o.optionalProviderFailures).toContain("newsdata");
  });

  it("RSS partially unavailable, safe deadline reached → degraded", () => {
    const o = classifyIngestionOutcome(
      baseInput({ timedOutSafely: true, errors: ["rss: batch skipped"] })
    );
    expect(o.status).toBe("degraded");
    expect(o.classification).toBe("degraded_provider_failure");
    expect(o.timedOutSafely).toBe(true);
  });

  it("all providers unavailable, nothing fetched → failed_all_providers", () => {
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
    expect(o.classification).toBe("failed_all_providers");
    expect(o.ok).toBe(false);
    expect(o.failureReason).toBe("all_source_families_failed");
  });

  it("database persistence failure → failed_persistence", () => {
    const o = classifyIngestionOutcome(
      baseInput({ persistenceSucceeded: false })
    );
    expect(o.status).toBe("failed");
    expect(o.classification).toBe("failed_persistence");
    expect(o.ok).toBe(false);
    expect(o.failureReason).toBe("persistence_failed");
    expect(o.requiredProviderFailures).toContain("persistence");
  });

  it("failed_persistence even when inserts were falsely reported", () => {
    const o = classifyIngestionOutcome(
      baseInput({
        inserted: 20,
        signalsInserted: 0,
        persistenceSucceeded: false,
      })
    );
    expect(o.classification).toBe("failed_persistence");
    expect(o.status).toBe("failed");
  });

  it("useful ingestion reaching safe deadline → degraded", () => {
    const o = classifyIngestionOutcome(
      baseInput({ inserted: 40, timedOutSafely: true })
    );
    expect(o.status).toBe("degraded");
    expect(o.ok).toBe(true);
  });

  it("zero new content because everything was duplicate → healthy_no_novel_content", () => {
    const o = classifyIngestionOutcome(
      baseInput({
        inserted: 0,
        signalsInserted: 0,
        duplicates: 100,
        queuedForAI: 0,
      })
    );
    expect(o.status).toBe("success");
    expect(o.classification).toBe("healthy_no_novel_content");
    expect(o.ok).toBe(true);
    expect(o.degraded).toBe(false);
  });

  it("healthy_no_novel_content is not failed_persistence", () => {
    const healthy = classifyIngestionOutcome(
      baseInput({
        inserted: 0,
        signalsInserted: 0,
        duplicates: 50,
        queuedForAI: 0,
        persistenceSucceeded: true,
      })
    );
    const failed = classifyIngestionOutcome(
      baseInput({
        inserted: 0,
        signalsInserted: 0,
        duplicates: 0,
        persistenceSucceeded: false,
      })
    );
    expect(healthy.classification).toBe("healthy_no_novel_content");
    expect(failed.classification).toBe("failed_persistence");
    expect(healthy.status).not.toBe(failed.status);
  });

  it("skipped_backpressure classification", () => {
    const o = classifyIngestionOutcome(
      baseInput({
        fetched: 0,
        inserted: 0,
        signalsInserted: 0,
        skippedBackpressure: true,
      })
    );
    expect(o.classification).toBe("skipped_backpressure");
    expect(o.ok).toBe(true);
    expect(o.degraded).toBe(true);
  });

  it("failed_configuration classification", () => {
    const o = classifyIngestionOutcome(
      baseInput({
        fetched: 0,
        inserted: 0,
        configurationFailed: true,
      })
    );
    expect(o.classification).toBe("failed_configuration");
    expect(o.status).toBe("failed");
    expect(o.ok).toBe(false);
  });

  it("never marks failed solely because errors.length > 0", () => {
    const o = classifyIngestionOutcome(
      baseInput({
        errors: Array.from({ length: 12 }, (_, i) => `rss: feed-${i} failed`),
      })
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
      baseInput({
        completedProviders: ["newsdata", "rss"],
        skippedProviders: ["gnews"],
      })
    );
    const msg = describeIngestionOutcome(o);
    expect(msg.title.toLowerCase()).not.toContain("cron failed");
  });

  it("describes failed_persistence clearly", () => {
    const o = classifyIngestionOutcome(
      baseInput({ persistenceSucceeded: false })
    );
    const msg = describeIngestionOutcome(o);
    expect(msg.detail.toLowerCase()).toContain("persistence");
  });
});
