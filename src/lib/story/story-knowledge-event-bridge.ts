/**
 * Event ↔ Knowledge bridge — connects StoryKnowledgeVm with EventViewModel.
 * No new queries, no AI, no duplicated event or knowledge builders.
 */

import { formatEventStatusLabel } from "@/lib/events/event-story-adapter";
import type { EventViewModel } from "@/lib/events/event-view-model";

export type StoryKnowledgeEventContext = {
  hasEvent: boolean;
  coverageTitle: string;
  coverageStatus: string | null;
  liveCoverageHref: string | null;
  sharedEntities: string[];
  sharedOrganizations: string[];
  sharedLocations: string[];
  contextLines: string[];
};

export type BuildStoryKnowledgeEventContextInput = {
  eventViewModel?: EventViewModel | null;
  hasKnowledgeLayer: boolean;
  people: string[];
  organizations: string[];
  locations: string[];
  district: string | null;
  districtSlug: string | null;
  category: string | null;
};

function normalizeKey(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function metadataAligns(
  left: string | null,
  right: string | null
): boolean {
  if (!left?.trim() || !right?.trim()) return false;
  const a = normalizeKey(left);
  const b = normalizeKey(right);
  return a === b || a.includes(b) || b.includes(a);
}

function buildContextLines(input: {
  people: string[];
  organizations: string[];
  locations: string[];
  district: string | null;
  eventViewModel: EventViewModel;
}): string[] {
  const lines: string[] = [];

  for (const person of input.people.slice(0, 2)) {
    lines.push(`${person} is part of this ongoing event.`);
  }

  for (const organization of input.organizations.slice(0, 2)) {
    lines.push(`${organization} appears throughout this developing story.`);
  }

  for (const location of input.locations.slice(0, 2)) {
    lines.push(`${location} is central to this event.`);
  }

  if (
    input.district &&
    metadataAligns(input.district, input.eventViewModel.region)
  ) {
    lines.push(`${input.district} is central to this event.`);
  }

  return lines;
}

export function buildStoryKnowledgeEventContext(
  input: BuildStoryKnowledgeEventContextInput
): StoryKnowledgeEventContext | null {
  const { eventViewModel, hasKnowledgeLayer } = input;

  if (!hasKnowledgeLayer || !eventViewModel?.event_id) return null;

  const coverageTitle = eventViewModel.canonical_title?.trim();
  if (!coverageTitle) return null;

  const sharedEntities = input.people;
  const sharedOrganizations = input.organizations;
  const sharedLocations = input.locations;

  const categoryAligned = metadataAligns(
    input.category,
    eventViewModel.category
  );
  const districtAligned = metadataAligns(
    input.district,
    eventViewModel.region
  );

  const contextLines = buildContextLines({
    people: sharedEntities,
    organizations: sharedOrganizations,
    locations: sharedLocations,
    district: input.district,
    eventViewModel,
  });

  const hasBridgeContent = Boolean(
    sharedEntities.length ||
      sharedOrganizations.length ||
      sharedLocations.length ||
      contextLines.length ||
      categoryAligned ||
      districtAligned ||
      eventViewModel.coverage_slug
  );

  if (!hasBridgeContent) return null;

  return {
    hasEvent: true,
    coverageTitle,
    coverageStatus: formatEventStatusLabel(eventViewModel),
    liveCoverageHref: eventViewModel.coverage_slug
      ? `/live/${eventViewModel.coverage_slug}`
      : null,
    sharedEntities,
    sharedOrganizations,
    sharedLocations,
    contextLines,
  };
}
