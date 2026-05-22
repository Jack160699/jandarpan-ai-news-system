/**
 * Search indexing layer — in-memory inverted index + TF-IDF vectors
 */

import { inferSection } from "@/lib/homepage/generated-feed";
import {
  buildTfIdfVector,
  computeIdf,
  cosineSimilarity,
  tokenizeForSimilarity,
  type SparseVector,
} from "@/lib/news/ai/similarity";
import { rankArticlesForHomepage } from "@/lib/news/ai/ranking";
import { parseSearchQuery } from "@/lib/search/query-parser";
import { expandFuzzyTokens } from "@/lib/search/fuzzy";
import type {
  ParsedSearchQuery,
  SearchDistrict,
  SearchHit,
  SearchFilters,
} from "@/lib/search/types";
import type { GeneratedArticleRow } from "@/lib/types/newsroom";
import type { HomeSectionId } from "@/lib/homepage/types";

export type SearchDocument = {
  id: string;
  slug: string;
  headline: string;
  summary: string;
  excerpt: string;
  fullText: string;
  tags: string[];
  section: HomeSectionId;
  district: SearchDistrict | null;
  language: string;
  publishedAt: string;
  readingTime: string | null;
  heroImageUrl: string | null;
  priorityScore: number;
  tokens: string[];
  vector: SparseVector;
};

export type SearchIndex = {
  documents: SearchDocument[];
  inverted: Map<string, Set<string>>;
  vocabulary: Set<string>;
  idf: Map<string, number>;
  builtAt: string;
};

const DISTRICT_PATTERNS: Record<SearchDistrict, RegExp> = {
  raipur: /raipur|रायपुर|naya raipur/i,
  bilaspur: /bilaspur|बिलासपुर/i,
  bastar: /bastar|बस्तर|jagdalpur/i,
  durg: /durg|दुर्ग/i,
  bhilai: /bhilai|भिलाई/i,
  korba: /korba|कोरबा/i,
  jagdalpur: /jagdalpur|जगदलपुर/i,
  ambikapur: /ambikapur|अंबिकापुर|surguja/i,
  raigarh: /raigarh|रायगढ़/i,
  chhattisgarh: /chhattisgarh|chattisgarh|छत्तीसगढ|cg\b/i,
};

function inferDistrict(text: string, section: HomeSectionId): SearchDistrict | null {
  for (const [district, re] of Object.entries(DISTRICT_PATTERNS)) {
    if (re.test(text)) return district as SearchDistrict;
  }
  if (section === "raipur") return "raipur";
  if (section === "chhattisgarh") return "chhattisgarh";
  return null;
}

function hoursSince(iso: string): number {
  return (Date.now() - new Date(iso).getTime()) / 3_600_000;
}

export function buildSearchIndex(rows: GeneratedArticleRow[]): SearchIndex {
  const ranked = rankArticlesForHomepage(rows);
  const rankById = new Map(ranked.map((r) => [r.row.id, r.ranking.priorityScore]));

  const documents: SearchDocument[] = rows.map((row) => {
    const section = inferSection(row);
    const fullText = `${row.headline} ${row.summary ?? ""} ${row.article_body ?? ""} ${row.tags.join(" ")}`;
    const tokens = tokenizeForSimilarity(fullText);

    return {
      id: row.id,
      slug: row.slug,
      headline: row.headline,
      summary: row.summary?.trim() ?? "",
      excerpt: (row.summary ?? row.article_body ?? "").slice(0, 220),
      fullText,
      tags: row.tags,
      section,
      district: inferDistrict(fullText, section),
      language: row.language ?? "hi",
      publishedAt: row.published_at ?? row.created_at,
      readingTime: row.reading_time,
      heroImageUrl: row.hero_image_url,
      priorityScore: rankById.get(row.id) ?? 0,
      tokens,
      vector: new Map(),
    };
  });

  const docTokens = documents.map((d) => d.tokens);
  const idf = computeIdf(docTokens);

  for (const doc of documents) {
    doc.vector = buildTfIdfVector(doc.tokens, idf);
  }

  const inverted = new Map<string, Set<string>>();
  const vocabulary = new Set<string>();

  for (const doc of documents) {
    const unique = new Set(doc.tokens);
    for (const token of unique) {
      vocabulary.add(token);
      const set = inverted.get(token) ?? new Set();
      set.add(doc.id);
      inverted.set(token, set);
    }
  }

  return {
    documents,
    inverted,
    vocabulary,
    idf,
    builtAt: new Date().toISOString(),
  };
}

function passesFilters(
  doc: SearchDocument,
  parsed: ParsedSearchQuery,
  filters: SearchFilters
): boolean {
  const district = filters.district ?? parsed.district;
  const category = filters.category ?? parsed.category;
  const timeScope = filters.timeScope ?? parsed.timeScope;

  if (district) {
    const matchesDistrict =
      doc.district === district ||
      (district === "chhattisgarh" &&
        (doc.section === "chhattisgarh" || doc.section === "raipur")) ||
      DISTRICT_PATTERNS[district].test(doc.fullText);
    if (!matchesDistrict) return false;
  }

  if (category && doc.section !== category) {
    const topicMatch =
      category === "india" &&
      /politic|crime|government|चुनाव|सरकार/i.test(doc.fullText);
    if (!topicMatch) return false;
  }

  const hours = hoursSince(doc.publishedAt);
  if (timeScope === "today" && hours > 30) return false;
  if (timeScope === "week" && hours > 24 * 7) return false;

  return true;
}

function collectCandidateIds(
  index: SearchIndex,
  terms: string[]
): Set<string> {
  const ids = new Set<string>();

  for (const term of terms) {
    const exact = index.inverted.get(term);
    if (exact) exact.forEach((id) => ids.add(id));

    for (const fuzzy of expandFuzzyTokens(term, index.vocabulary)) {
      index.inverted.get(fuzzy)?.forEach((id) => ids.add(id));
    }
  }

  if (!ids.size && terms.length) {
    for (const doc of index.documents) {
      ids.add(doc.id);
    }
  }

  return ids;
}

function scoreDocument(
  doc: SearchDocument,
  queryTerms: string[],
  queryVector: SparseVector
): { score: number; reasons: string[] } {
  const reasons: string[] = [];
  let score = 0;

  const docTokenSet = new Set(doc.tokens);
  let termHits = 0;
  let fuzzyHits = 0;

  for (const term of queryTerms) {
    if (docTokenSet.has(term)) {
      termHits++;
      continue;
    }
    if (expandFuzzyTokens(term, docTokenSet).length) fuzzyHits++;
  }

  if (termHits) {
    score += termHits * 14;
    reasons.push("keyword_match");
  }
  if (fuzzyHits) {
    score += fuzzyHits * 8;
    reasons.push("typo_tolerant_match");
  }

  const semantic = cosineSimilarity(queryVector, doc.vector);
  score += semantic * 32;
  if (semantic > 0.25) reasons.push("semantic_similarity");

  if (doc.headline.toLowerCase().includes(queryTerms[0] ?? "")) {
    score += 10;
    reasons.push("headline_match");
  }

  score += doc.priorityScore * 0.22;
  if (doc.priorityScore > 70) reasons.push("editorial_priority");

  const hours = hoursSince(doc.publishedAt);
  if (hours <= 24) {
    score += 8;
    reasons.push("fresh_story");
  }

  return { score, reasons: [...new Set(reasons)] };
}

export function searchIndex(
  index: SearchIndex,
  rawQuery: string,
  filters: SearchFilters = {}
): { hits: SearchHit[]; parsed: ParsedSearchQuery } {
  const parsed = parseSearchQuery(rawQuery);
  const terms =
    parsed.cleanTerms.length > 0
      ? parsed.cleanTerms
      : tokenizeForSimilarity(parsed.raw);

  const queryVector = buildTfIdfVector(
    terms.length ? terms : tokenizeForSimilarity("chhattisgarh news"),
    index.idf
  );

  const candidateIds = collectCandidateIds(index, terms);

  const scored: SearchHit[] = [];

  for (const doc of index.documents) {
    if (!candidateIds.has(doc.id)) continue;
    if (!passesFilters(doc, parsed, filters)) continue;

    const { score, reasons } = scoreDocument(doc, terms, queryVector);
    if (score < 4 && terms.length > 0) continue;

    scored.push({
      id: doc.id,
      slug: doc.slug,
      headline: doc.headline,
      summary: doc.excerpt,
      imageUrl: doc.heroImageUrl,
      section: doc.section,
      district: doc.district,
      publishedAt: doc.publishedAt,
      readingTime: doc.readingTime,
      score: Math.round(score * 10) / 10,
      matchReasons: reasons,
    });
  }

  scored.sort((a, b) => b.score - a.score);

  const limit = filters.limit ?? 20;

  return {
    hits: scored.slice(0, limit),
    parsed,
  };
}
