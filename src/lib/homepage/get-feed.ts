/**
 * Server homepage data — live pool resolver + ISR (never cache empty feeds)
 */

import { unstable_cache } from "next/cache";
import { INFRA_CONFIG } from "@/lib/infrastructure/config";
import {
  cacheGetJson,
  cacheSetJson,
  CACHE_KEYS,
} from "@/lib/infrastructure/cache";
import { buildGeneratedHomepageFeed } from "@/lib/homepage/generated-feed";
import { buildTrendingShortsFromPool } from "@/lib/homepage/shorts-feed";
import { ISR_TAGS } from "@/lib/infrastructure/cache/isr";
import { getServerReaderLanguage } from "@/lib/i18n/server-language";
import {
  resolveLiveArticlePool,
  writeFeedSegmentCaches,
} from "@/lib/news/live-feed";
import { logLiveFeed, warnLiveFeed } from "@/lib/news/live-feed/logger";
import { getTenantConfig } from "@/lib/tenant/resolve";
import { getServerPreferredSections } from "@/lib/super-menu/server-interests";
import { buildTenantRegionalPersonalization } from "@/lib/tenant/personalization";
import type { GeneratedArticleRow } from "@/lib/types/newsroom";
import type { GeneratedHomepageFeed } from "@/lib/homepage/types";

async function buildFeedFromPool(
  pool: GeneratedArticleRow[],
  displayLanguage: Awaited<ReturnType<typeof getServerReaderLanguage>>
): Promise<GeneratedHomepageFeed | null> {
  const tenant = await getTenantConfig();
  const interestSections = await getServerPreferredSections();
  const personalization = buildTenantRegionalPersonalization(tenant);
  if (interestSections.length) {
    personalization.preferredSections = [
      ...new Set([
        ...interestSections,
        ...(personalization.preferredSections ?? []),
      ]),
    ];
  }
  const feed = buildGeneratedHomepageFeed(pool, {
    personalization,
    displayLanguage,
  });
  if (!feed) return null;
  const newsShorts = buildTrendingShortsFromPool(pool, 10, displayLanguage);
  return { ...feed, newsShorts };
}

export async function getGeneratedHomepageFeed(): Promise<GeneratedHomepageFeed | null> {
  const tenant = await getTenantConfig();
  const displayLanguage = await getServerReaderLanguage();
  const cacheKey = `${CACHE_KEYS.homepageFeed}:${tenant.slug}:${displayLanguage}`;

  const { rows: pool, diagnostics } = await resolveLiveArticlePool(120);

  logLiveFeed("homepage_feed_build", {
    source: diagnostics.source,
    poolSize: pool.length,
    rateLimited: diagnostics.rateLimited,
    tenant: tenant.slug,
  });

  if (!pool.length) {
    warnLiveFeed("homepage_feed_empty_pool");
    return null;
  }

  // Static/wire fallback — always fresh, never ISR-cache empty state
  if (
    diagnostics.source === "static_fallback" ||
    diagnostics.source === "wire_api"
  ) {
    const feed = await buildFeedFromPool(pool, displayLanguage);
    if (feed) {
      feed.footerIntelligence = {
        ...feed.footerIntelligence,
        fetchedAt: new Date().toISOString(),
      };
      await writeFeedSegmentCaches(feed);
    }
    return feed;
  }

  const cached = await cacheGetJson<GeneratedHomepageFeed>(cacheKey);
  if (cached && cached.trending?.length) return cached;

  const getCachedFeedInternal = unstable_cache(
    async () => {
      const { rows: freshPool } = await resolveLiveArticlePool(120);
      return buildFeedFromPool(freshPool, displayLanguage);
    },
    ["homepage-generated-feed-v5", tenant.slug, displayLanguage],
    {
      revalidate: INFRA_CONFIG.homepageCacheSeconds,
      tags: [
        ISR_TAGS.homepage,
        ISR_TAGS.homepageFeed,
        `tenant:${tenant.slug}`,
        `lang:${displayLanguage}`,
      ],
    }
  );

  const feed = (await getCachedFeedInternal()) ?? (await buildFeedFromPool(pool, displayLanguage));

  if (feed?.trending?.length) {
    await cacheSetJson(cacheKey, feed, INFRA_CONFIG.homepageCacheSeconds);
    await writeFeedSegmentCaches(feed);
  }

  return feed;
}
