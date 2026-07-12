/**
 * Entity-aware story discovery — re-ranks related stories using existing V2 metadata.
 * No AI, no graph DB, no additional database queries.
 */

import { readEditorialIntelligenceV2 } from "@/lib/news/ai/editorial-intelligence-v2";
import type { EditorialEntityV2 } from "@/lib/news/ai/editorial-intelligence-v2";
import { getDistrict } from "@/lib/regional/districts";
import type { RegionalGeoMetadata } from "@/lib/regional/geo-tagging";
import { pickRelatedStories, scoreRelatedness } from "@/lib/news/related-stories";
import type { GeneratedArticleRow } from "@/lib/types/newsroom";
import type { NewsArticleRow } from "@/lib/types/news-article";

const ENTITY_MATCH_WEIGHT = 55;
const KEYWORD_MATCH_WEIGHT = 35;
const TAG_MATCH_WEIGHT = 28;
const DISTRICT_MATCH_WEIGHT = 32;
const MIN_CONTEXTUAL_SUBTITLE_SCORE = 35;

export type KnowledgeSignals = {
  eventId: string | null;
  entities: EditorialEntityV2[];
  entityNames: string[];
  readerKeywords: string[];
  tags: string[];
  districtSlug: string | null;
  districtLabel: string | null;
};

export type EntityAwareRelatedResult = {
  articles: NewsArticleRow[];
  discoverySubtitle: string | null;
};

function normalizeKey(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function dedupeLabels(values: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const value of values) {
    const label = value.trim();
    if (!label) continue;
    const key = normalizeKey(label);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(label);
  }
  return out;
}

function intersectNormalized(left: string[], right: string[]): string[] {
  const rightKeys = new Set(right.map(normalizeKey));
  const seen = new Set<string>();
  const out: string[] = [];
  for (const item of left) {
    const key = normalizeKey(item);
    if (!rightKeys.has(key) || seen.has(key)) continue;
    seen.add(key);
    out.push(item.trim());
  }
  return out;
}

function sharedEntitiesByType(
  left: EditorialEntityV2[],
  right: EditorialEntityV2[],
  type: EditorialEntityV2["type"]
): string[] {
  const rightNames = new Set(
    right
      .filter((entity) => entity.type === type)
      .map((entity) => normalizeKey(entity.name))
  );
  const seen = new Set<string>();
  const out: string[] = [];
  for (const entity of left.filter((item) => item.type === type)) {
    const key = normalizeKey(entity.name);
    if (!rightNames.has(key) || seen.has(key)) continue;
    seen.add(key);
    out.push(entity.name.trim());
  }
  return out;
}

export function extractKnowledgeSignals(
  row: GeneratedArticleRow
): KnowledgeSignals {
  const v2 = readEditorialIntelligenceV2(row.editorial_metadata);
  const entities = v2?.entities ?? [];
  const geo = row.geo_metadata as RegionalGeoMetadata | undefined;
  const regional = row.editorial_metadata?.regional as
    | RegionalGeoMetadata
    | undefined;
  const districtSlug = geo?.primary_district ?? regional?.primary_district ?? null;

  return {
    eventId: row.event_id ?? null,
    entities,
    entityNames: dedupeLabels(entities.map((entity) => entity.name)),
    readerKeywords: dedupeLabels(v2?.reader_keywords ?? []),
    tags: dedupeLabels(row.tags ?? []),
    districtSlug,
    districtLabel: districtSlug
      ? getDistrict(districtSlug)?.name ?? districtSlug
      : null,
  };
}

export function scoreKnowledgeOverlap(
  source: KnowledgeSignals,
  candidate: KnowledgeSignals
): number {
  let score = 0;

  const sharedEntities = intersectNormalized(
    source.entityNames,
    candidate.entityNames
  );
  score += Math.min(sharedEntities.length * ENTITY_MATCH_WEIGHT, 165);

  const sharedKeywords = intersectNormalized(
    source.readerKeywords,
    candidate.readerKeywords
  );
  score += Math.min(sharedKeywords.length * KEYWORD_MATCH_WEIGHT, 105);

  const sharedTags = intersectNormalized(source.tags, candidate.tags);
  score += Math.min(sharedTags.length * TAG_MATCH_WEIGHT, 84);

  if (
    source.districtSlug &&
    candidate.districtSlug &&
    source.districtSlug === candidate.districtSlug
  ) {
    score += DISTRICT_MATCH_WEIGHT;
  }

  return score;
}

function buildSignalsBySlug(
  rows: GeneratedArticleRow[]
): Map<string, KnowledgeSignals> {
  const map = new Map<string, KnowledgeSignals>();
  for (const row of rows) {
    const slug = row.slug?.trim();
    if (!slug) continue;
    map.set(slug, extractKnowledgeSignals(row));
  }
  return map;
}

function resolveSubtitleFromOverlap(
  source: KnowledgeSignals,
  candidate: KnowledgeSignals,
  overlapScore: number
): string | null {
  if (overlapScore < MIN_CONTEXTUAL_SUBTITLE_SCORE) return null;

  const person = sharedEntitiesByType(
    source.entities,
    candidate.entities,
    "person"
  )[0];
  if (person) return `More about ${person}`;

  const organization = sharedEntitiesByType(
    source.entities,
    candidate.entities,
    "organization"
  )[0];
  if (organization) return `More reporting involving ${organization}`;

  const location = sharedEntitiesByType(
    source.entities,
    candidate.entities,
    "location"
  )[0];
  if (location) return `More stories mentioning ${location}`;

  const keyword = intersectNormalized(
    source.readerKeywords,
    candidate.readerKeywords
  )[0];
  if (keyword) return `More coverage about ${keyword}`;

  const tag = intersectNormalized(source.tags, candidate.tags)[0];
  if (tag) return `Stories about ${tag}`;

  if (
    source.districtSlug &&
    source.districtSlug === candidate.districtSlug &&
    source.districtLabel
  ) {
    return `More from ${source.districtLabel}`;
  }

  if (sharedEntitiesByType(source.entities, candidate.entities, "other").length) {
    return "Related reporting";
  }

  return null;
}

export function pickEntityAwareRelatedStories(
  sourceArticle: NewsArticleRow,
  sourceRow: GeneratedArticleRow,
  poolRows: GeneratedArticleRow[],
  poolArticles: NewsArticleRow[],
  limit: number
): EntityAwareRelatedResult {
  const sourceSignals = extractKnowledgeSignals(sourceRow);
  const signalsBySlug = buildSignalsBySlug(poolRows);

  const knowledgeBoost = (_source: NewsArticleRow, candidate: NewsArticleRow) => {
    if (!candidate.slug) return 0;
    const candidateSignals = signalsBySlug.get(candidate.slug);
    if (!candidateSignals) return 0;
    return scoreKnowledgeOverlap(sourceSignals, candidateSignals);
  };

  const articles = pickRelatedStories(
    sourceArticle,
    poolArticles,
    limit,
    knowledgeBoost
  );

  const topArticle = articles[0];
  const topSignals = topArticle?.slug
    ? signalsBySlug.get(topArticle.slug)
    : undefined;
  const topKnowledgeScore = topSignals
    ? scoreKnowledgeOverlap(sourceSignals, topSignals)
    : 0;

  const discoverySubtitle = topSignals
    ? resolveSubtitleFromOverlap(
        sourceSignals,
        topSignals,
        topKnowledgeScore
      )
    : null;

  return { articles, discoverySubtitle };
}
