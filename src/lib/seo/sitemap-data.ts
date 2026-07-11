/**
 * Sitemap URL builders — static, category, story routes
 */

import type { MetadataRoute } from "next";
import { LEGAL_SITEMAP_PATHS } from "@/lib/legal/foundation-policies";
import { CATEGORY_SEO } from "@/lib/seo/categories";
import { SEO_HOMEPAGE_CLUSTERS } from "@/lib/seo/homepage-hub";
import { SITE_URL } from "@/lib/seo/constants";
import { getLiveCoverageSlugs } from "@/lib/news/coverage/read";
import { getAllDistrictSlugs } from "@/lib/regional";
import { loadPlatformTopics } from "@/lib/newsroom-platform/config/topics";
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
    {
      url: `${SITE_URL}/listen`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.72,
    },
    {
      url: `${SITE_URL}/shorts`,
      lastModified: now,
      changeFrequency: "hourly",
      priority: 0.78,
    },
  ];

  const categoryRoutes: MetadataRoute.Sitemap = CATEGORY_SEO.map((c) => ({
    url: `${SITE_URL}${c.path}`,
    lastModified: now,
    changeFrequency: "hourly" as const,
    priority: 0.88,
  }));

  const districtRoutes: MetadataRoute.Sitemap = getAllDistrictSlugs().map(
    (slug) => ({
      url: `${SITE_URL}/district/${encodeURIComponent(slug)}`,
      lastModified: now,
      changeFrequency: "hourly" as const,
      priority: 0.82,
    })
  );

  let topicRoutes: MetadataRoute.Sitemap = [];
  try {
    const topics = await withQueryTimeout(loadPlatformTopics(), []);
    topicRoutes = topics.map((topic) => ({
      url: `${SITE_URL}/topics/${encodeURIComponent(topic.slug)}`,
      lastModified: now,
      changeFrequency: "hourly" as const,
      priority: 0.8,
    }));
  } catch {
    /* optional DB */
  }

  const hubPaths = new Set<string>();
  for (const cluster of SEO_HOMEPAGE_CLUSTERS) {
    if (cluster.path.startsWith("/")) hubPaths.add(cluster.path);
    for (const link of cluster.links) {
      if (link.href.startsWith("/") && !link.href.startsWith("/search")) {
        hubPaths.add(link.href);
      }
    }
  }
  const hubRoutes: MetadataRoute.Sitemap = [...hubPaths].map((path) => ({
    url: `${SITE_URL}${path}`,
    lastModified: now,
    changeFrequency: "weekly" as const,
    priority: 0.7,
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

  const legalRoutes: MetadataRoute.Sitemap = LEGAL_SITEMAP_PATHS.map((path) => ({
    url: `${SITE_URL}${path}`,
    lastModified: now,
    changeFrequency: "monthly" as const,
    priority: path === "/about" || path === "/contact" ? 0.6 : 0.45,
  }));

  const merged = [
    ...staticRoutes,
    ...legalRoutes,
    ...categoryRoutes,
    ...districtRoutes,
    ...topicRoutes,
    ...hubRoutes,
    ...storyRoutes,
    ...liveRoutes,
  ];

  const seen = new Set<string>();
  return merged.filter((entry) => {
    const key = entry.url.replace(/\/$/, "");
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export async function buildGoogleNewsEntries(now = new Date()) {
  const { toGoogleNewsEntry } = await import("@/lib/seo/google-news");
  const { fetchGoogleNewsArticlePool } = await import(
    "@/lib/newsroom/generated/read"
  );

  const pool = await fetchGoogleNewsArticlePool(undefined, now);
  return pool
    .map((row) =>
      toGoogleNewsEntry(
        {
          slug: row.slug,
          headline: row.headline,
          publishedAt: row.published_at,
          language: row.language,
        },
        now
      )
    )
    .filter((e): e is NonNullable<typeof e> => Boolean(e));
}
