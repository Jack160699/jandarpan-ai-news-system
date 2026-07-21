/**
 * मेरा जिला content composition — exact district first, nearby only when insufficient.
 */

import type { HomeArticle } from "@/lib/homepage/types";
import { getDistrict } from "@/lib/regional/districts";
import {
  MERA_JILA_MIN_EXACT,
  MERA_JILA_NEARBY_FILL,
} from "./constants";
import {
  articleMatchesDistrict,
  articleMatchesNearby,
  isStatewideHomeArticle,
} from "./match";
import {
  rankDistrictStories,
  type DistrictLeadReason,
  type ScoredDistrictArticle,
} from "./lead-ranking";

export type MeraJilaItemKind = "exact" | "nearby" | "statewide" | "state_fallback";

export type MeraJilaItem = {
  article: HomeArticle;
  kind: MeraJilaItemKind;
  reason: DistrictLeadReason;
  /** Public-facing nearby label when kind === "nearby" */
  nearbyLabelHi: "आसपास की खबरें";
  nearbyLabelEn: "Nearby news";
};

export type MeraJilaComposition = {
  districtSlug: string;
  districtName: string;
  districtNameHi: string;
  lead: MeraJilaItem | null;
  exactStories: MeraJilaItem[];
  nearbyStories: MeraJilaItem[];
  statewideStories: MeraJilaItem[];
  /** Combined feed for UI rails — exact first, then labeled nearby */
  feed: MeraJilaItem[];
  exactCount: number;
  usedNearbyFallback: boolean;
  rankingAudit: ScoredDistrictArticle[];
};

function toItem(
  scored: ScoredDistrictArticle,
  kind: MeraJilaItemKind
): MeraJilaItem {
  return {
    article: scored.article,
    kind,
    reason: scored.reason,
    nearbyLabelHi: "आसपास की खबरें",
    nearbyLabelEn: "Nearby news",
  };
}

/**
 * Build मेरा जिला rails for selected district D.
 * Nearby (e.g. Rajnandgaon for Durg) never leads when exact inventory exists.
 */
export function composeMeraJila(
  articles: HomeArticle[],
  districtSlug: string,
  options?: {
    minExact?: number;
    nearbyFill?: number;
    nowMs?: number;
    maxFeed?: number;
  }
): MeraJilaComposition {
  const minExact = options?.minExact ?? MERA_JILA_MIN_EXACT;
  const nearbyFill = options?.nearbyFill ?? MERA_JILA_NEARBY_FILL;
  const maxFeed = options?.maxFeed ?? 12;
  const district = getDistrict(districtSlug);
  const slug = district?.slug ?? districtSlug;

  const exactPool = articles.filter((a) => articleMatchesDistrict(a, slug));
  const nearbyPool = articles.filter((a) => articleMatchesNearby(a, slug));
  const statewidePool = articles.filter(
    (a) =>
      isStatewideHomeArticle(a) &&
      !articleMatchesDistrict(a, slug) &&
      !articleMatchesNearby(a, slug)
  );

  const exactRanked = rankDistrictStories(exactPool, slug, {
    nowMs: options?.nowMs,
  });
  const nearbyRanked = rankDistrictStories(nearbyPool, slug, {
    nowMs: options?.nowMs,
  });
  const statewideRanked = rankDistrictStories(statewidePool, slug, {
    nowMs: options?.nowMs,
  });

  const exactStories = exactRanked.ranked.map((s) => toItem(s, "exact"));
  const usedNearbyFallback = exactStories.length < minExact;
  const nearbyStories = usedNearbyFallback
    ? nearbyRanked.ranked
        .slice(0, nearbyFill)
        .map((s) => toItem(s, "nearby"))
    : [];

  const statewideStories = statewideRanked.ranked
    .slice(0, 3)
    .map((s) => toItem(s, "statewide"));

  // Lead must be exact when available; never a nearby story merely for freshness
  let lead: MeraJilaItem | null = exactStories[0] ?? null;
  if (!lead && usedNearbyFallback && nearbyStories[0]) {
    lead = nearbyStories[0];
  } else if (!lead && statewideStories[0]) {
    lead = { ...statewideStories[0], kind: "statewide" };
  }

  const feed: MeraJilaItem[] = [];
  const seen = new Set<string>();
  const push = (item: MeraJilaItem | null | undefined) => {
    if (!item || seen.has(item.article.id)) return;
    if (feed.length >= maxFeed) return;
    seen.add(item.article.id);
    feed.push(item);
  };

  for (const s of exactStories) push(s);
  if (usedNearbyFallback) {
    for (const s of nearbyStories) push(s);
  }
  // State stories only as lower fallback when still short
  if (feed.length < minExact) {
    for (const s of statewideStories) push(s);
  }

  return {
    districtSlug: slug,
    districtName: district?.name ?? slug,
    districtNameHi: district?.nameHi ?? slug,
    lead,
    exactStories,
    nearbyStories,
    statewideStories,
    feed,
    exactCount: exactStories.length,
    usedNearbyFallback,
    rankingAudit: [
      ...exactRanked.ranked,
      ...(usedNearbyFallback ? nearbyRanked.ranked : []),
    ],
  };
}
