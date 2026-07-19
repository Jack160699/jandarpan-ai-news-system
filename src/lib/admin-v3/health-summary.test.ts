import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/observability/health/checks", () => ({
  checkSupabase: vi.fn(async () => ({
    id: "supabase",
    label: "Supabase",
    status: "healthy",
    latencyMs: 12,
  })),
  checkOpenAI: vi.fn(async () => ({
    id: "openai",
    label: "OpenAI",
    status: "healthy",
    latencyMs: 4,
  })),
  checkCronWorkers: vi.fn(async () => ({
    id: "cron",
    label: "Cron",
    status: "degraded",
    latencyMs: 20,
    message: "stale",
  })),
  checkQueues: vi.fn(async () => ({
    id: "queues",
    label: "Queues",
    status: "healthy",
    latencyMs: 8,
  })),
  checkRedisCache: vi.fn(async () => ({
    id: "redis",
    label: "Redis",
    status: "healthy",
    latencyMs: 3,
  })),
}));

vi.mock("@/lib/observability", () => ({
  aggregateHealthStatus: (checks: Array<{ status: string }>) =>
    checks.some((c) => c.status === "unhealthy")
      ? "unhealthy"
      : checks.some((c) => c.status === "degraded")
        ? "degraded"
        : "healthy",
  getCronMonitorState: vi.fn(async () => ({ jobs: [], staleJobs: [] })),
  getMetricsDashboard: vi.fn(async () => ({
    memoryUsageMb: 128,
    uptimeSec: 3600,
    queues: { aiPending: 2, editorialImagesPending: 1 },
    api: [],
  })),
}));

vi.mock("@/lib/admin-v3/canonical-health", () => ({
  deriveCanonicalHealth: vi.fn((payload: { status: string }) => ({
    state: payload.status === "degraded" ? "degraded" : "healthy",
    label:
      payload.status === "degraded" ? "Production · Degraded" : "Production · Healthy",
    reasons: [],
    checkedAt: new Date().toISOString(),
    criticalCount: 0,
    warningCount: payload.status === "degraded" ? 1 : 0,
  })),
}));

describe("buildHealthSummary", () => {
  it("returns summary mode with source timings and no throw", async () => {
    const { buildHealthSummary } = await import("./health-summary");
    const summary = await buildHealthSummary();
    expect(summary.ok).toBe(true);
    expect(summary.mode).toBe("summary");
    expect(summary.sources.length).toBeGreaterThanOrEqual(5);
    expect(summary.totalMs).toBeGreaterThanOrEqual(0);
    expect(summary.snapshot.label).toMatch(/Production/);
  });
});
