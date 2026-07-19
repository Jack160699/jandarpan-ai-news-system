/**
 * Sitemap URL builders — static, category, story routes.
 * Phase 6: slim projections, warm cache, no full article body fetch.
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
  fetchSitemapGeneratedArticles,
  getGeneratedArticleSlugs,
} from "@/lib/newsroom/generated/read";
import { GENERATED_POOL_HARD_CAPS } from "@/lib/newsroom/generated/pool-limits";

const SITEMAP_QUERY_TIMEOUT_MS = 3_500;
const SITEMAP_CACHE_TTL_MS = 5 * 60_000;

let sitemapCache: { at: number; value: MetadataRoute.Sitemap } | null = null;
let sitemapInflight: Promise<MetadataRoute.Sitemap> | null = null;

export function clearMainSitemapCache(): void {
  sitemapCache = null;
  sitemapInflight = null;
}

/** @deprecated alias — prefer clearMainSitemapCache */
export const clearMainSitemapCacheForTests = clearMainSitemapCache;

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

async function buildMainSitemapUncached(): Promise<MetadataRoute.Sitemap> {
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
    {
      url: `${SITE_URL}/live`,
      lastModified: now,
      changeFrequency: "always",
      priority: 0.86,
    },
    {
      url: `${SITE_URL}/news/national`,
      lastModified: now,
      changeFrequency: "hourly",
      priority: 0.84,
    },
    {
      url: `${SITE_URL}/news/international`,
      lastModified: now,
      changeFrequency: "hourly",
      priority: 0.84,
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
    if (
      cluster.path.startsWith("/") &&
      !cluster.path.startsWith("/search")
    ) {
      hubPaths.add(cluster.path);
    }
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
      fetchSitemapGeneratedArticles(GENERATED_POOL_HARD_CAPS.sitemap),
      []
    );
    storyRoutes = pool.map((row) => ({
      url: `${SITE_URL}/story/${encodeURIComponent(row.slug)}`,
      lastModified: row.published_at
        ? new Date(row.published_at)
        : row.created_at
          ? new Date(row.created_at)
          : now,
      changeFrequency: "hourly" as const,
      priority: 0.85,
    }));
  } catch {
    try {
      const slugs = await withQueryTimeout(
        getGeneratedArticleSlugs(GENERATED_POOL_HARD_CAPS.slug),
        []
      );
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

export async function buildMainSitemap(): Promise<MetadataRoute.Sitemap> {
  const now = Date.now();
  if (sitemapCache && now - sitemapCache.at < SITEMAP_CACHE_TTL_MS) {
    return sitemapCache.value;
  }
  if (sitemapInflight) return sitemapInflight;

  sitemapInflight = buildMainSitemapUncached()
    .then((value) => {
      sitemapCache = { at: Date.now(), value };
      return value;
    })
    .finally(() => {
      sitemapInflight = null;
    });

  return sitemapInflight;
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
