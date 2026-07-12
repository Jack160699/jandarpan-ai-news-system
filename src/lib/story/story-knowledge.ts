/**
 * Story Knowledge view-model — projection from existing editorial metadata only.
 * No AI, no entity extraction, no database queries.
 */

import { readEditorialIntelligenceV2 } from "@/lib/news/ai/editorial-intelligence-v2";
import type { EditorialEntityV2 } from "@/lib/news/ai/editorial-intelligence-v2";
import type { EventViewModel } from "@/lib/events/event-view-model";
import { getDistrict } from "@/lib/regional/districts";
import type { RegionalGeoMetadata } from "@/lib/regional/geo-tagging";
import type { StoryAttribution } from "@/lib/news/story-view";
import type { EditorialMetadata, GeneratedArticleRow } from "@/lib/types/newsroom";
import type { NewsArticleRow, NewsCategory } from "@/lib/types/news-article";
import {
  buildStoryKnowledgeNav,
  type StoryKnowledgeNavVm,
} from "@/lib/story/story-knowledge-navigation";
import {
  buildStoryKnowledgeEventContext,
  type StoryKnowledgeEventContext,
} from "@/lib/story/story-knowledge-event-bridge";

export type { StoryKnowledgeEventContext };

export type StoryKnowledgeVm = {
  entities: EditorialEntityV2[];
  people: string[];
  organizations: string[];
  locations: string[];
  programs: string[];
  topics: string[];
  readerKeywords: string[];
  primaryTopic: string | null;
  secondaryTopics: string[];
  relatedConcepts: string[];
  district: string | null;
  districtSlug: string | null;
  category: string | null;
  nav: StoryKnowledgeNavVm;
  eventContext: StoryKnowledgeEventContext | null;
  hasLayer: boolean;
};

export type BuildStoryKnowledgeInput = {
  article: NewsArticleRow;
  editorialMeta?: EditorialMetadata | null;
  generatedRow?: GeneratedArticleRow | null;
  eventViewModel?: EventViewModel | null;
  tags?: string[];
  attribution?: StoryAttribution;
};

function dedupeLabels(values: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const value of values) {
    const label = value.trim();
    if (!label) continue;
    const key = label.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(label);
  }
  return out;
}

function resolveDistrictSlug(
  generatedRow: GeneratedArticleRow | null | undefined,
  meta: EditorialMetadata | null | undefined
): string | null {
  const geo = generatedRow?.geo_metadata as RegionalGeoMetadata | undefined;
  const regional = meta?.regional as RegionalGeoMetadata | undefined;
  return geo?.primary_district ?? regional?.primary_district ?? null;
}

function resolveDistrictLabel(
  generatedRow: GeneratedArticleRow | null | undefined,
  meta: EditorialMetadata | null | undefined
): string | null {
  const geo = generatedRow?.geo_metadata as RegionalGeoMetadata | undefined;
  const regional = meta?.regional as RegionalGeoMetadata | undefined;
  const slug = geo?.primary_district ?? regional?.primary_district;
  if (!slug) return null;
  return getDistrict(slug)?.name ?? slug;
}

function namesForType(
  entities: EditorialEntityV2[],
  type: EditorialEntityV2["type"]
): string[] {
  return dedupeLabels(
    entities.filter((entity) => entity.type === type).map((entity) => entity.name)
  );
}

export function buildStoryKnowledge(
  input: BuildStoryKnowledgeInput
): StoryKnowledgeVm {
  const {
    article,
    editorialMeta,
    generatedRow = null,
    eventViewModel = null,
    tags = [],
    attribution,
  } = input;

  const v2 = readEditorialIntelligenceV2(editorialMeta);
  const entities = v2?.entities ?? [];
  const readerKeywords = dedupeLabels(v2?.reader_keywords ?? []);

  const articleTags = dedupeLabels(
    tags.length ? tags : (generatedRow?.tags ?? [])
  );

  const people = namesForType(entities, "person");
  const organizations = namesForType(entities, "organization");
  const locations = namesForType(entities, "location");
  const programs = namesForType(entities, "program");
  const relatedConcepts = namesForType(entities, "other");

  const primaryTopic = articleTags[0] ?? null;
  const secondaryTopics = articleTags.slice(1);

  const districtSlug = resolveDistrictSlug(generatedRow, editorialMeta);
  const district = resolveDistrictLabel(generatedRow, editorialMeta);
  const category =
    attribution?.categoryLabel?.trim() ||
    eventViewModel?.category?.trim() ||
    article.category?.trim() ||
    null;

  const nav = buildStoryKnowledgeNav({
    articleCategory: article.category as NewsCategory,
    categoryLabel: category,
    districtLabel: district,
    districtSlug,
    people,
    organizations,
    locations,
    programs,
    topics: articleTags,
    readerKeywords,
    relatedConcepts,
  });

  const hasLayer = Boolean(
    entities.length ||
      people.length ||
      organizations.length ||
      locations.length ||
      programs.length ||
      articleTags.length ||
      readerKeywords.length ||
      relatedConcepts.length ||
      district ||
      category
  );

  const eventContext = buildStoryKnowledgeEventContext({
    eventViewModel,
    hasKnowledgeLayer: hasLayer,
    people,
    organizations,
    locations,
    district,
    districtSlug,
    category,
  });

  return {
    entities,
    people,
    organizations,
    locations,
    programs,
    topics: articleTags,
    readerKeywords,
    primaryTopic,
    secondaryTopics,
    relatedConcepts,
    district,
    districtSlug,
    category,
    nav,
    eventContext,
    hasLayer,
  };
}
