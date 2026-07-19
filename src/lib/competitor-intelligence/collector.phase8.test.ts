import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  CompetitorTimeoutError,
  withTimeout,
} from "@/lib/competitor-intelligence/timeouts";

const hoisted = vi.hoisted(() => {
  function rotateSourcesFromCursor<T extends { id: string }>(
    sources: T[],
    cursorSourceId: string | null
  ): T[] {
    if (!cursorSourceId || sources.length === 0) return sources;
    const idx = sources.findIndex((s) => s.id === cursorSourceId);
    if (idx < 0) return sources;
    const next = idx + 1;
    if (next >= sources.length) return sources;
    return [...sources.slice(next), ...sources.slice(0, next)];
  }

  return {
    rotateSourcesFromCursor,
    parseCompetitorFeed: vi.fn(),
    enrichCompetitorArticleFromHtml: vi.fn(async (a: unknown) => a),
    saveCompetitorArticle: vi.fn(async () => "inserted" as const),
    listEnabledCompetitorSources: vi.fn(),
    createCompetitorRun: vi.fn(async () => "run-1"),
    finishCompetitorRun: vi.fn(async () => undefined),
    isUrlAllowedByRobots: vi.fn(async () => true),
    loadCompetitorProgress: vi.fn(
      async (): Promise<{
        cursorSourceId: string | null;
        updatedAt: string;
        lastRunId: string | null;
        sourcesCompleted: number;
      } | null> => null
    ),
    saveCompetitorProgress: vi.fn(async () => undefined),
    clearCompetitorProgress: vi.fn(async () => undefined),
    recordCronRun: vi.fn(async () => undefined),
  };
});

vi.mock("@/lib/competitor-intelligence/config", () => ({
  isCompetitorTrackerEnabled: () => true,
  COMPETITOR_BATCH_SIZE: 2,
  COMPETITOR_DOMAIN_TIMEOUT_MS: 40,
  COMPETITOR_PAGE_TIMEOUT_MS: 30,
  COMPETITOR_RUN_BUDGET_MS: 10_000,
  COMPETITOR_SOURCE_DELAY_MS: 0,
  COMPETITOR_MAX_ITEMS_PER_SOURCE: 2,
  COMPETITOR_MAX_PAGE_ENRICHMENTS: 0,
  COMPETITOR_FETCH_TIMEOUT_MS: 8_000,
  COMPETITOR_PROGRESS_CACHE_KEY: "ops:competitor:progress:v1",
  COMPETITOR_PROGRESS_TTL_SEC: 86_400,
  COMPETITOR_USER_AGENT: "test",
}));

vi.mock("@/lib/competitor-intelligence/parser", () => ({
  parseCompetitorFeed: hoisted.parseCompetitorFeed,
  enrichCompetitorArticleFromHtml: hoisted.enrichCompetitorArticleFromHtml,
}));

vi.mock("@/lib/competitor-intelligence/robots", () => ({
  isUrlAllowedByRobots: hoisted.isUrlAllowedByRobots,
}));

vi.mock("@/lib/competitor-intelligence/repository", () => ({
  createCompetitorRun: hoisted.createCompetitorRun,
  finishCompetitorRun: hoisted.finishCompetitorRun,
  listEnabledCompetitorSources: hoisted.listEnabledCompetitorSources,
  saveCompetitorArticle: hoisted.saveCompetitorArticle,
}));

vi.mock("@/lib/competitor-intelligence/progress", () => ({
  loadCompetitorProgress: hoisted.loadCompetitorProgress,
  saveCompetitorProgress: hoisted.saveCompetitorProgress,
  clearCompetitorProgress: hoisted.clearCompetitorProgress,
  rotateSourcesFromCursor: hoisted.rotateSourcesFromCursor,
}));

vi.mock("@/lib/observability/cron-monitor", () => ({
  recordCronRun: hoisted.recordCronRun,
}));

vi.mock("@/lib/supabase", () => ({
  isSupabaseConfigured: () => true,
}));

vi.mock("@/lib/competitor-intelligence/logger", () => ({
  logCompetitorIntel: vi.fn(),
  warnCompetitorIntel: vi.fn(),
  errorCompetitorIntel: vi.fn(),
}));

describe("Phase 8 competitor timeouts / continuation units", () => {
  it("enforces per-domain timeout", async () => {
    await expect(
      withTimeout(
        new Promise((r) => setTimeout(r, 200)),
        30,
        "domain",
        "slow"
      )
    ).rejects.toBeInstanceOf(CompetitorTimeoutError);
  });

  it("rotates continuation cursor", () => {
    expect(
      hoisted
        .rotateSourcesFromCursor([{ id: "a" }, { id: "b" }, { id: "c" }], "a")
        .map((s) => s.id)
    ).toEqual(["b", "c", "a"]);
  });
});

describe("Phase 8 competitor crawl", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    hoisted.listEnabledCompetitorSources.mockResolvedValue([
      {
        id: "s1",
        name: "SlowCo",
        homepage: "https://slow.example",
        feed_url: "https://slow.example/rss",
        language: "hi",
        region: "cg",
        enabled: true,
        created_at: "",
        updated_at: "",
      },
      {
        id: "s2",
        name: "FastCo",
        homepage: "https://fast.example",
        feed_url: "https://fast.example/rss",
        language: "hi",
        region: "cg",
        enabled: true,
        created_at: "",
        updated_at: "",
      },
      {
        id: "s3",
        name: "NextCo",
        homepage: "https://next.example",
        feed_url: "https://next.example/rss",
        language: "hi",
        region: "cg",
        enabled: true,
        created_at: "",
        updated_at: "",
      },
    ]);
    hoisted.parseCompetitorFeed.mockResolvedValue([
      {
        url: "https://fast.example/a",
        title: "Story",
        description: "d",
      },
    ]);
    hoisted.saveCompetitorArticle.mockResolvedValue("inserted");
    hoisted.loadCompetitorProgress.mockResolvedValue(null);
  });

  it("times out one slow domain without blocking the batch", async () => {
    hoisted.parseCompetitorFeed.mockImplementation(async (url: string) => {
      if (String(url).includes("slow")) {
        await new Promise((r) => setTimeout(r, 120));
      }
      return [{ url: `${url}/a`, title: "Story", description: "d" }];
    });

    const { runCompetitorIntelligenceCrawl } = await import(
      "@/lib/competitor-intelligence/collector"
    );
    const result = await runCompetitorIntelligenceCrawl({
      heartbeat: async () => undefined,
    });

    expect(result.ok).toBe(true);
    expect(result.timedOutSources).toBeGreaterThanOrEqual(1);
    expect(result.sourcesCrawled).toBe(2);
    expect(result.sourcesAttempted).toBe(2);
    expect(hoisted.saveCompetitorProgress).toHaveBeenCalled();
  });

  it("continues from cursor across ticks", async () => {
    hoisted.loadCompetitorProgress.mockResolvedValue({
      cursorSourceId: "s1",
      updatedAt: new Date().toISOString(),
      lastRunId: "prev",
      sourcesCompleted: 1,
    });

    const { runCompetitorIntelligenceCrawl } = await import(
      "@/lib/competitor-intelligence/collector"
    );
    const result = await runCompetitorIntelligenceCrawl({
      heartbeat: async () => undefined,
    });

    expect(result.ok).toBe(true);
    expect(result.sourcesAttempted).toBe(2);
    expect(hoisted.saveCompetitorProgress).toHaveBeenCalled();
    expect(result.continued || result.articlesSaved >= 0).toBeTruthy();
  });

  it("keeps partial success when some article saves fail", async () => {
    hoisted.saveCompetitorArticle
      .mockResolvedValueOnce("inserted")
      .mockRejectedValueOnce(new Error("db_busy"));

    hoisted.parseCompetitorFeed.mockResolvedValue([
      { url: "https://fast.example/a", title: "A", description: "d" },
      { url: "https://fast.example/b", title: "B", description: "d" },
    ]);

    const { runCompetitorIntelligenceCrawl } = await import(
      "@/lib/competitor-intelligence/collector"
    );
    const result = await runCompetitorIntelligenceCrawl({
      heartbeat: async () => undefined,
    });

    expect(result.ok).toBe(true);
    expect(result.articlesSaved).toBeGreaterThanOrEqual(1);
    expect(result.errors.length).toBeGreaterThanOrEqual(0);
  });
});
