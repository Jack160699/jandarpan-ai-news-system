import type { EventViewModel } from "@/lib/events/event-view-model";
import type { CoverageTimelineEntry } from "@/lib/news/coverage/timeline";
import type { StoryTimelineEvent } from "@/lib/news/story-markdown";
import type { NewsroomLanguage } from "@/lib/i18n/languages";
import type { StoryIntelligenceVm } from "@/lib/story/story-intelligence";
import { deriveStoryTrustSignals } from "./derive-story-trust";
import {
  deriveThreadEntryTrust,
  type ThreadEntryTrust,
} from "./derive-thread-entry-trust";

export type ThreadTimelineEntry = {
  id: string;
  headline: string;
  timestamp: string | null;
  href: string | null;
  isCurrent: boolean;
  isLive: boolean;
  thumbnail: string | null;
  trust: ThreadEntryTrust;
};

export type ThreadTimelineVm = {
  entries: ThreadTimelineEntry[];
  hasThread: boolean;
  isLiveTimeline: boolean;
  currentIndex: number;
};

export type BuildThreadTimelineInput = {
  eventViewModel: EventViewModel | null;
  storyTimelineEvents: StoryTimelineEvent[];
  currentSlug: string;
  currentHeadline: string;
  currentImage: string | null;
  currentPublishedAt: string | null;
  liveHref: string | null;
  isArticleLive: boolean;
  language: NewsroomLanguage;
  intelligence: Pick<
    StoryIntelligenceVm,
    "trust" | "attribution" | "reader" | "knowledge"
  >;
};

function normalizeHeadline(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function mapCoverageEntry(
  entry: CoverageTimelineEntry,
  input: BuildThreadTimelineInput
): ThreadTimelineEntry {
  const headline = entry.detail.trim() || entry.label.trim();
  const isEditorial = entry.type === "editorial";
  const articleSlug = input.eventViewModel?.related_metadata.article_slug;
  const isCurrent =
    isEditorial ||
    entry.id === "editorial-synthesis" ||
    normalizeHeadline(headline) === normalizeHeadline(input.currentHeadline) ||
    (articleSlug != null && articleSlug === input.currentSlug);

  const href =
    isCurrent || !input.liveHref
      ? null
      : entry.type === "update" || entry.isBreaking
        ? input.liveHref
        : null;

  const isLive =
    Boolean(entry.isBreaking) &&
    (input.isArticleLive || Boolean(input.eventViewModel?.is_live));

  return {
    id: entry.id,
    headline,
    timestamp: entry.publishedAt,
    href,
    isCurrent,
    isLive,
    thumbnail: isCurrent ? input.currentImage : null,
    trust: deriveThreadEntryTrust({
      timestamp: entry.publishedAt,
      isLive,
      isBreaking: Boolean(entry.isBreaking),
      sourceLine: entry.sourceLine,
      confidence: entry.confidence,
      language: input.language,
    }),
  };
}

function mapStoryEvent(
  event: StoryTimelineEvent,
  input: BuildThreadTimelineInput
): ThreadTimelineEntry {
  const headline = event.detail.trim() || event.label.trim();
  const isCurrent =
    normalizeHeadline(headline) === normalizeHeadline(input.currentHeadline);

  return {
    id: event.id,
    headline,
    timestamp: null,
    href: isCurrent ? null : input.liveHref,
    isCurrent,
    isLive: input.isArticleLive && isCurrent,
    thumbnail: isCurrent ? input.currentImage : null,
    trust: deriveThreadEntryTrust({
      timestamp: input.currentPublishedAt,
      isLive: input.isArticleLive && isCurrent,
      isBreaking: false,
      language: input.language,
    }),
  };
}

function mapRecentUpdate(
  update: EventViewModel["recent_updates"][number],
  input: BuildThreadTimelineInput
): ThreadTimelineEntry {
  const isCurrent =
    normalizeHeadline(update.headline) === normalizeHeadline(input.currentHeadline);

  return {
    id: update.id,
    headline: update.headline,
    timestamp: update.published_at,
    href: isCurrent ? null : input.liveHref,
    isCurrent,
    isLive: update.is_breaking && Boolean(input.eventViewModel?.is_live),
    thumbnail: isCurrent ? input.currentImage : null,
    trust: deriveThreadEntryTrust({
      timestamp: update.published_at,
      isLive: update.is_breaking && Boolean(input.eventViewModel?.is_live),
      isBreaking: update.is_breaking,
      confidence: update.cluster_confidence,
      language: input.language,
    }),
  };
}

function buildCurrentEntry(
  input: BuildThreadTimelineInput
): ThreadTimelineEntry {
  const signals = deriveStoryTrustSignals({
    intelligence: input.intelligence,
    isLive: input.isArticleLive,
  });

  const sourceSignal = signals.find((s) => s.kind === "source-count");
  const sourceLine =
    sourceSignal?.kind === "source-count"
      ? `${sourceSignal.count} source${sourceSignal.count === 1 ? "" : "s"}`
      : null;

  return {
    id: `current-${input.currentSlug}`,
    headline: input.currentHeadline,
    timestamp: input.currentPublishedAt,
    href: null,
    isCurrent: true,
    isLive: input.isArticleLive,
    thumbnail: input.currentImage,
    trust: deriveThreadEntryTrust({
      timestamp: input.currentPublishedAt,
      isLive: input.isArticleLive,
      isBreaking: false,
      sourceLine,
      language: input.language,
    }),
  };
}

function dedupeEntries(entries: ThreadTimelineEntry[]): ThreadTimelineEntry[] {
  const seen = new Set<string>();
  const result: ThreadTimelineEntry[] = [];

  for (const entry of entries) {
    const key = normalizeHeadline(entry.headline);
    if (seen.has(key)) {
      const existing = result.find(
        (item) => normalizeHeadline(item.headline) === key
      );
      if (existing && entry.isCurrent) {
        existing.isCurrent = true;
        existing.thumbnail = entry.thumbnail ?? existing.thumbnail;
      }
      continue;
    }
    seen.add(key);
    result.push(entry);
  }

  return result;
}

function sortNewestFirst(entries: ThreadTimelineEntry[]): ThreadTimelineEntry[] {
  return [...entries].sort((a, b) => {
    const ta = a.timestamp ? new Date(a.timestamp).getTime() : 0;
    const tb = b.timestamp ? new Date(b.timestamp).getTime() : 0;
    if (tb !== ta) return tb - ta;
    if (a.isCurrent && !b.isCurrent) return -1;
    if (!a.isCurrent && b.isCurrent) return 1;
    return 0;
  });
}

function resolveRawEntries(input: BuildThreadTimelineInput): ThreadTimelineEntry[] {
  const { eventViewModel, storyTimelineEvents } = input;

  if (eventViewModel?.timeline.length) {
    return eventViewModel.timeline.map((entry) => mapCoverageEntry(entry, input));
  }

  if (eventViewModel && eventViewModel.recent_updates.length > 1) {
    return eventViewModel.recent_updates.map((update) =>
      mapRecentUpdate(update, input)
    );
  }

  if (storyTimelineEvents.length > 1) {
    return storyTimelineEvents.map((event) => mapStoryEvent(event, input));
  }

  return [];
}

export function buildThreadTimeline(
  input: BuildThreadTimelineInput
): ThreadTimelineVm {
  let entries = resolveRawEntries(input);

  if (!entries.some((entry) => entry.isCurrent)) {
    entries = [buildCurrentEntry(input), ...entries];
  }

  entries = sortNewestFirst(dedupeEntries(entries));

  const hasThread = entries.length > 1;
  const currentIndex = entries.findIndex((entry) => entry.isCurrent);
  const isLiveTimeline =
    input.isArticleLive || Boolean(input.eventViewModel?.is_live);

  return {
    entries: hasThread ? entries : [],
    hasThread,
    isLiveTimeline,
    currentIndex,
  };
}
