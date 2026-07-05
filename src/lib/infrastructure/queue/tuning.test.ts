import { describe, expect, it } from "vitest";
import {
  computeAdaptiveBatchSize,
  computeAdaptiveMicroBatch,
  computeQueueEta,
  resolveAiWorkerTuning,
  resolveImageWorkerTuning,
} from "@/lib/infrastructure/queue/tuning";
import type { ExecutionDeadline } from "@/lib/serverless/deadline";

describe("queue tuning", () => {
  it("scales AI batch with backlog", () => {
    const low = resolveAiWorkerTuning(100);
    const high = resolveAiWorkerTuning(12_000);
    expect(high.batchSize).toBeGreaterThan(low.batchSize);
    expect(high.microBatchSize).toBeGreaterThanOrEqual(low.microBatchSize);
  });

  it("caps batch by deadline budget", () => {
    const deadline = {
      remainingMs: () => 5_000,
      shouldStop: () => false,
      hasBudgetFor: () => true,
    } as unknown as ExecutionDeadline;
    const size = computeAdaptiveBatchSize({
      pending: 20_000,
      deadline,
      baseBatch: 40,
      maxBatch: 120,
      avgItemMs: 2_000,
      reserveMs: 3_000,
    });
    expect(size).toBeLessThanOrEqual(2);
  });

  it("computes editorial concurrency from backlog", () => {
    const low = resolveImageWorkerTuning(50);
    const high = resolveImageWorkerTuning(2_000);
    expect(high.concurrency).toBeGreaterThanOrEqual(low.concurrency);
    expect(high.batchSize).toBeGreaterThan(low.batchSize);
  });

  it("computes queue ETA", () => {
    expect(computeQueueEta(0, 100).etaLabel).toBe("empty");
    expect(computeQueueEta(500, 0).etaLabel).toBe("unknown");
    expect(computeQueueEta(120, 60).etaHours).toBe(2);
  });

  it("micro batch never exceeds batch size", () => {
    const micro = computeAdaptiveMicroBatch({
      pending: 8_000,
      batchSize: 20,
      baseMicro: 10,
      maxMicro: 25,
    });
    expect(micro).toBeLessThanOrEqual(20);
  });
});
