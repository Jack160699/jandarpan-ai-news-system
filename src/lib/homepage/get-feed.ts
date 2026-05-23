/**
 * Server homepage data — ISR + optional Redis layer (tenant-scoped)
 */

import { unstable_cache } from "next/cache";
import { INFRA_CONFIG } from "@/lib/infrastructure/config";
import {
  cacheGetJson,
  cacheSetJson,
  CACHE_KEYS,
} from "@/lib/infrastructure/cache";
import { fetchGeneratedArticlePool } from "@/lib/newsroom/generated/read";
import { buildGeneratedHomepageFeed } from "@/lib/homepage/generated-feed";
import { buildTrendingShortsFromPool } from "@/lib/homepage/shorts-feed";
import { ISR_TAGS } from "@/lib/infrastructure/cache/isr";
import { getServerReaderLanguage } from "@/lib/i18n/server-language";
import { getTenantConfig } from "@/lib/tenant/resolve";
import { buildTenantRegionalPersonalization } from "@/lib/tenant/personalization";
import type { GeneratedHomepageFeed } from "@/lib/homepage/types";

async function buildFeedForTenant(
  displayLanguage: Awaited<ReturnType<typeof getServerReaderLanguage>>
): Promise<GeneratedHomepageFeed | null> {
  const tenant = await getTenantConfig();
  const pool = await fetchGeneratedArticlePool(120);
  const personalization = buildTenantRegionalPersonalization(tenant);
  const feed = buildGeneratedHomepageFeed(pool, {
    personalization,
    displayLanguage,
  });
  if (!feed) return null;
  const newsShorts = buildTrendingShortsFromPool(pool, 10);
  return { ...feed, newsShorts };
}

export async function getGeneratedHomepageFeed(): Promise<GeneratedHomepageFeed | null> {
  const tenant = await getTenantConfig();
  const displayLanguage = await getServerReaderLanguage();
  const cacheKey = `${CACHE_KEYS.homepageFeed}:${tenant.slug}:${displayLanguage}`;

  const cached = await cacheGetJson<GeneratedHomepageFeed>(cacheKey);
  if (cached) return cached;

  const getCachedFeedInternal = unstable_cache(
    () => buildFeedForTenant(displayLanguage),
    ["homepage-generated-feed-v4", tenant.slug, displayLanguage],
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

  const feed = await getCachedFeedInternal();

  if (feed) {
    await cacheSetJson(cacheKey, feed, INFRA_CONFIG.homepageCacheSeconds);
  }

  return feed;
}
