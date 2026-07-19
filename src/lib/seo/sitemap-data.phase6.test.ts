import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  fetchSitemapGeneratedArticles,
  getGeneratedArticleSlugs,
} from "@/lib/newsroom/generated/read";
import {
  buildMainSitemap,
  clearMainSitemapCache,
} from "@/lib/seo/sitemap-data";

vi.mock("@/lib/newsroom/generated/read", () => ({
  fetchSitemapGeneratedArticles: vi.fn(async () => [
    {
      slug: "cg-story-abc12345",
      published_at: "2026-07-18T08:00:00.000Z",
      created_at: "2026-07-18T07:00:00.000Z",
      editorial_status: "approved",
      workflow_status: "published",
    },
  ]),
  getGeneratedArticleSlugs: vi.fn(async () => []),
}));

vi.mock("@/lib/news/coverage/read", () => ({
  getLiveCoverageSlugs: vi.fn(async () => []),
}));

vi.mock("@/lib/newsroom-platform/config/topics", () => ({
  loadPlatformTopics: vi.fn(async () => []),
}));

describe("Phase 6 sitemap performance", () => {
  beforeEach(() => {
    clearMainSitemapCache();
    vi.mocked(fetchSitemapGeneratedArticles).mockClear();
    vi.mocked(getGeneratedArticleSlugs).mockClear();
  });

  it("includes story URLs with stable lastModified from published_at", async () => {
    const entries = await buildMainSitemap();
    const story = entries.find((e) =>
      e.url.includes("/story/cg-story-abc12345")
    );
    expect(story).toBeTruthy();
    expect(story?.lastModified).toEqual(new Date("2026-07-18T08:00:00.000Z"));
  });

  it("serves warm cache without re-querying on second call", async () => {
    await buildMainSitemap();
    await buildMainSitemap();
    expect(fetchSitemapGeneratedArticles).toHaveBeenCalledTimes(1);
  });

  it("clears warm cache for invalidation", async () => {
    await buildMainSitemap();
    clearMainSitemapCache();
    await buildMainSitemap();
    expect(fetchSitemapGeneratedArticles).toHaveBeenCalledTimes(2);
  });
});
