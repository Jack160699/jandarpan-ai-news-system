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
import { buildNewsShortsFromPool } from "@/lib/homepage/shorts-feed";
import { ISR_TAGS } from "@/lib/infrastructure/cache/isr";
import { getTenantConfig } from "@/lib/tenant/resolve";
import { buildTenantRegionalPersonalization } from "@/lib/tenant/personalization";
import type { GeneratedHomepageFeed } from "@/lib/homepage/types";

async function buildFeedForTenant(): Promise<GeneratedHomepageFeed | null> {
  const tenant = await getTenantConfig();
  const pool = await fetchGeneratedArticlePool(120);
  const personalization = buildTenantRegionalPersonalization(tenant);
  const feed = buildGeneratedHomepageFeed(pool, { personalization });
  if (!feed) return null;
  const newsShorts = buildNewsShortsFromPool(pool, 6);
  return { ...feed, newsShorts };
}

export async function getGeneratedHomepageFeed(): Promise<GeneratedHomepageFeed | null> {
  const tenant = await getTenantConfig();
  const cacheKey = `${CACHE_KEYS.homepageFeed}:${tenant.slug}`;

  const cached = await cacheGetJson<GeneratedHomepageFeed>(cacheKey);
  if (cached) return cached;

  const getCachedFeedInternal = unstable_cache(
    buildFeedForTenant,
    ["homepage-generated-feed-v3", tenant.slug],
    {
      revalidate: INFRA_CONFIG.homepageCacheSeconds,
      tags: [ISR_TAGS.homepage, ISR_TAGS.homepageFeed, `tenant:${tenant.slug}`],
    }
  );

  const feed = await getCachedFeedInternal();

  if (feed) {
    await cacheSetJson(cacheKey, feed, INFRA_CONFIG.homepageCacheSeconds);
  }

  return feed;
}
