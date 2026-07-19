import { beforeEach, describe, expect, it, vi } from "vitest";

const getGeneratedPoolSummary = vi.fn();

vi.mock("@/lib/newsroom/generated/pool-summary", () => ({
  getGeneratedPoolSummary: (...args: unknown[]) =>
    getGeneratedPoolSummary(...args),
}));

vi.mock("@/lib/supabase", () => ({
  isSupabaseConfigured: () => true,
  createAnonServerClient: vi.fn(),
  createAdminServerClient: vi.fn(),
  getSupabaseEnvDiagnostics: () => ({ configured: true }),
}));

vi.mock("@/lib/ai/providers", () => ({
  getAiProviderHealthSummary: vi.fn(() => ({
    providers: [],
    openaiConfigured: false,
    openrouterConfigured: false,
    localEnrichEnabled: true,
  })),
}));

vi.mock("@/lib/infrastructure/config", () => ({
  INFRA_CONFIG: {},
}));

vi.mock("@/lib/infrastructure/cache/redis", () => ({
  isRedisConfigured: () => false,
  redisPing: vi.fn(),
}));

vi.mock("@/lib/observability/cron-monitor", () => ({
  getCronMonitorState: vi.fn(async () => ({ jobs: [], staleJobs: [] })),
}));

vi.mock("@/lib/news/ai/queue", () => ({
  countPendingAiQueue: vi.fn(async () => 0),
}));

vi.mock("@/lib/news/ai/generate-editorial-image", () => ({
  countPendingEditorialImages: vi.fn(async () => 0),
}));

vi.mock("@/lib/infrastructure/providers/api-health", () => ({
  getApiProviderHealthDashboard: vi.fn(),
}));

vi.mock("@/lib/news/rss-health", () => ({
  getRssHealthDashboard: vi.fn(),
}));

vi.mock("@/lib/news/providers/circuit-breaker", () => ({
  getProviderRegistryDashboard: vi.fn(),
}));

vi.mock("@/lib/news/live-feed/observability", () => ({
  getAggregationMetrics: vi.fn(),
}));

vi.mock("@/lib/observability/metrics", () => ({
  recordQueueSnapshot: vi.fn(),
  getMetricsDashboard: vi.fn(),
}));

vi.mock("@/lib/infrastructure/queue/tuning", () => ({
  computeDrainPerHour: vi.fn(),
  computeQueueEta: vi.fn(),
}));

describe("Phase 6 checkSupabase", () => {
  beforeEach(() => {
    getGeneratedPoolSummary.mockReset();
  });

  it("uses bounded pool summary instead of full-table scan", async () => {
    getGeneratedPoolSummary.mockResolvedValue({
      ok: true,
      publishedCount: 55,
      pendingCount: 2,
      latestPublishedAt: "2026-07-19T10:00:00.000Z",
      hasPublished: true,
      durationMs: 40,
      timedOut: false,
      fromCache: false,
    });

    const { checkSupabase } = await import(
      "@/lib/observability/health/checks"
    );
    const result = await checkSupabase();
    expect(result.status).toBe("healthy");
    expect(result.details?.generatedArticles).toBe(55);
    expect(getGeneratedPoolSummary).toHaveBeenCalledTimes(1);
  });

  it("keeps last-known healthy when summary times out from cache", async () => {
    getGeneratedPoolSummary.mockResolvedValue({
      ok: true,
      publishedCount: 55,
      pendingCount: 2,
      latestPublishedAt: "2026-07-19T10:00:00.000Z",
      hasPublished: true,
      durationMs: 12,
      timedOut: true,
      fromCache: true,
    });

    const { checkSupabase } = await import(
      "@/lib/observability/health/checks"
    );
    const result = await checkSupabase();
    expect(result.status).toBe("degraded");
    expect(result.details?.generatedArticles).toBe(55);
    expect(result.message).toMatch(/timeout|cached/i);
  });
});
