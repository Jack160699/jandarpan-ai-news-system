import { unstable_cache } from "next/cache";
import { buildGeneratedHomepageFeed } from "@/lib/homepage/generated-feed";
import type { GeneratedHomepageFeed } from "@/lib/homepage/types";
import { INFRA_CONFIG } from "@/lib/infrastructure/config";
import { ISR_TAGS } from "@/lib/infrastructure/cache/isr";
import type { NewsroomLanguage } from "@/lib/i18n/languages";
import { getServerReaderLanguage } from "@/lib/i18n/server-language";
import { resolveLiveArticlePool } from "@/lib/news/live-feed";
import { logLiveFeed } from "@/lib/news/live-feed/logger";
import { snapshotFromFeed } from "@/lib/realtime/snapshot-utils";
import type { LiveHomepageSnapshot } from "@/lib/realtime/types";
import { buildTenantRegionalPersonalization } from "@/lib/tenant/personalization";
import { getTenantConfig } from "@/lib/tenant/resolve";
import type { TenantConfig } from "@/lib/tenant/types";

const LIVE_POOL_LIMIT = 120;

export type LiveHomepageSnapshotResult = {
  snapshot: LiveHomepageSnapshot | null;
  meta: {
    source: string;
    rateLimited: boolean;
    poolSize: number;
    staleAgeMs: number | null;
    ingestFirstSkippedWire: boolean;
    qualityRanked: boolean;
  };
};

async function buildLiveHomepageSnapshotUncached(
  tenant: TenantConfig,
  displayLanguage: NewsroomLanguage
): Promise<LiveHomepageSnapshotResult> {
  const { rows: pool, diagnostics } = await resolveLiveArticlePool(
    LIVE_POOL_LIMIT,
    { select: "homepage" }
  );

  logLiveFeed("live_snapshot", {
    source: diagnostics.source,
    poolSize: pool.length,
    rateLimited: diagnostics.rateLimited,
    staleAgeMs: diagnostics.staleAgeMs,
    ingestFirstSkippedWire: diagnostics.ingestFirstSkippedWire,
  });

  const personalization = buildTenantRegionalPersonalization(tenant);
  const feed = buildGeneratedHomepageFeed(pool, {
    personalization,
    displayLanguage,
  });

  if (!feed) {
    return {
      snapshot: null,
      meta: {
        source: diagnostics.source,
        rateLimited: diagnostics.rateLimited,
        poolSize: pool.length,
        staleAgeMs: diagnostics.staleAgeMs,
        ingestFirstSkippedWire: diagnostics.ingestFirstSkippedWire,
        qualityRanked: diagnostics.qualityRanked,
      },
    };
  }

  const enriched: GeneratedHomepageFeed = {
    ...feed,
    fetchedAt: new Date().toISOString(),
  };

  return {
    snapshot: snapshotFromFeed(enriched),
    meta: {
      source: diagnostics.source,
      rateLimited: diagnostics.rateLimited,
      poolSize: pool.length,
      staleAgeMs: diagnostics.staleAgeMs,
      ingestFirstSkippedWire: diagnostics.ingestFirstSkippedWire,
      qualityRanked: diagnostics.qualityRanked,
    },
  };
}

function getCachedLiveHomepageSnapshot(
  tenantSlug: string,
  displayLanguage: NewsroomLanguage
) {
  return unstable_cache(
    async (): Promise<LiveHomepageSnapshotResult> => {
      const tenant = await getTenantConfig();
      return buildLiveHomepageSnapshotUncached(tenant, displayLanguage);
    },
    ["live-homepage-snapshot-v1", tenantSlug, displayLanguage],
    {
      revalidate: INFRA_CONFIG.homepageCacheSeconds,
      tags: [
        ISR_TAGS.homepage,
        ISR_TAGS.homepageFeed,
        `tenant:${tenantSlug}`,
        `lang:${displayLanguage}`,
      ],
    }
  );
}

/** Server: build live polling snapshot from resolved article pool */
export async function buildLiveHomepageSnapshot(): Promise<LiveHomepageSnapshotResult> {
  const [tenant, displayLanguage] = await Promise.all([
    getTenantConfig(),
    getServerReaderLanguage(),
  ]);
  return getCachedLiveHomepageSnapshot(tenant.slug, displayLanguage)();
}
