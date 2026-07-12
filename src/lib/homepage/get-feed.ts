/**
 * Server homepage data — live pool resolver + ISR (never cache empty feeds)
 */

import { unstable_cache } from "next/cache";
import { INFRA_CONFIG } from "@/lib/infrastructure/config";
import {
  cacheGetJson,
  cacheSetJson,
} from "@/lib/infrastructure/cache";
import { buildHomepageFeedRedisKey } from "@/lib/infrastructure/cache/homepage-keys";
import { filterPoolByLanguage } from "@/lib/i18n/article-language";
import { scheduleMissingTranslations } from "@/lib/i18n/multilingual/ensure-translation";
import { buildGeneratedHomepageFeed } from "@/lib/homepage/generated-feed";
import { buildTrendingShortsFromPool } from "@/lib/homepage/shorts-feed";
import { ISR_TAGS } from "@/lib/infrastructure/cache/isr";
import { getServerReaderLanguage } from "@/lib/i18n/server-language";
import {
  resolveLiveArticlePool,
  writeFeedSegmentCaches,
  type LivePoolDiagnostics,
} from "@/lib/news/live-feed";
import { logLiveFeed, warnLiveFeed } from "@/lib/news/live-feed/logger";
import { getTenantConfig } from "@/lib/tenant/resolve";
import {
  buildRankingPersonalizationFromPrefs,
  getReaderPersonalizationPrefs,
  personalizationCacheSignature,
  type ReaderPersonalizationPrefs,
} from "@/lib/personalization/server-prefs";
import type { TenantConfig } from "@/lib/tenant/types";
import type { GeneratedArticleRow } from "@/lib/types/newsroom";
import type { GeneratedHomepageFeed } from "@/lib/homepage/types";
import { homeDebug } from "@/lib/homepage/feed-safety";
import type { NewsroomLanguage } from "@/lib/i18n/languages";

const HOMEPAGE_POOL_LIMIT = 120;

type HomepageFeedBuild = {
  feed: GeneratedHomepageFeed | null;
  diagnostics: LivePoolDiagnostics;
  freshWire: boolean;
};

async function buildFeedFromPool(
  pool: GeneratedArticleRow[],
  displayLanguage: NewsroomLanguage,
  tenant: TenantConfig,
  readerPrefs: ReaderPersonalizationPrefs
): Promise<GeneratedHomepageFeed | null> {
  scheduleMissingTranslations(pool, displayLanguage, { max: 12 });

  const langPool = filterPoolByLanguage(pool, displayLanguage);
  homeDebug("homepage language pool", {
    displayLanguage,
    total: pool.length,
    eligible: langPool.length,
  });

  if (!langPool.length) {
    warnLiveFeed("homepage_feed_no_language_match", {
      displayLanguage,
      poolSize: pool.length,
    });
    return null;
  }

  const personalization = buildRankingPersonalizationFromPrefs(
    readerPrefs,
    tenant
  );

  const feed = buildGeneratedHomepageFeed(langPool, {
    personalization,
    displayLanguage,
  });
  if (!feed) return null;

  const reservedIds = new Set([
    feed.editorsPicks.lead.id,
    ...feed.editorsPicks.supporting.map((a) => a.id),
    ...feed.breakingTicker.map((a) => a.id),
    ...feed.trending.map((a) => a.id),
    ...feed.liveWire.map((a) => a.id),
    ...feed.regionalHighlights.map((a) => a.id),
    ...feed.shorts.map((a) => a.id),
  ]);

  const newsShorts = buildTrendingShortsFromPool(langPool, 10, displayLanguage, {
    preferredArticleIds: feed.shorts.map((a) => a.id),
    reservedIds,
    maxHomepageOverlap: 1,
  });
  return { ...feed, newsShorts };
}

function isFreshWireSource(source: LivePoolDiagnostics["source"]): boolean {
  return source === "static_fallback" || source === "wire_api";
}

function getCachedHomepageFeedBuild(
  tenant: TenantConfig,
  displayLanguage: NewsroomLanguage,
  prefSignature: string,
  readerPrefs: ReaderPersonalizationPrefs
) {
  return unstable_cache(
    async (): Promise<HomepageFeedBuild> => {
      const { rows: pool, diagnostics } = await resolveLiveArticlePool(
        HOMEPAGE_POOL_LIMIT,
        { select: "homepage" }
      );

      if (!pool.length) {
        return {
          feed: null,
          diagnostics,
          freshWire: isFreshWireSource(diagnostics.source),
        };
      }

      const feed = await buildFeedFromPool(
        pool,
        displayLanguage,
        tenant,
        readerPrefs
      );
      return {
        feed,
        diagnostics,
        freshWire: isFreshWireSource(diagnostics.source),
      };
    },
    ["homepage-generated-feed-v10", tenant.slug, displayLanguage, prefSignature],
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
}

export async function getGeneratedHomepageFeed(): Promise<GeneratedHomepageFeed | null> {
  const tenant = await getTenantConfig();
  const displayLanguage = await getServerReaderLanguage(
    tenant.newsroom.defaultLanguage
  );
  const readerPrefs = await getReaderPersonalizationPrefs();
  const prefSignature = personalizationCacheSignature(readerPrefs);
  const cacheKey = `${buildHomepageFeedRedisKey(tenant.slug, displayLanguage)}:${prefSignature}`;

  const redisCached = await cacheGetJson<GeneratedHomepageFeed>(cacheKey);
  if (redisCached?.trending?.length) {
    logLiveFeed("homepage_feed_redis_hit", {
      tenant: tenant.slug,
      displayLanguage,
    });
    return redisCached;
  }

  const built = await getCachedHomepageFeedBuild(
    tenant,
    displayLanguage,
    prefSignature,
    readerPrefs
  )();

  logLiveFeed("homepage_feed_build", {
    source: built.diagnostics.source,
    poolSize: built.diagnostics.finalCount,
    rateLimited: built.diagnostics.rateLimited,
    tenant: tenant.slug,
    displayLanguage,
    isrHit: !built.freshWire,
  });

  if (!built.diagnostics.finalCount) {
    warnLiveFeed("homepage_feed_empty_pool");
    return null;
  }

  if (built.freshWire) {
    const { rows: pool } = await resolveLiveArticlePool(HOMEPAGE_POOL_LIMIT, {
      select: "homepage",
    });
    const feed = pool.length
      ? await buildFeedFromPool(pool, displayLanguage, tenant, readerPrefs)
      : null;
    if (feed) {
      feed.footerIntelligence = {
        ...feed.footerIntelligence,
        fetchedAt: new Date().toISOString(),
      };
      await writeFeedSegmentCaches(feed);
    }
    return feed;
  }

  const feed = built.feed;
  if (feed?.trending?.length) {
    await cacheSetJson(cacheKey, feed, INFRA_CONFIG.homepageCacheSeconds);
    await writeFeedSegmentCaches(feed);
  }

  return feed;
}
