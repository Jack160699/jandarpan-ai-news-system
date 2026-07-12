import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const loaderMock = vi.hoisted(() => ({
  loadAnalysisSnapshot: vi.fn(),
}));

const repoMock = vi.hoisted(() => ({
  clearAnalysisOutputs: vi.fn(async () => undefined),
  upsertKeywordIntelligence: vi.fn(async () => 3),
  insertGapReports: vi.fn(async () => 5),
  upsertTrendingTopics: vi.fn(async () => 2),
  insertRecommendations: vi.fn(async () => 4),
}));

vi.mock("@/lib/seo-intelligence/data-loader", () => loaderMock);
vi.mock("@/lib/seo-intelligence/repository", () => repoMock);
vi.mock("@/lib/supabase", () => ({
  isSupabaseConfigured: () => true,
}));

describe("seo intelligence engine integration", () => {
  const originalFlag = process.env.SEO_INTELLIGENCE_ENGINE;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.SEO_INTELLIGENCE_ENGINE = "true";
    loaderMock.loadAnalysisSnapshot.mockResolvedValue({
      competitorArticles: [
        {
          id: "c1",
          source_id: "s1",
          source_name: "Aaj Tak",
          url: "https://example.com/1",
          title: "बिलासपुर में नई सरकारी योजना",
          description: "योजना विवरण",
          category: "politics",
          district: "bilaspur",
          published_at: "2026-07-11T08:00:00.000Z",
          fetched_at: "2026-07-11T08:00:00.000Z",
          word_count: 120,
          headings: [],
          open_graph: {},
          schema_detected: {},
        },
      ],
      jandarpanArticles: [
        {
          id: "j1",
          slug: "raipur-rain",
          headline: "रायपुर में बारिश",
          summary: "मौसम अपडेट",
          seo_title: null,
          seo_description: null,
          tags: ["weather"],
          published_at: "2026-07-11T07:00:00.000Z",
          district: "raipur",
          category: "weather",
          word_count: 200,
          hero_image_url: null,
          editorial_metadata: {},
        },
      ],
      loadedAt: "2026-07-11T10:00:00.000Z",
    });
  });

  afterEach(() => {
    process.env.SEO_INTELLIGENCE_ENGINE = originalFlag;
  });

  it("skips when feature flag is disabled", async () => {
    process.env.SEO_INTELLIGENCE_ENGINE = "false";
    const { runSeoIntelligenceEngine } = await import(
      "@/lib/seo-intelligence/engine"
    );
    const result = await runSeoIntelligenceEngine();
    expect(result.status).toBe("skipped");
    expect(loaderMock.loadAnalysisSnapshot).not.toHaveBeenCalled();
  });

  it("runs full analysis pipeline and persists outputs", async () => {
    const { runSeoIntelligenceEngine } = await import(
      "@/lib/seo-intelligence/engine"
    );
    const result = await runSeoIntelligenceEngine();

    expect(result.status).toBe("completed");
    expect(result.ok).toBe(true);
    expect(loaderMock.loadAnalysisSnapshot).toHaveBeenCalled();
    expect(repoMock.clearAnalysisOutputs).toHaveBeenCalled();
    expect(repoMock.upsertKeywordIntelligence).toHaveBeenCalled();
    expect(repoMock.insertGapReports).toHaveBeenCalled();
    expect(repoMock.upsertTrendingTopics).toHaveBeenCalled();
    expect(repoMock.insertRecommendations).toHaveBeenCalled();
    expect(result.gapsFound).toBeGreaterThan(0);
    expect(result.recommendationsGenerated).toBeGreaterThan(0);
  });
});
