/**
 * Editorial intelligence V2 — structured fields from the primary generation LLM response.
 * Parsed and validated once at generation; no runtime AI.
 */

import { extractNamedEntities } from "@/lib/news/ai/entities";
import type { EditorialDraft } from "@/lib/news/ai/editorial-types";
import type { NewsEventRow, NewsSignalRow } from "@/lib/types/newsroom";

export const EDITORIAL_INTELLIGENCE_V2_VERSION = 2 as const;

export type EditorialEntityType =
  | "person"
  | "organization"
  | "location"
  | "program"
  | "other";

export type EditorialEntityV2 = {
  name: string;
  type: EditorialEntityType;
};

export type EditorialTimelineItemV2 = {
  label: string;
  detail: string;
  order: number;
};

export type EditorialIntelligenceV2 = {
  version: typeof EDITORIAL_INTELLIGENCE_V2_VERSION;
  takeaways: string[];
  why_this_matters: string | null;
  entities: EditorialEntityV2[];
  timeline: EditorialTimelineItemV2[] | null;
  reader_keywords: string[];
  generated_at: string;
};

/** Optional intelligence fields on the primary editorial LLM JSON response */
export type LlmEditorialIntelligenceFields = {
  takeaways?: unknown;
  why_this_matters?: unknown;
  entities?: unknown;
  timeline?: unknown;
  reader_keywords?: unknown;
};

const ENTITY_TYPES = new Set<EditorialEntityType>([
  "person",
  "organization",
  "location",
  "program",
  "other",
]);

const LOCATION_HINTS =
  /\b(raipur|bilaspur|bastar|durg|bhilai|korba|jagdalpur|raigarh|ambikapur|chhattisgarh|delhi|mumbai|india|district|जिला|रायपुर|बस्तर|छत्तीसगढ)\b/i;

const ORG_HINTS =
  /\b(ministry|government|court|police|election|commission|party|cabinet|department|प्रशासन|सरकार|पुलिस)\b/i;

const PROGRAM_HINTS =
  /\b(scheme|yojana|programme|program|mission|योजना|अभियान)\b/i;

const MAX_TAKEAWAYS = 5;
const MIN_TAKEAWAYS = 3;
const MIN_FALLBACK_TAKEAWAYS = 2;
const MAX_ENTITIES = 12;
const MAX_KEYWORDS = 10;
const MAX_TIMELINE = 8;
const MIN_WHY_CHARS = 40;
const MAX_WHY_CHARS = 520;
const MAX_TAKEAWAY_CHARS = 220;

function asString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeBullet(text: string): string {
  return text.replace(/^[-*•\d.)\s]+/, "").trim();
}

function inferEntityType(name: string): EditorialEntityType {
  const lower = name.toLowerCase();
  if (LOCATION_HINTS.test(lower)) return "location";
  if (ORG_HINTS.test(lower)) return "organization";
  if (PROGRAM_HINTS.test(lower)) return "program";
  if (/^[A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,2}$/.test(name.trim())) return "person";
  return "other";
}

function parseTakeaways(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  const items = raw
    .map((item) => normalizeBullet(asString(item)))
    .filter((item) => item.length >= 12 && item.length <= MAX_TAKEAWAY_CHARS);
  const unique = [...new Set(items)];
  if (unique.length < MIN_TAKEAWAYS) return [];
  return unique.slice(0, MAX_TAKEAWAYS);
}

function parseWhyThisMatters(raw: unknown): string | null {
  const text = asString(raw).replace(/\s+/g, " ");
  if (text.length < MIN_WHY_CHARS || text.length > MAX_WHY_CHARS) return null;
  return text;
}

function parseEntities(raw: unknown): EditorialEntityV2[] {
  if (!Array.isArray(raw)) return [];
  const out: EditorialEntityV2[] = [];
  const seen = new Set<string>();

  for (const item of raw) {
    if (out.length >= MAX_ENTITIES) break;

    if (typeof item === "string") {
      const name = item.trim();
      if (name.length < 2) continue;
      const key = name.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      out.push({ name, type: inferEntityType(name) });
      continue;
    }

    if (!item || typeof item !== "object") continue;
    const record = item as Record<string, unknown>;
    const name = asString(record.name);
    if (name.length < 2) continue;
    const key = name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);

    const typeRaw = asString(record.type).toLowerCase();
    const type = ENTITY_TYPES.has(typeRaw as EditorialEntityType)
      ? (typeRaw as EditorialEntityType)
      : inferEntityType(name);

    out.push({ name, type });
  }

  return out;
}

function parseTimeline(raw: unknown): EditorialTimelineItemV2[] | null {
  if (!Array.isArray(raw) || raw.length < 2) return null;

  const items: EditorialTimelineItemV2[] = [];

  for (let i = 0; i < raw.length && items.length < MAX_TIMELINE; i++) {
    const item = raw[i];
    if (!item || typeof item !== "object") continue;
    const record = item as Record<string, unknown>;
    const label = asString(record.label ?? record.time ?? record.date);
    const detail = asString(record.detail ?? record.event ?? record.text);
    if (label.length < 2 || detail.length < 8) continue;
    items.push({
      label: label.slice(0, 80),
      detail: detail.slice(0, 280),
      order: items.length + 1,
    });
  }

  return items.length >= 2 ? items : null;
}

function parseReaderKeywords(raw: unknown, tags: string[]): string[] {
  if (!Array.isArray(raw)) return [];
  const tagSet = new Set(tags.map((t) => t.toLowerCase()));
  const keywords = raw
    .map((item) => asString(item).toLowerCase().replace(/\s+/g, "-"))
    .filter((item) => item.length >= 2 && item.length <= 48);

  const unique = [...new Set(keywords)].filter((kw) => !tagSet.has(kw));
  return unique.slice(0, MAX_KEYWORDS);
}

function emptyIntelligence(generatedAt = new Date().toISOString()): EditorialIntelligenceV2 {
  return {
    version: EDITORIAL_INTELLIGENCE_V2_VERSION,
    takeaways: [],
    why_this_matters: null,
    entities: [],
    timeline: null,
    reader_keywords: [],
    generated_at: generatedAt,
  };
}

export function hasIntelligenceV2Content(
  intelligence: EditorialIntelligenceV2 | null | undefined
): boolean {
  if (!intelligence) return false;
  return (
    intelligence.takeaways.length > 0 ||
    Boolean(intelligence.why_this_matters) ||
    intelligence.entities.length > 0 ||
    (intelligence.timeline?.length ?? 0) > 0 ||
    intelligence.reader_keywords.length > 0
  );
}

/**
 * Parse and validate intelligence fields from the primary LLM JSON response.
 * Malformed optional fields are dropped; core generation is unaffected.
 */
export function parseEditorialIntelligenceV2(
  raw: LlmEditorialIntelligenceFields | null | undefined,
  options?: { tags?: string[]; generatedAt?: string }
): EditorialIntelligenceV2 | null {
  if (!raw || typeof raw !== "object") return null;

  const tags = (options?.tags ?? []).map((t) => t.trim().toLowerCase()).filter(Boolean);
  const generatedAt = options?.generatedAt ?? new Date().toISOString();

  const takeaways = parseTakeaways(raw.takeaways);
  const why_this_matters = parseWhyThisMatters(raw.why_this_matters);
  const entities = parseEntities(raw.entities);
  const timeline = parseTimeline(raw.timeline);
  const reader_keywords = parseReaderKeywords(raw.reader_keywords, tags);

  const intelligence: EditorialIntelligenceV2 = {
    version: EDITORIAL_INTELLIGENCE_V2_VERSION,
    takeaways,
    why_this_matters,
    entities,
    timeline,
    reader_keywords,
    generated_at: generatedAt,
  };

  return hasIntelligenceV2Content(intelligence) ? intelligence : null;
}

function entitiesFromText(text: string): EditorialEntityV2[] {
  return [...extractNamedEntities(text)]
    .slice(0, MAX_ENTITIES)
    .map((name) => ({
      name,
      type: inferEntityType(name),
    }));
}

/**
 * Deterministic fallback when the LLM JSON fails or omits intelligence fields.
 */
export function buildFallbackIntelligenceV2(input: {
  event: NewsEventRow;
  signals: NewsSignalRow[];
  draft: EditorialDraft;
}): EditorialIntelligenceV2 | null {
  const { event, signals, draft } = input;
  const generatedAt = new Date().toISOString();

  const takeaways = [...signals]
    .sort((a, b) => (b.title?.length ?? 0) - (a.title?.length ?? 0))
    .map((s) => s.title?.trim())
    .filter((title): title is string => Boolean(title && title.length >= 12))
    .slice(0, MAX_TAKEAWAYS);

  const whyCandidate =
    event.event_summary?.trim() ||
    (draft.summary.length >= MIN_WHY_CHARS ? draft.summary : null);

  const why_this_matters =
    whyCandidate && whyCandidate.length >= MIN_WHY_CHARS
      ? whyCandidate.slice(0, MAX_WHY_CHARS)
      : null;

  const entities = entitiesFromText(
    [draft.headline, draft.summary, draft.article_body].join("\n")
  );

  const tagSet = new Set(draft.tags.map((t) => t.toLowerCase()));
  const reader_keywords = [event.category, event.region]
    .map((value) => value?.trim().toLowerCase())
    .filter((value): value is string => Boolean(value && !tagSet.has(value)))
    .slice(0, MAX_KEYWORDS);

  const intelligence = {
    ...emptyIntelligence(generatedAt),
    takeaways:
      takeaways.length >= MIN_FALLBACK_TAKEAWAYS ? takeaways.slice(0, MAX_TAKEAWAYS) : [],
    why_this_matters,
    entities,
    reader_keywords,
  };

  return hasIntelligenceV2Content(intelligence) ? intelligence : null;
}

/** Read persisted V2 intelligence from editorial metadata (generation-time only). */
export function readEditorialIntelligenceV2(
  meta?: { intelligence_v2?: EditorialIntelligenceV2 | null } | null
): EditorialIntelligenceV2 | null {
  const v2 = meta?.intelligence_v2;
  if (!v2 || v2.version !== EDITORIAL_INTELLIGENCE_V2_VERSION) return null;
  return v2;
}
