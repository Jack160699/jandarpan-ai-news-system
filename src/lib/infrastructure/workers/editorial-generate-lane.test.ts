import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mockGetQueueMetrics = vi.fn();
vi.mock("@/lib/infrastructure/workers/editorial-generate-observability", async (importOriginal) => {
  const actual = await importOriginal<
    typeof import("@/lib/infrastructure/workers/editorial-generate-observability")
  >();
  return { ...actual, getEditorialGenerateQueueMetrics: () => mockGetQueueMetrics() };
});

const mockGenerateEditorialsFromEvents = vi.fn();
vi.mock("@/lib/news/ai/generate-article", () => ({
  generateEditorialsFromEvents: (...args: unknown[]) => mockGenerateEditorialsFromEvents(...args),
}));

const mockIsAnyChatProviderConfigured = vi.fn();
vi.mock("@/lib/ai/providers/chat", () => ({
  isAnyChatProviderConfigured: () => mockIsAnyChatProviderConfigured(),
}));

import { classifyLaneOutcome, runEditorialGenerateLane } from "@/lib/infrastructure/workers/editorial-generate-lane";
import { createExecutionDeadline } from "@/lib/serverless/deadline";

describe("classifyLaneOutcome", () => {
  it("returns success for a clean batch", () => {
    expect(
      classifyLaneOutcome({
        batch: { processed: 2, completed: 2, failed: 0, dead: 0 },
        incidents: [],
      })
    ).toBe("success");
  });

  it("returns failed when all claimed work dies with no completions", () => {
    expect(
      classifyLaneOutcome({
        batch: { processed: 1, completed: 0, failed: 0, dead: 1 },
        incidents: [],
      })
    ).toBe("failed");
  });

  it("keeps a useful batch degraded when historical dead letters exist", () => {
    expect(
      classifyLaneOutcome({
        batch: { processed: 2, completed: 2, failed: 0, dead: 0 },
        incidents: [
          {
            code: "dead_letters",
            severity: "critical",
            detail: "1 dead job",
          },
        ],
      })
    ).toBe("degraded");
  });

  it("returns degraded for partial runs or warning incidents", () => {
    expect(
      classifyLaneOutcome({
        batch: { processed: 2, completed: 1, failed: 0, dead: 0, partial: true },
        incidents: [],
      })
    ).toBe("degraded");

    expect(
      classifyLaneOutcome({
        batch: { processed: 1, completed: 1, failed: 0, dead: 0 },
        incidents: [
          {
            code: "queue_age_exceeded",
            severity: "warning",
            detail: "backlog",
          },
        ],
      })
    ).toBe("degraded");
  });

  it("returns degraded when skipped for gate reasons", () => {
    expect(
      classifyLaneOutcome({
        batch: { processed: 0, completed: 0, failed: 0, dead: 0 },
        incidents: [],
        skipped: true,
        reason: "deadline_precheck",
      })
    ).toBe("degraded");
  });
});

describe("runEditorialGenerateLane — empty-queue direct-generation fallback", () => {
  beforeEach(() => {
    vi.stubEnv("NEWSROOM_GENERATE_ARTICLES", "true");
    mockIsAnyChatProviderConfigured.mockReturnValue(true);
    mockGetQueueMetrics.mockReset();
    mockGenerateEditorialsFromEvents.mockReset();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  /**
   * Regression coverage for a real Production bug: worker_jobs(editorial_generate)
   * sat permanently empty (nothing in the automated pipeline enqueues new
   * rows from news_events — only the manual ops/editorial-backlog-recovery
   * tool does), so this lane reported "queue_empty" every 15 minutes
   * indefinitely while 161 real, un-drafted events existed. Confirmed live
   * via a direct Production trigger (queueDepth:0, recordsProcessed:0).
   */
  it("calls generateEditorialsFromEvents directly when the queue is empty, instead of no-op'ing", async () => {
    mockGetQueueMetrics.mockResolvedValue({
      pending: 0,
      claimed: 0,
      dead: 0,
      oldestPendingAgeMs: null,
      lastSuccessAt: null,
      lastSuccessAgeMs: null,
      recentFailures: 0,
    });
    mockGenerateEditorialsFromEvents.mockResolvedValue({
      generated: 2,
      rejected: 0,
      published: 2,
      repaired: 0,
      skipped: 0,
      avgConfidence: 0.8,
      topStory: { storyId: "story-1", title: "Test", confidence: 0.8 },
      errors: [],
      results: [],
      skipReasonCounts: {},
      candidatePool: { windowed: 10, resolvable: 10, filteredNoSignals: 0, selected: 2 },
    });

    const result = await runEditorialGenerateLane({
      deadline: createExecutionDeadline(60_000),
      requestUrl: "https://example.test/api/cron/editorial-generate",
    });

    expect(mockGenerateEditorialsFromEvents).toHaveBeenCalledTimes(1);
    expect(result.ok).toBe(true);
    expect(result.metadata?.recordsProcessed).toBe(2);
    expect(result.metadata?.directGeneration).toBe(true);
    expect(result.metadata?.published).toBe(2);
  });

  it("does not call generateEditorialsFromEvents when the queue already has pending/claimed work", async () => {
    mockGetQueueMetrics.mockResolvedValue({
      pending: 3,
      claimed: 0,
      dead: 0,
      oldestPendingAgeMs: 60_000,
      lastSuccessAt: new Date().toISOString(),
      lastSuccessAgeMs: 60_000,
      recentFailures: 0,
    });

    try {
      await runEditorialGenerateLane({
        deadline: createExecutionDeadline(60_000),
        requestUrl: "https://example.test/api/cron/editorial-generate",
      });
    } catch {
      // processJobBatch will fail without a real DB in this unit test — the
      // only thing under test here is that the direct-generation fallback
      // is NOT taken when there's real queued work to drain instead.
    }

    expect(mockGenerateEditorialsFromEvents).not.toHaveBeenCalled();
  });
});
