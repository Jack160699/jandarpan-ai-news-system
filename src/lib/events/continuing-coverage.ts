/**
 * Continuing-coverage view model — chronological multi-story event timeline.
 * Restores event-cluster chronology for Reader DS article pages.
 *
 * Safety rules:
 * - Only group by explicit event_id (never category/district alone)
 * - Hide timeline when cluster has fewer than 2 published stories
 * - Prefer reliable event_at; otherwise fall back to published_at
 * - Deduplicate near-identical headlines
 * - Do not invent upcoming/unknown events
 */

import type { EventViewModel } from "@/lib/events/event-view-model";
import type { EventClusterArticle } from "@/lib/events/fetch-event-cluster-articles";
import { logNewsroom } from "@/lib/newsroom/logger";
import type { RegionalGeoMetadata } from "@/lib/regional/geo-tagging";
import { getDistrict } from "@/lib/regional/districts";

/** Visible window before collapsing older items. */
export const CONTINUING_COVERAGE_VISIBLE_LIMIT = 5;

export type StoryCoverageUpdateType =
  | "breaking"
  | "update"
  | "ongoing"
  | "full"
  | "analysis"
  | "background"
  | "resolved";

/** Hindi status labels — only applied when evidence supports them. */
export const STORY_STATUS_LABEL_HI: Record<StoryCoverageUpdateType, string> = {
  breaking: "ब्रेकिंग",
  update: "अपडेट",
  ongoing: "जारी",
  full: "पूरी खबर",
  analysis: "विश्लेषण",
  background: "पृष्ठभूमि",
  resolved: "समाधान",
};

export const STORY_STATUS_LABEL_EN: Record<StoryCoverageUpdateType, string> = {
  breaking: "Breaking",
  update: "Update",
  ongoing: "Ongoing",
  full: "Full report",
  analysis: "Analysis",
  background: "Background",
  resolved: "Resolved",
};

export type ContinuingCoverageItem = {
  id: string;
  storyId: string;
  slug: string;
  headline: string;
  summary: string | null;
  publishedAt: string;
  eventAt: string | null;
  /** Deterministic sort key (eventAt when reliable, else publishedAt). */
  sortAt: string;
  usedEventTime: boolean;
  updateType: StoryCoverageUpdateType;
  statusLabelHi: string;
  statusLabelEn: string;
  district: string | null;
  districtSlug: string | null;
  category: string | null;
  sourceConfidence: number | null;
  isCurrent: boolean;
  isLatest: boolean;
  href: string;
  whatChanged: string | null;
};

export type ContinuingCoverageNav = {
  previous: ContinuingCoverageItem | null;
  next: ContinuingCoverageItem | null;
  latest: ContinuingCoverageItem | null;
  overviewHref: string | null;
  districtHref: string | null;
  categoryHref: string | null;
};

export type ContinuingCoverageVm = {
  eventId: string;
  eventTitle: string;
  clusterStatus: "ongoing" | "resolved" | "unknown";
  showTimeline: boolean;
  items: ContinuingCoverageItem[];
  /** Chronological items shown without expanding older collapse. */
  visibleItems: ContinuingCoverageItem[];
  /** Older items collapsed behind “N पुराने अपडेट”. */
  collapsedItems: ContinuingCoverageItem[];
  collapsedCount: number;
  currentId: string | null;
  latestId: string | null;
  nav: ContinuingCoverageNav;
};

export type BuildContinuingCoverageInput = {
  eventId: string | null | undefined;
  eventTitle?: string | null;
  eventViewModel?: EventViewModel | null;
  articles: EventClusterArticle[];
  currentSlug: string;
  currentStoryId?: string | null;
  /** Max visible items before collapsing older ones. */
  visibleLimit?: number;
};

function normalizeHeadline(value: string): string {
  return value
    .trim()
    .toLowerCase()
    // Keep letters, marks (matras), and numbers — stripping \p{M} breaks Hindi words.
    .replace(/[^\p{L}\p{M}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ");
}

function tokenizeHeadline(value: string): string[] {
  return normalizeHeadline(value)
    .split(" ")
    .filter((t) => t.length > 1 || /^\d+$/.test(t));
}

function headlineSimilarity(a: string, b: string): number {
  const left = normalizeHeadline(a);
  const right = normalizeHeadline(b);
  if (!left || !right) return 0;
  if (left === right) return 1;

  const leftTokens = tokenizeHeadline(a);
  const rightTokens = tokenizeHeadline(b);
  if (!leftTokens.length || !rightTokens.length) return 0;

  const leftSet = new Set(leftTokens);
  let overlap = 0;
  for (const token of rightTokens) {
    if (leftSet.has(token)) overlap += 1;
  }
  const score = overlap / Math.max(leftSet.size, rightTokens.length);
  const lengthRatio =
    Math.min(left.length, right.length) / Math.max(left.length, right.length);
  if (lengthRatio < 0.85) return Math.min(score, 0.8);
  return score;
}

function isNearDuplicateHeadline(a: string, b: string): boolean {
  const left = normalizeHeadline(a);
  const right = normalizeHeadline(b);
  if (left === right) return true;
  return headlineSimilarity(a, b) >= 0.92;
}

function parseReliableEventAt(
  meta: EventClusterArticle["editorial_metadata"]
): string | null {
  const raw = meta as Record<string, unknown>;
  const candidates = [raw.event_at, raw.occurred_at, raw.eventAt, raw.occurredAt];
  for (const value of candidates) {
    if (typeof value !== "string" || !value.trim()) continue;
    const ms = new Date(value).getTime();
    if (!Number.isNaN(ms)) return new Date(ms).toISOString();
  }
  return null;
}

function resolveDistrict(article: EventClusterArticle): {
  label: string | null;
  slug: string | null;
} {
  const geo = article.geo_metadata as RegionalGeoMetadata | undefined;
  const regional = article.editorial_metadata?.regional as
    | RegionalGeoMetadata
    | undefined;
  const slug = geo?.primary_district ?? regional?.primary_district ?? null;
  if (!slug) return { label: null, slug: null };
  return { label: getDistrict(slug)?.name ?? slug, slug };
}

function resolveCategory(
  article: EventClusterArticle,
  eventVm: EventViewModel | null | undefined
): string | null {
  const tags = article.tags.map((t) => t.trim().toLowerCase());
  const fromTag = tags.find((t) =>
    ["politics", "business", "sports", "local", "health", "world"].includes(t)
  );
  return eventVm?.category ?? fromTag ?? null;
}

function resolveSourceConfidence(
  article: EventClusterArticle,
  eventVm: EventViewModel | null | undefined
): number | null {
  const meta = article.editorial_metadata;
  if (typeof meta.ai_confidence === "number") return meta.ai_confidence;
  if (typeof eventVm?.cluster_confidence === "number") {
    return eventVm.cluster_confidence;
  }
  return eventVm?.coverage_statistics.cluster_confidence_score ?? null;
}

function resolveUpdateType(
  article: EventClusterArticle,
  index: number,
  total: number,
  eventVm: EventViewModel | null | undefined
): StoryCoverageUpdateType {
  const tags = new Set(
    article.tags.map((t) => t.trim().toLowerCase()).filter(Boolean)
  );
  const meta = article.editorial_metadata;
  const status = (eventVm?.status ?? "").toLowerCase();

  if (meta.is_breaking || tags.has("breaking") || tags.has("ब्रेकिंग")) {
    return "breaking";
  }
  if (tags.has("analysis") || tags.has("विश्लेषण") || tags.has("opinion")) {
    return "analysis";
  }
  if (tags.has("background") || tags.has("पृष्ठभूमि") || tags.has("context")) {
    return "background";
  }
  if (
    status === "resolved" ||
    status === "closed" ||
    status === "ended" ||
    tags.has("resolved") ||
    tags.has("समाधान") ||
    tags.has("समाप्त")
  ) {
    // Only mark the newest item as resolved when event status supports it.
    if (index === total - 1) return "resolved";
  }
  if (eventVm?.is_live && index === total - 1) {
    return "ongoing";
  }
  if (index === 0 && total === 1) return "full";
  if (index === 0) return "full";
  return "update";
}

function resolveClusterStatus(
  eventVm: EventViewModel | null | undefined
): ContinuingCoverageVm["clusterStatus"] {
  const status = (eventVm?.status ?? "").toLowerCase();
  if (
    status === "resolved" ||
    status === "closed" ||
    status === "ended" ||
    status === "archived"
  ) {
    return "resolved";
  }
  if (eventVm?.is_live || status === "live" || status === "ongoing" || status === "active") {
    return "ongoing";
  }
  if (eventVm) return "unknown";
  return "unknown";
}

function whatChanged(
  article: EventClusterArticle,
  previous: EventClusterArticle | null
): string | null {
  const summary = article.summary?.trim();
  if (summary) {
    // Keep concise — first sentence / ~110 chars.
    const cut = summary.split(/[।.!?]/)[0]?.trim() || summary;
    return cut.length > 110 ? `${cut.slice(0, 107)}…` : cut;
  }
  if (!previous) return null;
  return null;
}

function dedupeArticles(articles: EventClusterArticle[]): EventClusterArticle[] {
  const result: EventClusterArticle[] = [];
  for (const article of articles) {
    const dup = result.find((existing) =>
      isNearDuplicateHeadline(existing.headline, article.headline)
    );
    if (dup) {
      // Prefer the earlier published story for chronology; keep newer if same time.
      const existingMs = new Date(dup.published_at).getTime();
      const nextMs = new Date(article.published_at).getTime();
      if (nextMs < existingMs) {
        const idx = result.indexOf(dup);
        result[idx] = article;
      }
      continue;
    }
    result.push(article);
  }
  return result;
}

function sortChronologically(
  articles: EventClusterArticle[]
): Array<{ article: EventClusterArticle; eventAt: string | null; sortAt: string; usedEventTime: boolean }> {
  const decorated = articles.map((article) => {
    const eventAt = parseReliableEventAt(article.editorial_metadata);
    const usedEventTime = Boolean(eventAt);
    return {
      article,
      eventAt,
      sortAt: eventAt ?? article.published_at,
      usedEventTime,
    };
  });

  const missingEventTime = decorated.filter((entry) => !entry.usedEventTime).length;
  if (missingEventTime > 0) {
    logNewsroom("continuing_coverage_missing_event_time", {
      eventId: articles[0]?.event_id ?? null,
      missingCount: missingEventTime,
      total: decorated.length,
    });
  }

  return decorated.sort((a, b) => {
    const ta = new Date(a.sortAt).getTime();
    const tb = new Date(b.sortAt).getTime();
    if (ta !== tb) return ta - tb;
    // Deterministic tie-break: published_at then id
    const pa = new Date(a.article.published_at).getTime();
    const pb = new Date(b.article.published_at).getTime();
    if (pa !== pb) return pa - pb;
    return a.article.id.localeCompare(b.article.id);
  });
}

function partitionVisible(
  items: ContinuingCoverageItem[],
  visibleLimit: number
): { visible: ContinuingCoverageItem[]; collapsed: ContinuingCoverageItem[] } {
  if (items.length <= visibleLimit) {
    return { visible: items, collapsed: [] };
  }

  const currentIndex = items.findIndex((item) => item.isCurrent);
  const latestIndex = items.length - 1;

  // Window ending at latest, large enough to include current when possible.
  let start = Math.max(0, items.length - visibleLimit);
  if (currentIndex >= 0 && currentIndex < start) {
    // Pull window back so current remains visible; keep latest in window.
    const roomAfterCurrent = visibleLimit - 1;
    start = Math.max(0, Math.min(currentIndex, latestIndex - roomAfterCurrent));
  }

  return {
    collapsed: items.slice(0, start),
    visible: items.slice(start),
  };
}

function emptyVm(eventId: string, eventTitle: string): ContinuingCoverageVm {
  return {
    eventId,
    eventTitle,
    clusterStatus: "unknown",
    showTimeline: false,
    items: [],
    visibleItems: [],
    collapsedItems: [],
    collapsedCount: 0,
    currentId: null,
    latestId: null,
    nav: {
      previous: null,
      next: null,
      latest: null,
      overviewHref: null,
      districtHref: null,
      categoryHref: null,
    },
  };
}

/**
 * Build continuing-coverage timeline from event-cluster articles.
 * Returns showTimeline=false for single-story or missing clusters.
 */
export function buildContinuingCoverage(
  input: BuildContinuingCoverageInput
): ContinuingCoverageVm {
  const eventId = input.eventId?.trim() ?? "";
  const eventTitle =
    input.eventTitle?.trim() ||
    input.eventViewModel?.canonical_title?.trim() ||
    "";

  if (!eventId) {
    logNewsroom("continuing_coverage_missing_event_id", {
      slug: input.currentSlug,
      reason: "build_without_event_id",
    });
    return emptyVm("", eventTitle);
  }

  // Strict: only articles that already share this event_id.
  const sameEvent = input.articles.filter(
    (article) => article.event_id === eventId && article.slug?.trim()
  );

  if (sameEvent.length === 0) {
    logNewsroom("continuing_coverage_missing_cluster", {
      eventId,
      slug: input.currentSlug,
      reason: "no_matching_articles",
    });
    return emptyVm(eventId, eventTitle);
  }

  const deduped = dedupeArticles(sameEvent);
  const sorted = sortChronologically(deduped);

  if (sorted.length < 2) {
    // Single-story cluster — hide timeline; caller shows ordinary related content.
    return {
      ...emptyVm(eventId, eventTitle || sorted[0]?.article.headline || ""),
      clusterStatus: resolveClusterStatus(input.eventViewModel),
    };
  }

  const items: ContinuingCoverageItem[] = sorted.map((entry, index) => {
    const { article, eventAt, sortAt, usedEventTime } = entry;
    const district = resolveDistrict(article);
    const updateType = resolveUpdateType(
      article,
      index,
      sorted.length,
      input.eventViewModel
    );
    const prev = index > 0 ? sorted[index - 1].article : null;
    const isCurrent =
      article.slug === input.currentSlug ||
      (Boolean(input.currentStoryId) && article.id === input.currentStoryId);

    return {
      id: article.id,
      storyId: article.id,
      slug: article.slug,
      headline: article.headline,
      summary: article.summary,
      publishedAt: article.published_at,
      eventAt,
      sortAt,
      usedEventTime,
      updateType,
      statusLabelHi: STORY_STATUS_LABEL_HI[updateType],
      statusLabelEn: STORY_STATUS_LABEL_EN[updateType],
      district: district.label,
      districtSlug: district.slug,
      category: resolveCategory(article, input.eventViewModel),
      sourceConfidence: resolveSourceConfidence(article, input.eventViewModel),
      isCurrent,
      isLatest: index === sorted.length - 1,
      href: `/story/${article.slug}`,
      whatChanged: whatChanged(article, prev),
    };
  });

  // Ensure exactly one current marker when possible.
  if (!items.some((item) => item.isCurrent)) {
    const bySlug = items.find((item) => item.slug === input.currentSlug);
    if (bySlug) bySlug.isCurrent = true;
  } else {
    let seen = false;
    for (const item of items) {
      if (item.isCurrent && seen) item.isCurrent = false;
      else if (item.isCurrent) seen = true;
    }
  }

  const currentIndex = items.findIndex((item) => item.isCurrent);
  const latest = items[items.length - 1] ?? null;
  const current = currentIndex >= 0 ? items[currentIndex] : null;
  const previous =
    currentIndex > 0 ? items[currentIndex - 1] : null;
  const next =
    currentIndex >= 0 && currentIndex < items.length - 1
      ? items[currentIndex + 1]
      : null;

  const visibleLimit = input.visibleLimit ?? CONTINUING_COVERAGE_VISIBLE_LIMIT;
  const { visible, collapsed } = partitionVisible(items, visibleLimit);

  const overviewHref = input.eventViewModel?.coverage_slug
    ? `/live/${input.eventViewModel.coverage_slug}`
    : null;

  const districtSlug =
    current?.districtSlug ||
    items.find((item) => item.districtSlug)?.districtSlug ||
    null;
  const category =
    current?.category || items.find((item) => item.category)?.category || null;

  return {
    eventId,
    eventTitle: eventTitle || current?.headline || latest?.headline || "",
    clusterStatus: resolveClusterStatus(input.eventViewModel),
    showTimeline: true,
    items,
    visibleItems: visible,
    collapsedItems: collapsed,
    collapsedCount: collapsed.length,
    currentId: current?.id ?? null,
    latestId: latest?.id ?? null,
    nav: {
      previous,
      next,
      latest,
      overviewHref,
      districtHref: districtSlug ? `/district/${districtSlug}` : null,
      categoryHref: category ? `/category/${category}` : null,
    },
  };
}

/** Slugs already represented on the timeline — exclude from related rails. */
export function continuingCoverageSlugs(vm: ContinuingCoverageVm | null | undefined): Set<string> {
  if (!vm?.showTimeline) return new Set();
  return new Set(vm.items.map((item) => item.slug));
}
