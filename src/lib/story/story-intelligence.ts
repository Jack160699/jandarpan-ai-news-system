/**
 * Story Intelligence — canonical composition of editorial, trust, event, and reader layers.
 * Composes existing view-model builders only; no duplicate business logic.
 */

import {
  hasMeaningfulEventCoverage,
  resolveStoryTimelineEvents,
} from "@/lib/events/event-story-adapter";
import type { EventViewModel } from "@/lib/events/event-view-model";
import type { NewsroomLanguage } from "@/lib/i18n/languages";
import { formatRelativeTime } from "@/lib/i18n/format";
import type { ParsedStoryContent } from "@/lib/news/story-markdown";
import {
  buildStoryAttribution,
  type StoryAttribution,
} from "@/lib/news/story-view";
import { estimateReadTime } from "@/lib/news/story-utils";
import {
  buildEditorialIntelligence,
  type EditorialIntelligenceVm,
} from "@/lib/story/editorial-intelligence";
import {
  buildEditorialTrust,
  type EditorialTrustVm,
} from "@/lib/story/editorial-trust";
import { resolveGeneratedArticleModifiedAt } from "@/lib/seo/article-dates";
import type { EditorialMetadata, GeneratedArticleRow } from "@/lib/types/newsroom";
import type { NewsArticleRow } from "@/lib/types/news-article";

import {
  buildStoryKnowledge,
  type StoryKnowledgeVm,
} from "@/lib/story/story-knowledge";

export type { StoryKnowledgeVm };

export type StoryReaderVm = {
  displayLanguage: NewsroomLanguage;
  translationActive: boolean;
  readTime: string;
  publishedAtLabel: string | null;
  updatedAtLabel: string | null;
};

export type StoryTimelineVm = {
  events: ReturnType<typeof resolveStoryTimelineEvents>["events"];
  source: ReturnType<typeof resolveStoryTimelineEvents>["source"];
  title: string;
};

export type StoryIntelligenceFlags = {
  showEventNavigator: boolean;
  omitEditorialConfidence: boolean;
  liveHref: string;
};

export type StoryIntelligenceVm = {
  editorial: EditorialIntelligenceVm;
  trust: EditorialTrustVm;
  event: EventViewModel | null;
  knowledge: StoryKnowledgeVm;
  reader: StoryReaderVm;
  timeline: StoryTimelineVm;
  flags: StoryIntelligenceFlags;
  attribution: StoryAttribution;
};

export type BuildStoryIntelligenceInput = {
  article: NewsArticleRow;
  parsed: ParsedStoryContent;
  editorialMeta?: EditorialMetadata | null;
  generatedRow?: GeneratedArticleRow | null;
  eventViewModel?: EventViewModel | null;
  tags?: string[];
  readingTime?: string | null;
  displayLanguage: NewsroomLanguage;
  translationActive?: boolean;
};

function resolveReadTime(
  article: NewsArticleRow,
  headline: string,
  readingTimeOverride?: string | null
): string {
  const bodyRaw = article.content ?? "";
  return (
    readingTimeOverride?.trim() ||
    estimateReadTime(`${headline} ${bodyRaw || article.description || ""}`)
  );
}

function resolveDateLabels(
  article: NewsArticleRow,
  generatedRow: GeneratedArticleRow | null | undefined,
  displayLanguage: NewsroomLanguage
): { publishedAtLabel: string | null; updatedAtLabel: string | null } {
  const publishedAtLabel = article.published_at
    ? formatRelativeTime(article.published_at, displayLanguage)
    : null;

  const updatedAtIso = generatedRow
    ? resolveGeneratedArticleModifiedAt(generatedRow)
    : article.updated_at;
  const updatedAtLabel = updatedAtIso
    ? formatRelativeTime(updatedAtIso, displayLanguage)
    : null;

  return { publishedAtLabel, updatedAtLabel };
}

export function buildStoryIntelligence(
  input: BuildStoryIntelligenceInput
): StoryIntelligenceVm {
  const {
    article,
    parsed,
    editorialMeta,
    generatedRow = null,
    eventViewModel = null,
    tags = [],
    readingTime,
    displayLanguage,
    translationActive = false,
  } = input;

  const headline = article.ai_headline?.trim() || article.title;
  const attribution = buildStoryAttribution(article, editorialMeta);
  const readTime = resolveReadTime(article, headline, readingTime);
  const { publishedAtLabel, updatedAtLabel } = resolveDateLabels(
    article,
    generatedRow,
    displayLanguage
  );

  const editorial = buildEditorialIntelligence({
    article,
    editorialMeta,
    generatedRow,
    parsed,
    attribution,
    readTime,
    publishedAtLabel,
    updatedAtLabel,
    displayLanguage,
    tags: tags.length ? tags : (generatedRow?.tags ?? []),
  });

  const trust = buildEditorialTrust({
    article,
    editorialMeta,
    generatedRow,
    attribution,
    publishedAtLabel,
    updatedAtLabel,
    displayLanguage,
    editorialVm: editorial,
    eventViewModel,
  });

  const knowledge = buildStoryKnowledge({
    article,
    editorialMeta,
    generatedRow,
    eventViewModel,
    tags: tags.length ? tags : (generatedRow?.tags ?? []),
    attribution,
  });

  const timelineResolved = resolveStoryTimelineEvents({
    eventViewModel,
    editorialTimeline: editorial.timeline,
    markdownSections: parsed.sections,
  });

  const timeline: StoryTimelineVm = {
    events: timelineResolved.events,
    source: timelineResolved.source,
    title:
      timelineResolved.source === "event" ? "Event timeline" : "Key events",
  };

  const showEventNavigator = Boolean(
    eventViewModel && hasMeaningfulEventCoverage(eventViewModel)
  );

  const liveHref = eventViewModel?.coverage_slug
    ? `/live/${eventViewModel.coverage_slug}`
    : "/#breaking";

  return {
    editorial,
    trust,
    event: eventViewModel,
    knowledge,
    reader: {
      displayLanguage,
      translationActive,
      readTime,
      publishedAtLabel,
      updatedAtLabel,
    },
    timeline,
    flags: {
      showEventNavigator,
      omitEditorialConfidence: trust.hasLayer,
      liveHref,
    },
    attribution,
  };
}

/** Adapter helpers for components that need slices of the composed VM. */
export const storyIntelligenceAdapter = {
  editorial: (vm: StoryIntelligenceVm) => vm.editorial,
  trust: (vm: StoryIntelligenceVm) => vm.trust,
  event: (vm: StoryIntelligenceVm) => vm.event,
  knowledge: (vm: StoryIntelligenceVm) => vm.knowledge,
  reader: (vm: StoryIntelligenceVm) => vm.reader,
  timeline: (vm: StoryIntelligenceVm) => vm.timeline,
  flags: (vm: StoryIntelligenceVm) => vm.flags,
  attribution: (vm: StoryIntelligenceVm) => vm.attribution,
};
