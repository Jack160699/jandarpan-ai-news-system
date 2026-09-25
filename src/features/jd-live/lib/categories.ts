import type { BroadcastSegment } from "../types";

export type CanonicalCategory = {
  id: string;
  labelHi: string;
  labelEn: string;
};

export const CANONICAL_CATEGORIES: CanonicalCategory[] = [
  { id: "all", labelHi: "सभी", labelEn: "All" },
  { id: "crime", labelHi: "क्राइम", labelEn: "Crime" },
  { id: "politics", labelHi: "राजनीति", labelEn: "Politics" },
  { id: "national", labelHi: "राष्ट्रीय", labelEn: "National" },
  { id: "chhattisgarh", labelHi: "छत्तीसगढ़", labelEn: "Chhattisgarh" },
  { id: "business", labelHi: "बाज़ार", labelEn: "Market" },
  { id: "governance", labelHi: "प्रशासन", labelEn: "Governance" },
];

import {
  resolveCanonicalCategories,
  type CanonicalCategoryId,
} from "@/lib/editorial/canonical-categories";

/**
 * Filter stories strictly by canonical category metadata.
 * Uses resolved canonical multi-tags (deterministic & auditable).
 */
export function matchesCanonicalCategory(
  seg: BroadcastSegment,
  categoryId: string
): boolean {
  if (!categoryId || categoryId === "all") return true;

  // 1. Direct canonical tag match if available
  if (seg.canonicalCategories && seg.canonicalCategories.length > 0) {
    return seg.canonicalCategories.includes(categoryId);
  }

  // 2. Resolve on-demand using canonical taxonomy engine
  const resolved = resolveCanonicalCategories({
    headline: seg.headline,
    summary: seg.summary,
    body: seg.script,
    section: seg.section,
    district: seg.district,
    categoryLabel: seg.categoryLabel,
  });

  return resolved.categories.includes(categoryId as CanonicalCategoryId);
}

/**
 * Preserves district scoping when viewing an explicit district context.
 * Does not inject unrelated district stories when a user has specifically locked a district.
 * If district choice is not explicitly locked (or statewide), all stories in the live broadcast
 * pool are eligible to display so the news list stays in sync with live TV playback.
 */
export function matchesDistrictScope(
  seg: BroadcastSegment,
  districtSlug?: string | null,
  isExplicitDistrict = false
): boolean {
  if (!districtSlug || districtSlug === "all" || districtSlug === "statewide") {
    return true;
  }

  // If the user has not explicitly locked a district, do not artificially exclude
  // verified live stories from other CG districts in the general live broadcast pool.
  if (!isExplicitDistrict) {
    return true;
  }

  const rawDist = (seg.district || seg.districtHi || "").toLowerCase();
  const target = districtSlug.toLowerCase();

  // If story has no specific district or is statewide, allow it
  if (
    !rawDist ||
    rawDist.includes("राज्य") ||
    rawDist.includes("state") ||
    rawDist.includes("छत्तीसगढ़") ||
    rawDist.includes("chhattisgarh")
  ) {
    return true;
  }

  // If story has a specific district, it must match the active district context
  return rawDist.includes(target);
}

/**
 * Prioritizes and filters stories by:
 * 1. Category match (or all if category === 'all')
 * 2. District priority:
 *    - Selected district matching stories FIRST
 *    - Broader Chhattisgarh statewide / desk stories SECOND
 *    - Other eligible broadcast stories THIRD (so queue never starves)
 */
export function getPrioritizedStories(
  stories: BroadcastSegment[],
  categoryId: string,
  districtSlug?: string | null
): BroadcastSegment[] {
  // 1. Filter by category
  const categoryMatched = stories.filter((s) => matchesCanonicalCategory(s, categoryId));
  if (categoryMatched.length === 0) return [];

  const target = (districtSlug || "").trim().toLowerCase();
  if (!target || target === "all" || target === "statewide") {
    return categoryMatched;
  }

  const isDistrictMatch = (s: BroadcastSegment) => {
    const raw = `${s.district || ""} ${s.districtHi || ""} ${(s as any).districtSlug || ""}`.toLowerCase();
    return raw.includes(target);
  };

  const isStatewide = (s: BroadcastSegment) => {
    const raw = `${s.district || ""} ${s.districtHi || ""}`.toLowerCase();
    return (
      !raw ||
      raw.includes("राज्य") ||
      raw.includes("state") ||
      raw.includes("छत्तीसगढ़") ||
      raw.includes("chhattisgarh") ||
      raw.includes("desk") ||
      raw.includes("डेस्क")
    );
  };

  const districtStories: BroadcastSegment[] = [];
  const statewideStories: BroadcastSegment[] = [];
  const otherStories: BroadcastSegment[] = [];

  for (const story of categoryMatched) {
    if (isDistrictMatch(story)) {
      districtStories.push(story);
    } else if (isStatewide(story)) {
      statewideStories.push(story);
    } else {
      otherStories.push(story);
    }
  }

  const sortByFreshnessDesc = (arr: BroadcastSegment[]) => {
    return [...arr].sort((a, b) => {
      const tA = a.publishedAt ? new Date(a.publishedAt).getTime() : 0;
      const tB = b.publishedAt ? new Date(b.publishedAt).getTime() : 0;
      return tB - tA;
    });
  };

  // Selected District -> matching stories first -> then broader statewide stories -> then other stories
  // Freshness preserved within each tier
  return [
    ...sortByFreshnessDesc(districtStories),
    ...sortByFreshnessDesc(statewideStories),
    ...sortByFreshnessDesc(otherStories),
  ];
}
