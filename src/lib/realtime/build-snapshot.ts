import { buildGeneratedHomepageFeed } from "@/lib/homepage/generated-feed";
import type { GeneratedHomepageFeed } from "@/lib/homepage/types";
import { resolveLiveArticlePool } from "@/lib/news/live-feed";
import { logLiveFeed } from "@/lib/news/live-feed/logger";
import { buildTenantRegionalPersonalization } from "@/lib/tenant/personalization";
import { getTenantConfig } from "@/lib/tenant/resolve";
import { getServerReaderLanguage } from "@/lib/i18n/server-language";
import { snapshotFromFeed } from "@/lib/realtime/snapshot-utils";
import type { LiveHomepageSnapshot } from "@/lib/realtime/types";

/** Server: build live polling snapshot from resolved article pool */
export async function buildLiveHomepageSnapshot(): Promise<{
  snapshot: LiveHomepageSnapshot | null;
  meta: {
    source: string;
    rateLimited: boolean;
    poolSize: number;
    staleAgeMs: number | null;
    ingestFirstSkippedWire: boolean;
    qualityRanked: boolean;
  };
}> {
  const [tenant, displayLanguage, { rows: pool, diagnostics }] = await Promise.all([
    getTenantConfig(),
    getServerReaderLanguage(),
    resolveLiveArticlePool(120),
  ]);

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
