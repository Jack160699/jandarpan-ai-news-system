import { buildGeneratedHomepageFeed } from "@/lib/homepage/generated-feed";
import type { GeneratedHomepageFeed } from "@/lib/homepage/types";
import { fetchGeneratedArticlePool } from "@/lib/newsroom/generated/read";
import { buildTenantRegionalPersonalization } from "@/lib/tenant/personalization";
import { getTenantConfig } from "@/lib/tenant/resolve";
import { getServerReaderLanguage } from "@/lib/i18n/server-language";
import { snapshotFromFeed } from "@/lib/realtime/snapshot-utils";
import type { LiveHomepageSnapshot } from "@/lib/realtime/types";

/** Server: build live polling snapshot from article pool */
export async function buildLiveHomepageSnapshot(): Promise<LiveHomepageSnapshot | null> {
  const [tenant, displayLanguage] = await Promise.all([
    getTenantConfig(),
    getServerReaderLanguage(),
  ]);
  const pool = await fetchGeneratedArticlePool(120);
  const personalization = buildTenantRegionalPersonalization(tenant);
  const feed = buildGeneratedHomepageFeed(pool, {
    personalization,
    displayLanguage,
  });
  if (!feed) return null;

  return snapshotFromFeed({
    ...feed,
    fetchedAt: new Date().toISOString(),
  });
}
