/**
 * Knowledge-aware search scoring — additive relevance from existing V2 metadata.
 * No AI, no embeddings, no vector DB.
 */

import { tokenizeForSimilarity } from "@/lib/news/ai/similarity";
import type { ParsedSearchQuery, SearchDistrict } from "@/lib/search/types";
import type { HomeSectionId } from "@/lib/homepage/types";

export type SearchKnowledgeFields = {
  entityNames: string[];
  readerKeywords: string[];
  tags: string[];
  section: HomeSectionId;
  district: SearchDistrict | null;
  districtLabel: string | null;
};

export type KnowledgeSearchBoost = {
  boost: number;
  reasons: string[];
};

const HEADLINE_PHRASE_WEIGHT = 40;
const HEADLINE_TERM_WEIGHT = 16;
const HEADLINE_TERM_CAP = 32;
const ENTITY_MATCH_WEIGHT = 45;
const READER_KEYWORD_WEIGHT = 32;
const TAG_MATCH_WEIGHT = 24;
const CATEGORY_MATCH_WEIGHT = 20;
const DISTRICT_MATCH_WEIGHT = 18;

const SECTION_LABELS: Record<HomeSectionId, string[]> = {
  chhattisgarh: ["chhattisgarh", "छत्तीसगढ़", "छत्तीसगढ", "local", "regional"],
  raipur: ["raipur", "रायपुर", "capital"],
  india: ["india", "indian", "भारत", "politics", "राजनीति"],
  world: ["world", "global", "international", "विश्व"],
  business: ["business", "economy", "व्यापार", "market"],
  sports: ["sports", "sport", "cricket", "खेल"],
  education: ["education", "school", "exam", "शिक्षा", "health"],
};

function normalizeKey(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function queryMatchesKnowledge(
  rawQuery: string,
  queryTerms: string[],
  label: string
): boolean {
  const normLabel = normalizeKey(label);
  if (!normLabel) return false;

  const normQuery = normalizeKey(rawQuery);
  if (normQuery.length >= 2) {
    if (normLabel.includes(normQuery) || normQuery.includes(normLabel)) {
      return true;
    }
  }

  const labelTerms = new Set(tokenizeForSimilarity(label));
  let termHits = 0;
  for (const term of queryTerms) {
    if (term.length < 2) continue;
    if (normLabel.includes(term) || labelTerms.has(term)) {
      termHits++;
    }
  }

  if (!termHits) return false;
  if (queryTerms.length === 1) return true;
  return termHits >= Math.min(2, queryTerms.length);
}

export function scoreHeadlineKnowledgeBoost(
  headline: string,
  rawQuery: string,
  queryTerms: string[]
): KnowledgeSearchBoost {
  const headlineLc = headline.toLowerCase();
  const rawLc = rawQuery.trim().toLowerCase();
  const reasons: string[] = [];
  let boost = 0;

  if (rawLc.length >= 3 && headlineLc.includes(rawLc)) {
    boost += HEADLINE_PHRASE_WEIGHT;
    reasons.push("headline_match");
    return { boost, reasons };
  }

  let headlineTermHits = 0;
  for (const term of queryTerms) {
    if (term.length > 2 && headlineLc.includes(term)) {
      headlineTermHits++;
    }
  }

  if (headlineTermHits) {
    boost += Math.min(headlineTermHits * HEADLINE_TERM_WEIGHT, HEADLINE_TERM_CAP);
    reasons.push("headline_term_match");
  }

  return { boost, reasons };
}

export function scoreKnowledgeSearchBoost(
  rawQuery: string,
  queryTerms: string[],
  parsed: ParsedSearchQuery,
  doc: SearchKnowledgeFields
): KnowledgeSearchBoost {
  const reasons: string[] = [];
  let boost = 0;

  if (
    doc.entityNames.some((entity) =>
      queryMatchesKnowledge(rawQuery, queryTerms, entity)
    )
  ) {
    boost += ENTITY_MATCH_WEIGHT;
    reasons.push("entity_match");
  }

  if (
    doc.readerKeywords.some((keyword) =>
      queryMatchesKnowledge(rawQuery, queryTerms, keyword)
    )
  ) {
    boost += READER_KEYWORD_WEIGHT;
    reasons.push("reader_keyword_match");
  }

  if (
    doc.tags.some((tag) => queryMatchesKnowledge(rawQuery, queryTerms, tag))
  ) {
    boost += TAG_MATCH_WEIGHT;
    reasons.push("tag_match");
  }

  const categoryLabels = SECTION_LABELS[doc.section] ?? [doc.section];
  const categoryQueryMatch = categoryLabels.some((label) =>
    queryMatchesKnowledge(rawQuery, queryTerms, label)
  );
  if (parsed.category && doc.section === parsed.category) {
    boost += CATEGORY_MATCH_WEIGHT;
    reasons.push("category_match");
  } else if (categoryQueryMatch) {
    boost += CATEGORY_MATCH_WEIGHT;
    reasons.push("category_match");
  }

  const districtLabels = [doc.district, doc.districtLabel].filter(
    (value): value is string => Boolean(value?.trim())
  );
  const districtQueryMatch = districtLabels.some((label) =>
    queryMatchesKnowledge(rawQuery, queryTerms, label)
  );
  if (parsed.district && doc.district === parsed.district) {
    boost += DISTRICT_MATCH_WEIGHT;
    reasons.push("district_match");
  } else if (districtQueryMatch) {
    boost += DISTRICT_MATCH_WEIGHT;
    reasons.push("district_match");
  }

  return { boost, reasons };
}
