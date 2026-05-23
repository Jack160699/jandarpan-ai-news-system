/**
 * Regional personalization — maps reader district prefs to homepage ranking
 */

import type { HomeSectionId } from "@/lib/homepage/types";
import type { RankingPersonalization } from "@/lib/news/ai/ranking";
import { getDistrict } from "@/lib/regional/districts";

export type RegionalReaderPrefs = {
  homeDistrict?: string | null;
  preferChhattisgarh?: boolean;
  regionBoostMultiplier?: number;
};

const DISTRICT_TO_SECTION: Record<string, HomeSectionId> = {
  raipur: "raipur",
};

/** Default newsroom policy: Chhattisgarh-first */
export const DEFAULT_REGIONAL_PREFS: RegionalReaderPrefs = {
  preferChhattisgarh: true,
  regionBoostMultiplier: 1.15,
};

export function buildRegionalRankingPersonalization(
  prefs?: RegionalReaderPrefs | null
): RankingPersonalization {
  const merged = { ...DEFAULT_REGIONAL_PREFS, ...prefs };
  const preferredSections: HomeSectionId[] = ["chhattisgarh", "raipur"];

  if (merged.homeDistrict) {
    const section = DISTRICT_TO_SECTION[merged.homeDistrict];
    if (section && !preferredSections.includes(section)) {
      preferredSections.unshift(section);
    }
  }

  return {
    preferredSections,
    regionBoostMultiplier: merged.regionBoostMultiplier ?? 1.15,
    homeDistrict: merged.homeDistrict ?? null,
    boostSlugs: [],
  };
}

export function parseRegionalPrefsFromQuery(
  searchParams: URLSearchParams
): RegionalReaderPrefs {
  const district = searchParams.get("district")?.trim().toLowerCase();
  if (!district || !getDistrict(district)) {
    return DEFAULT_REGIONAL_PREFS;
  }
  return {
    ...DEFAULT_REGIONAL_PREFS,
    homeDistrict: district,
    regionBoostMultiplier: 1.25,
  };
}
