import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const repoMocks = vi.hoisted(() => ({
  createCompetitorRun: vi.fn(async () => "run-1"),
  finishCompetitorRun: vi.fn(async () => undefined),
  listEnabledCompetitorSources: vi.fn(async () => []),
  saveCompetitorArticle: vi.fn(async () => "inserted" as const),
}));

vi.mock("@/lib/competitor-intelligence/repository", () => repoMocks);
vi.mock("@/lib/competitor-intelligence/robots", () => ({
  isUrlAllowedByRobots: vi.fn(async () => true),
}));
vi.mock("@/lib/competitor-intelligence/parser", () => ({
  parseCompetitorFeed: vi.fn(async () => []),
  enrichCompetitorArticleFromHtml: vi.fn(async (a: unknown) => a),
}));
vi.mock("@/lib/supabase", () => ({
  isSupabaseConfigured: () => true,
}));

describe("competitor scheduler", () => {
  const originalFlag = process.env.SEO_COMPETITOR_TRACKER;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.SEO_COMPETITOR_TRACKER = "true";
  });

  afterEach(() => {
    process.env.SEO_COMPETITOR_TRACKER = originalFlag;
  });

  it("skips crawl when feature flag is disabled", async () => {
    process.env.SEO_COMPETITOR_TRACKER = "false";
    const { runCompetitorIntelligenceCrawl } = await import(
      "@/lib/competitor-intelligence/collector"
    );

    const result = await runCompetitorIntelligenceCrawl();
    expect(result.status).toBe("skipped");
    expect(result.runId).toBeNull();
    expect(repoMocks.createCompetitorRun).not.toHaveBeenCalled();
  });

  it("records a completed crawl run when enabled", async () => {
    repoMocks.listEnabledCompetitorSources.mockResolvedValueOnce([
      {
        id: "src-1",
        name: "Dainik Bhaskar",
        homepage: "https://www.bhaskar.com",
        feed_url: "https://www.bhaskar.com/rss-feed/272/",
        language: "hi",
        region: "india",
        enabled: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      } as never,
    ]);

    const { runCompetitorIntelligenceCrawl } = await import(
      "@/lib/competitor-intelligence/collector"
    );

    const result = await runCompetitorIntelligenceCrawl();
    expect(result.status).toBe("completed");
    expect(result.runId).toBe("run-1");
    expect(repoMocks.createCompetitorRun).toHaveBeenCalled();
    expect(repoMocks.finishCompetitorRun).toHaveBeenCalledWith(
      expect.objectContaining({
        runId: "run-1",
        status: "completed",
      })
    );
  });
});

describe("competitor tracker feature flag", () => {
  const originalFlag = process.env.SEO_COMPETITOR_TRACKER;

  afterEach(() => {
    process.env.SEO_COMPETITOR_TRACKER = originalFlag;
  });

  it("is enabled only when SEO_COMPETITOR_TRACKER=true", async () => {
    const { isCompetitorTrackerEnabled } = await import(
      "@/lib/competitor-intelligence/config"
    );

    process.env.SEO_COMPETITOR_TRACKER = "true";
    expect(isCompetitorTrackerEnabled()).toBe(true);

    process.env.SEO_COMPETITOR_TRACKER = "false";
    expect(isCompetitorTrackerEnabled()).toBe(false);
  });
});
