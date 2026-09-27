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
import { checkStoryEditorialEligibility } from "@/lib/editorial/eligibility";

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
 * 1. Editorial Eligibility Gate:
 *    - Strict 30-day canonical window (published_at >= now - 30 days)
 *    - Rejection of generic meta/roundup stories ("आज की प्रमुख खबरें...", etc.)
 *    - Hard media quality gate (real verified media only)
 * 2. Category match (or all if category === 'all')
 * 3. Personalized Consumption Priority:
 *    - Unread / unheard stories FIRST
 *    - Already consumed stories at the BOTTOM
 * 4. District priority within each consumption tier:
 *    - Selected district matching stories FIRST
 *    - Broader Chhattisgarh statewide / desk stories SECOND
 *    - Other eligible broadcast stories THIRD
 * 5. Strict chronological ordering (published_at DESC) preserved in all groups.
 */
export function getPrioritizedStories(
  stories: BroadcastSegment[],
  categoryId: string,
  districtSlug?: string | null,
  consumedIds?: Set<string>
): BroadcastSegment[] {
  // 1. Editorial eligibility filter + category match
  const eligibleMatched = stories.filter((s) => {
    // Ads bypass standard news eligibility checks
    if ((s as any).isAd) return true;

    // Strict editorial eligibility: 30-day window, not a generic roundup, verified media
    const check = checkStoryEditorialEligibility(s);
    if (!check.eligible) return false;

    return matchesCanonicalCategory(s, categoryId);
  });

  if (eligibleMatched.length === 0) return [];

  const target = (districtSlug || "").trim().toLowerCase();
  const isTargetStatewide = !target || target === "all" || target === "statewide";

  const districtObj = !isTargetStatewide ? getDistrict(target) : null;
  const targetSlug = districtObj?.slug ?? target;
  const targetHi = districtObj?.nameHi ?? "";
  const targetEn = (districtObj?.name ?? target).toLowerCase();
  const aliases = (districtObj?.aliases ?? []).map((a) => a.toLowerCase());

  const isDistrictMatch = (s: BroadcastSegment) => {
    if (isTargetStatewide) return false;
    const segSlug = (s.districtSlug || "").trim().toLowerCase();
    if (segSlug && (segSlug === targetSlug || aliases.includes(segSlug))) {
      return true;
    }
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
    if (s.districtSlug) return false;
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

  const sortByFreshnessDesc = (arr: BroadcastSegment[]) => {
    return [...arr].sort((a, b) => {
      const tA = a.publishedAt ? new Date(a.publishedAt).getTime() : 0;
      const tB = b.publishedAt ? new Date(b.publishedAt).getTime() : 0;
      return tB - tA;
    });
  };

  // Helper to order a group by district priority -> statewide -> other (strictly chronological within tier)
  const orderTiered = (items: BroadcastSegment[]): BroadcastSegment[] => {
    if (isTargetStatewide) {
      return sortByFreshnessDesc(items);
    }
    const district: BroadcastSegment[] = [];
    const statewide: BroadcastSegment[] = [];
    const other: BroadcastSegment[] = [];

    for (const story of items) {
      if (isDistrictMatch(story)) {
        district.push(story);
      } else if (isStatewide(story)) {
        statewide.push(story);
      } else {
        other.push(story);
      }
    }

    return [
      ...sortByFreshnessDesc(district),
      ...sortByFreshnessDesc(statewide),
      ...sortByFreshnessDesc(other),
    ];
  };

  // Partition by personalized consumption state if provided
  if (consumedIds && consumedIds.size > 0) {
    const unconsumed: BroadcastSegment[] = [];
    const consumed: BroadcastSegment[] = [];

    for (const s of eligibleMatched) {
      if (consumedIds.has(s.id)) {
        consumed.push(s);
      } else {
        unconsumed.push(s);
      }
    }

    return [...orderTiered(unconsumed), ...orderTiered(consumed)];
  }

  return orderTiered(eligibleMatched);
}

