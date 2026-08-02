/**
 * Fact pack — consolidates what the pipeline already knows about a
 * news_event (sources, entities, district, dates, numbers, quotes) into one
 * structured object. Two consumers:
 *  1. generate-article.ts injects it into the writer prompt as JSON context
 *     and passes it to the independent reviewer.
 *  2. generated-article-validation.ts (validateClaimsAgainstFactPack) uses
 *     it as ground truth to catch claims in the draft that don't trace back
 *     to anything the pipeline actually extracted — a fabrication safety net.
 *
 * This module deliberately does NOT re-implement entity/district extraction;
 * it calls the existing extractors (detectEditorialEntities, tagGeoFromContent,
 * scoreSourceConfidence, extractSignificantNumbers) and assembles their output.
 */

import { scoreSourceConfidence } from "@/lib/news/ai/event-clustering";
import { detectEditorialEntities } from "@/lib/news/ai/editorial-image-entities";
import { extractSignificantNumbers } from "@/lib/autonomous/claim-number-scan";
import { districtRelevanceInput } from "@/lib/autonomous/human-quality-score";
import { tagGeoFromContent } from "@/lib/regional/geo-tagging";
import { getDistrict } from "@/lib/regional/districts";
import { createAdminServerClient } from "@/lib/supabase";
import { asJson } from "@/types/json";
import type { NewsEventRow, NewsSignalRow } from "@/lib/types/newsroom";

export type FactPackSource = {
  name: string | null;
  url: string;
  publishedAt: string | null;
  headline: string;
};

export type FactPackQuote = {
  text: string;
  attributedTo: string | null;
};

export type SensitiveCategory =
  | "crime"
  | "courts"
  | "elections"
  | "political_allegations"
  | "communal"
  | "health_claims"
  | "financial_claims"
  | "government_decisions"
  | "accusations";

export type FactPack = {
  eventId: string;
  sources: FactPackSource[];
  people: string[];
  organizations: string[];
  district: string | null;
  location: string | null;
  dates: string[];
  numbers: string[];
  quotes: FactPackQuote[];
  /**
   * No cross-source claim-comparison module exists anywhere in this codebase
   * yet (checked src/lib/news/ai and src/lib/autonomous) — left empty rather
   * than fabricating heuristic conflict detection out of scope for this task.
   */
  conflictingClaims: string[];
  primarySourceIndicator: boolean;
  /** 0-1, mean of scoreSourceConfidence() across the event's signals */
  sourceReliability: number;
  sensitiveCategory: SensitiveCategory | null;
  freshnessHours: number;
  /** 0-1, from districtRelevanceInput() */
  chhattisgarhRelevance: number;
  supportingExcerpts: string[];
  builtAt: string;
};

const MONTHS_EN =
  "january|february|march|april|may|june|july|august|september|october|november|december|jan|feb|mar|apr|jun|jul|aug|sep|sept|oct|nov|dec";
const MONTHS_HI =
  "जनवरी|फरवरी|मार्च|अप्रैल|मई|जून|जुलाई|अगस्त|सितंबर|अक्टूबर|नवंबर|दिसंबर";

/** Simple regex date pass — numeric dates + "DD Month[ YYYY]" / "Month DD[, YYYY]" in EN/HI */
const DATE_RE = new RegExp(
  [
    String.raw`\b\d{1,2}[\/\-.]\d{1,2}[\/\-.]\d{2,4}\b`,
    String.raw`\b\d{4}-\d{2}-\d{2}\b`,
    String.raw`\b\d{1,2}\s+(?:${MONTHS_EN})\.?\s*,?\s*\d{0,4}\b`,
    String.raw`\b(?:${MONTHS_EN})\.?\s+\d{1,2}(?:st|nd|rd|th)?,?\s*\d{0,4}\b`,
    String.raw`\b\d{1,2}\s+(?:${MONTHS_HI})\s*\d{0,4}\b`,
  ].join("|"),
  "gi"
);

export function extractDateMentions(text: string): string[] {
  const matches = text.match(DATE_RE) ?? [];
  const out: string[] = [];
  const seen = new Set<string>();
  for (const m of matches) {
    const norm = m.trim().replace(/\s+/g, " ");
    const key = norm.toLowerCase();
    if (!norm || seen.has(key)) continue;
    seen.add(key);
    out.push(norm);
  }
  return out;
}

/** Raw quoted spans (no attribution requirement) — shared with draft-side validation. */
export function extractQuotedSpans(text: string): string[] {
  const re = /["“]([^"”]{8,300})["”]/g;
  const out: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    const q = m[1]?.trim();
    if (q && q.length >= 8) out.push(q);
  }
  return out;
}

const ATTRIBUTION_HINT_RE =
  /\b(said|told|stated|according to|says|quoted)\b|ने\s*कहा|कहा\s*कि|के\s*अनुसार|बताया/i;
const NAME_THEN_SAID_RE =
  /([A-Z][a-zA-Z.]{1,}(?:\s+[A-Z][a-zA-Z.]{1,}){0,3})\s+(?:said|told|stated)/;
const SAID_THEN_NAME_RE =
  /(?:said|told|stated)\s+([A-Z][a-zA-Z.]{1,}(?:\s+[A-Z][a-zA-Z.]{1,}){0,3})/;

/**
 * Attributable quotations — quoted text with a nearby "said"/"told"/Hindi
 * equivalent. Deliberately simple heuristic, not a real quote-attribution
 * parser: quotes without an attribution hint nearby are skipped entirely
 * rather than guessed at.
 */
export function extractAttributableQuotes(text: string): FactPackQuote[] {
  const quotes: FactPackQuote[] = [];
  const seen = new Set<string>();
  const re = /["“]([^"”]{8,300})["”]/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(text)) !== null) {
    const quoteText = match[1]?.trim();
    if (!quoteText || quoteText.length < 8) continue;
    const start = match.index;
    const end = start + match[0].length;
    const windowBefore = text.slice(Math.max(0, start - 80), start);
    const windowAfter = text.slice(end, Math.min(text.length, end + 80));
    if (!ATTRIBUTION_HINT_RE.test(`${windowBefore} ${windowAfter}`)) continue;

    const nameMatch =
      NAME_THEN_SAID_RE.exec(windowAfter) ||
      SAID_THEN_NAME_RE.exec(windowAfter) ||
      NAME_THEN_SAID_RE.exec(windowBefore) ||
      SAID_THEN_NAME_RE.exec(windowBefore);
    const attributedTo = nameMatch?.[1]?.trim() ?? null;

    const key = quoteText.toLowerCase().slice(0, 120);
    if (seen.has(key)) continue;
    seen.add(key);
    quotes.push({ text: quoteText, attributedTo });
  }
  return quotes.slice(0, 12);
}

const PRIMARY_SOURCE_RE =
  /\bpib\b|gov\.in|government press|ministry|मंत्रालय|सरकार(ी)?\s*(बयान|आदेश)|official\s+statement|press\s+release|प्रेस\s*विज्ञप्ति/i;

function computePrimarySourceIndicator(signals: NewsSignalRow[]): boolean {
  return signals.some((s) =>
    PRIMARY_SOURCE_RE.test(`${s.source ?? ""} ${s.provider ?? ""} ${s.article_url ?? ""}`)
  );
}

function computeSourceReliability(signals: NewsSignalRow[]): number {
  if (!signals.length) return 0;
  const total = signals.reduce((sum, s) => sum + scoreSourceConfidence(s), 0);
  return Math.round((total / signals.length) * 1000) / 1000;
}

function computeFreshnessHours(event: NewsEventRow, signals: NewsSignalRow[]): number {
  const timestamps = signals
    .map((s) => (s.published_at ? new Date(s.published_at).getTime() : NaN))
    .filter((t) => !Number.isNaN(t));
  const fallback = new Date(event.created_at ?? Date.now()).getTime();
  const newest = timestamps.length ? Math.max(...timestamps) : fallback;
  if (!newest || Number.isNaN(newest)) return 0;
  return Math.max(0, Math.round(((Date.now() - newest) / 3_600_000) * 100) / 100);
}

/** Priority-ordered — first category whose pattern matches wins. */
const SENSITIVE_CATEGORY_PATTERNS: Array<{ category: SensitiveCategory; re: RegExp }> = [
  {
    category: "communal",
    re: /\b(communal|sectarian|riot|religious\s+violence|mob\s+lynch)\b|सांप्रदायिक|दंगा|धार्मिक\s*हिंसा|भीड़\s*हिंसा/i,
  },
  {
    category: "crime",
    re: /\b(murder|homicide|killed|killing|assault|rape|molest|kidnapp|loot|robbery|theft|crime|arrest|FIR)\b|हत्या|बलात्कार|अपहरण|लूट|चोरी|अपराध|गिरफ्तार|एफआईआर/i,
  },
  {
    category: "courts",
    re: /\b(court|verdict|bail|conviction|acquittal|\bPIL\b|writ\s+petition|supreme\s+court|high\s+court)\b|अदालत|न्यायालय|फैसला|जमानत|सजा|बरी/i,
  },
  {
    category: "elections",
    re: /\b(election|ballot|EVMs?|voting|booth\s*captur)\b|चुनाव|मतदान|ईवीएम/i,
  },
  {
    category: "political_allegations",
    re: /\b(alleg(ed|ation|es)|accused\s+of|charges?\s+of|scam|corruption)\b|आरोप|अभियुक्त|कथित|भ्रष्टाचार/i,
  },
  {
    category: "health_claims",
    re: /\b(outbreak|epidemic|pandemic|contagious|fatalit(y|ies)|deaths?\s+from|food\s+poisoning|vaccine\s+claim)\b|महामारी|संक्रमण|मृत्यु\s*दर/i,
  },
  {
    category: "financial_claims",
    re: /\b(scam|fraud|embezzl|insider\s+trading|ponzi|bank\s+failure|loan\s+default)\b|घोटाला|धोखाधड़ी|गबन/i,
  },
  {
    category: "government_decisions",
    re: /\b(cabinet\s+decision|government\s+order|notification|policy\s+announcement|scheme\s+launch)\b|सरकारी\s*आदेश|कैबिनेट\s*निर्णय|योजना\s*शुरू/i,
  },
  {
    category: "accusations",
    re: /\b(accus\w*|blame[d]?)\b|आरोप\s*लगाया/i,
  },
];

function classifySensitiveCategory(text: string): SensitiveCategory | null {
  for (const { category, re } of SENSITIVE_CATEGORY_PATTERNS) {
    if (re.test(text)) return category;
  }
  return null;
}

function buildSources(signals: NewsSignalRow[]): FactPackSource[] {
  const seen = new Set<string>();
  const out: FactPackSource[] = [];
  for (const s of signals) {
    const url = (s.article_url ?? "").trim();
    const key = url || s.title;
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push({
      name: s.source ?? s.provider ?? null,
      url,
      publishedAt: s.published_at ?? null,
      headline: s.title,
    });
  }
  return out;
}

function buildEntitySets(
  event: NewsEventRow,
  signals: NewsSignalRow[]
): { people: string[]; organizations: string[] } {
  const bodyText = signals
    .map((s) => s.raw_content ?? s.title)
    .join(" ")
    .slice(0, 6000);
  const detected = detectEditorialEntities({
    headline: event.canonical_title,
    summary: event.event_summary,
    body: bodyText,
    category: event.category,
  });
  return { people: detected.people, organizations: detected.organizations };
}

function buildLocation(
  event: NewsEventRow,
  signals: NewsSignalRow[]
): { district: string | null; location: string | null; isChhattisgarh: boolean } {
  const body = [event.event_summary, ...signals.map((s) => s.raw_content ?? s.title)]
    .filter(Boolean)
    .join(" ")
    .slice(0, 6000);
  const geo = tagGeoFromContent({
    title: event.canonical_title,
    body,
    region: event.region,
    category: event.category,
  });
  const district = geo.primary_district;
  const districtName = district ? (getDistrict(district)?.name ?? district) : null;
  const location =
    districtName ?? (geo.is_chhattisgarh ? "Chhattisgarh" : geo.state === "india" ? "India" : null);
  return { district, location, isChhattisgarh: geo.is_chhattisgarh };
}

function buildNumbers(signals: NewsSignalRow[]): string[] {
  const text = signals.map((s) => `${s.title} ${s.raw_content ?? ""}`).join(" ");
  return extractSignificantNumbers(text).slice(0, 40);
}

function buildDates(event: NewsEventRow, signals: NewsSignalRow[]): string[] {
  const text = [event.event_summary ?? "", ...signals.map((s) => `${s.title} ${s.raw_content ?? ""}`)].join(
    " "
  );
  return extractDateMentions(text).slice(0, 30);
}

function buildQuotes(signals: NewsSignalRow[]): FactPackQuote[] {
  const text = signals.map((s) => s.raw_content ?? "").join("\n");
  return extractAttributableQuotes(text);
}

function buildSupportingExcerpts(signals: NewsSignalRow[]): string[] {
  const ranked = [...signals].sort((a, b) => scoreSourceConfidence(b) - scoreSourceConfidence(a));
  return ranked.slice(0, 5).map((s) => {
    const raw = (s.raw_content ?? s.title).trim();
    return raw.length > 240 ? `${raw.slice(0, 240).trim()}…` : raw;
  });
}

export function buildFactPack(input: { event: NewsEventRow; signals: NewsSignalRow[] }): FactPack {
  const { event, signals } = input;
  const { people, organizations } = buildEntitySets(event, signals);
  const { district, location, isChhattisgarh } = buildLocation(event, signals);
  const combinedText = [
    event.canonical_title,
    event.event_summary ?? "",
    ...signals.map((s) => `${s.title} ${s.raw_content ?? ""}`),
  ].join(" ");

  return {
    eventId: event.id,
    sources: buildSources(signals),
    people,
    organizations,
    district,
    location,
    dates: buildDates(event, signals),
    numbers: buildNumbers(signals),
    quotes: buildQuotes(signals),
    conflictingClaims: [],
    primarySourceIndicator: computePrimarySourceIndicator(signals),
    sourceReliability: computeSourceReliability(signals),
    sensitiveCategory: classifySensitiveCategory(combinedText),
    freshnessHours: computeFreshnessHours(event, signals),
    chhattisgarhRelevance: districtRelevanceInput({ is_chhattisgarh: isChhattisgarh, primary_district: district }, event.region),
    supportingExcerpts: buildSupportingExcerpts(signals),
    builtAt: new Date().toISOString(),
  };
}

/**
 * Best-effort persist into news_events.fact_pack (added by migration
 * 20260802140000_070_ai_provider_quota_and_newsroom_audit.sql, not yet
 * reflected in generated Supabase types — same `as never` escape hatch used
 * elsewhere in this codebase for pre-migration columns/tables, e.g.
 * persistEvidenceLedgerOptional in generate-article.ts). Never throws —
 * article generation must not depend on this write succeeding.
 */
export async function persistFactPack(eventId: string, factPack: FactPack): Promise<void> {
  try {
    const supabase = createAdminServerClient();
    const { error } = await supabase
      .from("news_events")
      .update({ fact_pack: asJson(factPack) } as never)
      .eq("id", eventId);
    if (error) {
      console.warn("[fact-pack] persist_failed", error.message);
    }
  } catch (err) {
    console.warn("[fact-pack] persist_failed", err instanceof Error ? err.message : err);
  }
}
