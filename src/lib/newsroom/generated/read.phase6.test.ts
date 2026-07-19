import { beforeEach, describe, expect, it, vi } from "vitest";
import { GENERATED_POOL_HARD_CAPS } from "@/lib/newsroom/generated/pool-limits";

const selectMock = vi.fn();

vi.mock("@/lib/supabase", () => ({
  isSupabaseConfigured: () => true,
  createAnonServerClient: () => ({
    from: () => ({
      select: (...args: unknown[]) => {
        selectMock(...args);
        const chain: Record<string, unknown> = {};
        const self = () => chain;
        chain.not = self;
        chain.in = self;
        chain.eq = self;
        chain.ilike = self;
        chain.gte = self;
        chain.lt = self;
        chain.order = self;
        chain.limit = (n: number) => {
          chain.__limit = n;
          return Promise.resolve({
            data: [
              {
                slug: "story-a",
                published_at: "2026-07-19T12:00:00.000Z",
                created_at: "2026-07-19T11:00:00.000Z",
                editorial_status: "approved",
                workflow_status: "published",
                headline: "A",
                summary: "s",
              },
              {
                slug: "story-b",
                published_at: "2026-07-19T11:00:00.000Z",
                created_at: "2026-07-19T10:00:00.000Z",
                editorial_status: "approved",
                workflow_status: "published",
                headline: "B",
                summary: "s",
              },
            ],
            error: null,
          });
        };
        chain.maybeSingle = () =>
          Promise.resolve({ data: null, error: null });
        return chain;
      },
    }),
  }),
}));

vi.mock("@/lib/news/live-feed/logger", () => ({
  errorLiveFeed: vi.fn(),
  logLiveFeed: vi.fn(),
  warnLiveFeed: vi.fn(),
}));

vi.mock("@/lib/newsroom/logger", () => ({
  logNewsroom: vi.fn(),
}));

describe("Phase 6 generated pool reads", () => {
  beforeEach(() => {
    vi.resetModules();
    selectMock.mockReset();
  });

  it("uses homepage projection without article_body", async () => {
    const { fetchGeneratedArticlePool, GENERATED_SELECT_HOMEPAGE } =
      await import("@/lib/newsroom/generated/read");
    await fetchGeneratedArticlePool(200, { select: "homepage" });
    expect(selectMock).toHaveBeenCalledWith(GENERATED_SELECT_HOMEPAGE);
    expect(GENERATED_SELECT_HOMEPAGE).not.toContain("article_body");
  });

  it("clamps sitemap pool and uses sitemap projection", async () => {
    const {
      fetchSitemapGeneratedArticles,
      GENERATED_SELECT_SITEMAP,
    } = await import("@/lib/newsroom/generated/read");
    const rows = await fetchSitemapGeneratedArticles(800);
    expect(selectMock).toHaveBeenCalledWith(GENERATED_SELECT_SITEMAP);
    expect(GENERATED_SELECT_SITEMAP).not.toContain("article_body");
    expect(GENERATED_SELECT_SITEMAP).not.toContain("summary");
    expect(rows.length).toBeLessThanOrEqual(GENERATED_POOL_HARD_CAPS.sitemap);
    expect(rows[0]?.slug).toBeTruthy();
  });

  it("supports keyset cursor pagination", async () => {
    const { fetchGeneratedArticlePool } = await import(
      "@/lib/newsroom/generated/read"
    );
    const page = await fetchGeneratedArticlePool(50, {
      select: "homepage",
      cursorPublishedAt: "2026-07-19T12:00:00.000Z",
    });
    expect(page.length).toBeGreaterThan(0);
    expect(selectMock).toHaveBeenCalled();
  });

  it("slug listing uses slug projection", async () => {
    const { getGeneratedArticleSlugs, GENERATED_SELECT_SLUG } = await import(
      "@/lib/newsroom/generated/read"
    );
    const slugs = await getGeneratedArticleSlugs(400);
    expect(selectMock).toHaveBeenCalledWith(GENERATED_SELECT_SLUG);
    expect(slugs).toEqual(["story-a", "story-b"]);
  });
});
