/**
 * Sitemap URL builders — static, category, story routes
 */

import type { MetadataRoute } from "next";
import { CATEGORY_SEO } from "@/lib/seo/categories";
import { SITE_URL } from "@/lib/seo/constants";
import { getLiveCoverageSlugs } from "@/lib/news/coverage/read";
import {
  fetchGeneratedArticlePool,
  getGeneratedArticleSlugs,
} from "@/lib/newsroom/generated/read";

const SITEMAP_QUERY_TIMEOUT_MS = 8_000;

async function withQueryTimeout<T>(
  promise: Promise<T>,
  fallback: T,
  timeoutMs = SITEMAP_QUERY_TIMEOUT_MS
): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<T>((resolve) => {
        timer = setTimeout(() => resolve(fallback), timeoutMs);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

export async function buildMainSitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: SITE_URL,
      lastModified: now,
      changeFrequency: "always",
      priority: 1,
    },
    {
      url: `${SITE_URL}/search`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.75,
    },
    {
      url: `${SITE_URL}/archive`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.5,
    },
  ];

  const categoryRoutes: MetadataRoute.Sitemap = CATEGORY_SEO.map((c) => ({
    url: `${SITE_URL}${c.path}`,
    lastModified: now,
    changeFrequency: "hourly" as const,
    priority: 0.88,
  }));

  let storyRoutes: MetadataRoute.Sitemap = [];
  try {
    const pool = await withQueryTimeout(
      fetchGeneratedArticlePool(800),
      [] as Awaited<ReturnType<typeof fetchGeneratedArticlePool>>
    );
    storyRoutes = pool.map((row) => ({
      url: `${SITE_URL}/story/${encodeURIComponent(row.slug)}`,
      lastModified: row.published_at
        ? new Date(row.published_at)
        : new Date(row.created_at),
      changeFrequency: "hourly" as const,
      priority: 0.85,
    }));
  } catch {
    try {
      const slugs = await withQueryTimeout(getGeneratedArticleSlugs(400), []);
      storyRoutes = slugs.map((slug) => ({
        url: `${SITE_URL}/story/${encodeURIComponent(slug)}`,
        lastModified: now,
        changeFrequency: "hourly" as const,
        priority: 0.85,
      }));
    } catch {
      /* optional DB at build */
    }
  }

  let liveRoutes: MetadataRoute.Sitemap = [];
  try {
    const liveSlugs = await withQueryTimeout(getLiveCoverageSlugs(100), []);
    liveRoutes = liveSlugs.map((slug) => ({
      url: `${SITE_URL}/live/${encodeURIComponent(slug)}`,
      lastModified: now,
      changeFrequency: "hourly" as const,
      priority: 0.9,
    }));
  } catch {
    /* optional */
  }

  return [...staticRoutes, ...categoryRoutes, ...storyRoutes, ...liveRoutes];
}

export async function buildGoogleNewsEntries() {
  const { toGoogleNewsEntry } = await import("@/lib/seo/google-news");
  const pool = await fetchGeneratedArticlePool(200);
  return pool
    .map((row) =>
      toGoogleNewsEntry({
        slug: row.slug,
        headline: row.headline,
        publishedAt: row.published_at,
        language: row.language,
      })
    )
    .filter((e): e is NonNullable<typeof e> => Boolean(e));
}
