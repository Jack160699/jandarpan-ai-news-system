import { describe, expect, it, vi } from "vitest";
import type { DeterministicReport } from "@/lib/newsroom-audit/collect";

/**
 * Regression coverage for a real bug: analyzeDailyReport used to hardcode
 * `model: null` in its success return regardless of which model the
 * provider chain actually used (src/lib/newsroom-audit/analyze.ts, the
 * `return { ...parsed, provider: result.provider, model: null }` line) —
 * live daily_newsroom_reports rows had ai_provider:"gemini" but
 * ai_model:null even though the request completed. Fixed by threading a
 * `model` field through ChatCompletionResult (types.ts) from chat.ts's
 * postChat/gemini.ts's requestGeminiChat, and having analyze.ts read
 * result.model instead of hardcoding null.
 */

const mockRequestChatCompletion = vi.fn();
vi.mock("@/lib/ai/providers/chat", () => ({
  requestChatCompletion: (...args: unknown[]) => mockRequestChatCompletion(...args),
}));

import { analyzeDailyReport } from "@/lib/newsroom-audit/analyze";

function metricOk<T>(value: T) {
  return { status: "ok" as const, value };
}

function buildReport(): DeterministicReport {
  return {
    reportDate: "2026-08-01",
    windowStartIso: "2026-07-31T18:30:00.000Z",
    windowEndIso: "2026-08-01T18:30:00.000Z",
    collectedAt: new Date().toISOString(),
    content_production: {
      articlesCreated: metricOk(5),
      articlesPublished: metricOk(5),
      byWorkflowStatus: metricOk({}),
      eventsCreated: metricOk(5),
    },
    content_mix: { byCategory: metricOk([]), byRegion: metricOk([]), byLanguage: metricOk([]) },
    freshness: {
      avgEventToPublishMinutes: metricOk(null),
      publishedWithoutEventLink: metricOk(0),
      oldestUnpublishedDraftHours: metricOk(null),
    },
    quality: {
      missingHeroImage: metricOk(0),
      missingSummary: metricOk(0),
      emptyArticleBody: metricOk(0),
      missingReadingTime: metricOk(0),
      workflowRejections: metricOk(0),
    },
    ai_provider_usage: {
      totalRequests: metricOk(0),
      successRate: metricOk(null),
      byProvider: metricOk([]),
      fallbackEvents: metricOk(0),
      totalEstimatedCostUsd: metricOk(0),
    },
    provider_quota: { buckets: metricOk([]) },
    embeddings_clustering: {
      embeddingsCreatedOpenAi: metricOk(0),
      embeddingsCreatedCloudflare: metricOk(0),
      eventsWithMultipleSources: metricOk(0),
      avgSourceCountPerEvent: metricOk(null),
    },
    images: { queued: metricOk(0), completed: metricOk(0), failed: metricOk(0), pending: metricOk(0) },
    pipeline_infrastructure: {
      jobsCompleted: metricOk(0),
      jobsFailed: metricOk(0),
      deadLetters: metricOk(0),
      cronRuns: metricOk([]),
      errorEventsBySeverity: metricOk({}),
    },
    audience_seo: {
      searchImpressions: { status: "unavailable", value: null, reason: "no integration" },
      searchClicks: { status: "unavailable", value: null, reason: "no integration" },
      searchAvgPosition: { status: "unavailable", value: null, reason: "no integration" },
      pageviews: { status: "unavailable", value: null, reason: "no integration" },
      note: "no integration",
    },
  };
}

const validAnalysisJson = JSON.stringify({
  status: "healthy",
  executive_summary: "Everything is fine today.",
  achievements: [],
  problems: [],
  warnings: [],
  actions: [],
});

describe("analyzeDailyReport", () => {
  it("persists the actual model the provider chain used, not null", async () => {
    mockRequestChatCompletion.mockReset();
    mockRequestChatCompletion.mockResolvedValue({
      ok: true,
      content: validAnalysisJson,
      provider: "gemini",
      model: "gemini-3.5-flash-lite",
      latencyMs: 10,
    });

    const result = await analyzeDailyReport(buildReport());

    expect(result.ai_status).toBe("completed");
    if (result.ai_status === "completed") {
      expect(result.provider).toBe("gemini");
      expect(result.model).toBe("gemini-3.5-flash-lite");
      expect(result.model).not.toBeNull();
    }
  });

  it("never silently persists a null model when the provider result reports one", async () => {
    mockRequestChatCompletion.mockReset();
    mockRequestChatCompletion.mockResolvedValue({
      ok: true,
      content: validAnalysisJson,
      provider: "groq",
      model: "llama-3.3-70b-versatile",
      latencyMs: 10,
    });

    const result = await analyzeDailyReport(buildReport());

    expect(result.ai_status).toBe("completed");
    if (result.ai_status === "completed") {
      expect(result.model).toBe("llama-3.3-70b-versatile");
    }
  });
});
