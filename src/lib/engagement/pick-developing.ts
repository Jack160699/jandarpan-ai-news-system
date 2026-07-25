/**
 * Pick a developing-story teaser from homepage feed + continuing coverage signals.
 * Prefer live/breaking with event clustering hints; never invent hubs.
 */

import type { GeneratedHomepageFeed, HomeArticle } from "@/lib/homepage/types";
import { articleMatchesDistrict } from "@/lib/district-intelligence/match";

export type DevelopingStoryTeaser = {
  slug: string;
  headline: string;
  summary?: string;
  publishedAt?: string;
  imageUrl?: string | null;
  updateHintHi: string;
  updateHintEn: string;
  districtBoosted: boolean;
};

function isDevelopingCandidate(a: HomeArticle): boolean {
  if (a.isLive) return true;
  if (a.ranking?.isBreaking) return true;
  const blob = `${a.headline} ${a.summary ?? ""}`;
  return /\b(अपडेट|update|ongoing|जारी|live|लाइव|developing)\b/i.test(blob);
}

export function pickDevelopingStory(
  feed: GeneratedHomepageFeed,
  opts: {
    districtSlug?: string | null;
    excludeSlugs?: Set<string>;
  } = {}
): DevelopingStoryTeaser | null {
  const exclude = opts.excludeSlugs ?? new Set<string>();
  const districtSlug = opts.districtSlug?.trim().toLowerCase() || null;
  const pool = [
    ...(feed.breakingTicker ?? []),
    ...(feed.liveWire ?? []),
    ...(feed.trending ?? []),
    ...(feed.regionalHighlights ?? []),
    feed.editorsPicks?.lead,
    ...(feed.editorsPicks?.supporting ?? []),
  ].filter((a): a is HomeArticle => Boolean(a?.slug && a.headline?.trim()));

  const candidates = pool
    .filter((a) => !exclude.has(a.slug) && isDevelopingCandidate(a))
    .map((a) => {
      let score = a.priorityScore || 0;
      if (a.isLive) score += 50;
      if (a.ranking?.isBreaking) score += 40;
      if (districtSlug && articleMatchesDistrict(a, districtSlug)) score += 30;
      return { a, score };
    })
    .sort((x, y) => y.score - x.score);

  const top = candidates[0]?.a;
  if (!top) return null;

  return {
    slug: top.slug,
    headline: top.headline,
    summary: top.summary,
    publishedAt: top.publishedAt,
    imageUrl: top.imageUrl,
    updateHintHi: top.isLive ? "लाइव अपडेट" : "डेवलपिंग स्टोरी",
    updateHintEn: top.isLive ? "Live updates" : "Developing story",
    districtBoosted: Boolean(
      districtSlug && articleMatchesDistrict(top, districtSlug)
    ),
  };
}
