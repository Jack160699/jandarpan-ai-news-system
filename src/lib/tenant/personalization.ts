import type { HomeSectionId } from "@/lib/homepage/types";
import type { RankingPersonalization } from "@/lib/news/ai/ranking";
import {
  buildRegionalRankingPersonalization,
  type RegionalReaderPrefs,
} from "@/lib/regional/personalization";
import type { TenantConfig } from "@/lib/tenant/types";

export function buildTenantRegionalPersonalization(
  tenant: TenantConfig,
  prefs?: RegionalReaderPrefs | null
): RankingPersonalization {
  const base = buildRegionalRankingPersonalization({
    ...prefs,
    regionBoostMultiplier:
      prefs?.regionBoostMultiplier ?? tenant.newsroom.regionalBoostMultiplier,
    preferChhattisgarh:
      prefs?.preferChhattisgarh ?? tenant.newsroom.regionalFirst,
  });

  const fromCategories = tenant.categories
    .filter((c) => c.sectionId)
    .map((c) => c.sectionId as HomeSectionId);

  const preferredSections = [
    ...new Set([...fromCategories, ...(base.preferredSections ?? [])]),
  ];

  return {
    ...base,
    preferredSections,
    regionBoostMultiplier: tenant.newsroom.regionalBoostMultiplier,
  };
}
