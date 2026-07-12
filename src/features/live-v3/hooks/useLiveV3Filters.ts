"use client";

import { useCallback, useMemo, useState } from "react";
import {
  assignFeaturedDistrictSlug,
  filterArticlesByDistrict,
  type FeaturedDistrictSlug,
} from "@/lib/homepage/district-filter";
import type { HomeArticle } from "@/lib/homepage/types";
import type {
  LiveV3EventGroup,
  LiveV3FilterState,
  LiveV3Scope,
  LiveV3TimelineEntry,
  LiveV3ViewMode,
} from "../types";

function mergeLiveWireItems(
  primary: HomeArticle[],
  extra: HomeArticle[] = []
): HomeArticle[] {
  const seen = new Set<string>();
  const out: HomeArticle[] = [];
  for (const item of [...primary, ...extra]) {
    if (seen.has(item.id)) continue;
    seen.add(item.id);
    out.push(item);
  }
  return out.sort(
    (a, b) =>
      new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
  );
}

function matchesScope(article: HomeArticle, scope: LiveV3Scope): boolean {
  if (scope === "all") return true;
  if (scope === "breaking") return article.ranking.isBreaking;
  return article.isLive || article.ranking.isBreaking;
}

export function groupLiveEvents(items: HomeArticle[]): LiveV3EventGroup[] {
  const groups = new Map<string, HomeArticle[]>();

  for (const item of items) {
    const clusterId = item.ranking.duplicateClusterId;
    const key = clusterId ?? `solo-${item.id}`;
    const bucket = groups.get(key);
    if (bucket) bucket.push(item);
    else groups.set(key, [item]);
  }

  return [...groups.entries()]
    .map(([id, groupItems]) => {
      const sorted = [...groupItems].sort(
        (a, b) =>
          new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
      );
      const lead = sorted[0];
      return {
        id,
        title: lead.headline,
        items: sorted,
        isBreaking: sorted.some((a) => a.ranking.isBreaking),
        isLive: sorted.some((a) => a.isLive),
        latestAt: lead.publishedAt,
        updateCount: sorted.length,
      };
    })
    .sort(
      (a, b) =>
        new Date(b.latestAt).getTime() - new Date(a.latestAt).getTime()
    );
}

export function buildTimelineEntries(
  groups: LiveV3EventGroup[]
): LiveV3TimelineEntry[] {
  const entries: LiveV3TimelineEntry[] = [];
  for (const group of groups) {
    for (const item of group.items) {
      entries.push({
        id: item.id,
        timestamp: item.publishedAt,
        headline: item.headline,
        slug: item.slug,
        isLive: item.isLive,
        isBreaking: item.ranking.isBreaking,
        groupId: group.id,
      });
    }
  }
  return entries.sort(
    (a, b) =>
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );
}

type UseLiveV3FiltersOptions = {
  liveWire: HomeArticle[];
  breakingTicker: HomeArticle[];
};

export function useLiveV3Filters({
  liveWire,
  breakingTicker,
}: UseLiveV3FiltersOptions) {
  const [scope, setScope] = useState<LiveV3Scope>("all");
  const [district, setDistrict] = useState<FeaturedDistrictSlug | null>(null);
  const [viewMode, setViewMode] = useState<LiveV3ViewMode>("feed");

  const allItems = useMemo(
    () => mergeLiveWireItems(liveWire, breakingTicker),
    [liveWire, breakingTicker]
  );

  const filteredItems = useMemo(() => {
    let items = allItems.filter((item) => matchesScope(item, scope));
    if (district) {
      items = filterArticlesByDistrict(items, district);
    }
    return items;
  }, [allItems, scope, district]);

  const eventGroups = useMemo(
    () => groupLiveEvents(filteredItems),
    [filteredItems]
  );

  const timeline = useMemo(
    () => buildTimelineEntries(eventGroups),
    [eventGroups]
  );

  const breakingItems = useMemo(
    () => allItems.filter((item) => item.ranking.isBreaking).slice(0, 3),
    [allItems]
  );

  const liveCount = useMemo(
    () =>
      filteredItems.filter((item) => item.isLive || item.ranking.isBreaking)
        .length,
    [filteredItems]
  );

  const districtCounts = useMemo(() => {
    const counts = new Map<FeaturedDistrictSlug, number>();
    for (const item of allItems) {
      const slug = assignFeaturedDistrictSlug(item);
      counts.set(slug, (counts.get(slug) ?? 0) + 1);
    }
    return counts;
  }, [allItems]);

  const setFilter = useCallback((patch: Partial<LiveV3FilterState>) => {
    if (patch.scope !== undefined) setScope(patch.scope);
    if (patch.district !== undefined) setDistrict(patch.district);
    if (patch.viewMode !== undefined) setViewMode(patch.viewMode);
  }, []);

  return {
    scope,
    district,
    viewMode,
    allItems,
    filteredItems,
    eventGroups,
    timeline,
    breakingItems,
    liveCount,
    districtCounts,
    setScope,
    setDistrict,
    setViewMode,
    setFilter,
  };
}
