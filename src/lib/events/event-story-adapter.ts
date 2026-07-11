/**
 * Story-page adapters for the Event View Model.
 * Maps event coverage data to story UI types — no duplicate timeline builders.
 */

import {
  buildTimelineFromSections,
  type StorySection,
  type StoryTimelineEvent,
} from "@/lib/news/story-markdown";
import type { CoverageTimelineEntry } from "@/lib/news/coverage/timeline";
import { formatNewsDate, formatRelativeTime } from "@/lib/i18n/format";
import type { NewsroomLanguage } from "@/lib/i18n/languages";
import type { EventViewModel } from "@/lib/events/event-view-model";

export function hasMeaningfulEventCoverage(vm: EventViewModel): boolean {
  const { coverage_statistics: stats } = vm;
  return (
    vm.is_live ||
    vm.latest_update !== null ||
    vm.timeline.length > 0 ||
    stats.update_count > 0 ||
    stats.source_count > 1 ||
    Boolean(vm.summary?.trim())
  );
}

export function formatEventStatusLabel(vm: EventViewModel): string | null {
  if (vm.is_live) return "Live";
  const status = vm.status?.trim();
  if (!status) return null;
  return status.charAt(0).toUpperCase() + status.slice(1).toLowerCase();
}

export function formatClusterConfidenceLabel(
  vm: EventViewModel
): string | null {
  const label = vm.coverage_statistics.cluster_confidence_label;
  if (!label) return null;
  return label.charAt(0).toUpperCase() + label.slice(1);
}

export function buildEventProgressLines(
  vm: EventViewModel,
  lang: NewsroomLanguage
): string[] {
  const lines: string[] = [];
  const stats = vm.coverage_statistics;

  if (stats.update_count > 0) {
    const noun = stats.update_count === 1 ? "development" : "developments";
    lines.push(`${stats.update_count} ${noun}`);
  }

  if (stats.last_update_at) {
    lines.push(`Updated ${formatRelativeTime(stats.last_update_at, lang)}`);
  }

  const since = stats.first_update_at ?? vm.tracked_since;
  if (since) {
    const diffDays = Math.floor(
      (Date.now() - new Date(since).getTime()) / 86_400_000
    );
    if (diffDays === 0) {
      lines.push("Tracking since today");
    } else if (diffDays === 1) {
      lines.push("Tracking since yesterday");
    } else {
      lines.push(`Tracking since ${formatNewsDate(since, lang, "medium")}`);
    }
  }

  return lines;
}

export function formatUpdateTypeLabel(updateType: string): string {
  const normalized = updateType.trim().toLowerCase();
  if (normalized === "breaking") return "Breaking";
  if (normalized === "development") return "Development";
  if (normalized === "source_wire") return "Source wire";
  if (!updateType.trim()) return updateType;
  return updateType.charAt(0).toUpperCase() + updateType.slice(1).toLowerCase();
}

export function coverageTimelineToStoryEvents(
  entries: CoverageTimelineEntry[]
): StoryTimelineEvent[] {
  return entries.map((entry, index) => ({
    id: entry.id,
    label: entry.isBreaking ? `${entry.label} · Breaking` : entry.label,
    detail: entry.detail,
    order: entry.order ?? index + 1,
  }));
}

export function resolveStoryTimelineEvents(input: {
  eventViewModel: EventViewModel | null;
  editorialTimeline: StoryTimelineEvent[] | null;
  markdownSections: StorySection[];
}): { events: StoryTimelineEvent[]; source: "event" | "editorial" | "markdown" } {
  if (input.eventViewModel?.timeline.length) {
    return {
      events: coverageTimelineToStoryEvents(input.eventViewModel.timeline),
      source: "event",
    };
  }

  if (input.editorialTimeline?.length) {
    return {
      events: input.editorialTimeline,
      source: "editorial",
    };
  }

  return {
    events: buildTimelineFromSections(input.markdownSections),
    source: "markdown",
  };
}
