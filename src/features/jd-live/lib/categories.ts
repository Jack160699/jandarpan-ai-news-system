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
import { getDistrict } from "@/lib/regional/districts";
import { isWithinCanonicalReaderWindow } from "@/lib/news/canonical-window";

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

  if (!isExplicitDistrict) {
    return true;
  }

  const target = districtSlug.trim().toLowerCase();
  const districtObj = getDistrict(target);
  const targetSlug = districtObj?.slug ?? target;
  const targetHi = districtObj?.nameHi ?? "";
  const targetEn = (districtObj?.name ?? target).toLowerCase();
  const aliases = (districtObj?.aliases ?? []).map((a) => a.toLowerCase());

  // 1. Direct canonical slug match
  const segSlug = (seg.districtSlug || "").trim().toLowerCase();
  if (segSlug && (segSlug === targetSlug || aliases.includes(segSlug))) {
    return true;
  }

  // 2. Hindi & English district label exact matching
  const rawHi = (seg.districtHi || "").trim();
  if (targetHi && rawHi === targetHi) {
    return true;
  }

  const rawEn = (seg.districtEn || "").trim().toLowerCase();
  if (targetEn && rawEn === targetEn) {
    return true;
  }

  // If story has no specific district or is statewide, allow it in general view
  if (!seg.districtSlug && (seg.geographicScope === "statewide" || !seg.district)) {
    return true;
  }

  return false;
}

/**
 * Prioritizes and filters stories by:
 * 1. Category match (or all if category === 'all')
 * 2. District priority:
 *    - Selected district matching stories FIRST (using canonical district identity)
 *    - Broader Chhattisgarh statewide / desk stories SECOND
 *    - Other eligible broadcast stories THIRD (so queue never starves)
 */
export function getPrioritizedStories(
  stories: BroadcastSegment[],
  categoryId: string,
  districtSlug?: string | null
): BroadcastSegment[] {
  // 1. Filter by category and canonical 30-day window
  const categoryMatched = stories.filter(
    (s) => isWithinCanonicalReaderWindow(s.publishedAt) && matchesCanonicalCategory(s, categoryId)
  );
  if (categoryMatched.length === 0) return [];

  const target = (districtSlug || "").trim().toLowerCase();
  if (!target || target === "all" || target === "statewide") {
    return categoryMatched;
  }

  const districtObj = getDistrict(target);
  const targetSlug = districtObj?.slug ?? target;
  const targetHi = districtObj?.nameHi ?? "";
  const targetEn = (districtObj?.name ?? target).toLowerCase();
  const aliases = (districtObj?.aliases ?? []).map((a) => a.toLowerCase());

  const isDistrictMatch = (s: BroadcastSegment) => {
    // 1. Direct canonical slug match
    const segSlug = (s.districtSlug || "").trim().toLowerCase();
    if (segSlug && (segSlug === targetSlug || aliases.includes(segSlug))) {
      return true;
    }

    // 2. Exact match on official district names
    const rawHi = (s.districtHi || "").trim();
    if (targetHi && rawHi === targetHi) {
      return true;
    }

    const rawEn = (s.districtEn || "").trim().toLowerCase();
    if (targetEn && rawEn === targetEn) {
      return true;
    }

    return false;
  };

  const isStatewide = (s: BroadcastSegment) => {
    if (s.geographicScope === "statewide") return true;
    if (s.districtSlug) return false; // Story belongs to a specific district, never classify as generic statewide!
    const raw = `${s.district || ""} ${s.districtHi || ""}`.toLowerCase();
    return (
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
