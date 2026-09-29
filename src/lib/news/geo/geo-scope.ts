/**
 * Deterministic geography scope classification — runs BEFORE publication.
 *
 * DISTRICT_SPECIFIC               named Chhattisgarh district(s), proven by text
 * STATEWIDE_CHHATTISGARH          about Chhattisgarh as a whole (no single district)
 * INDIA_RELEVANT_TO_CHHATTISGARH  national story that explicitly involves Chhattisgarh
 * NATIONAL                        India-scope, no Chhattisgarh evidence
 * INTERNATIONAL                   foreign-scope evidence
 * UNKNOWN                         no usable evidence → quarantine, never published as a district story
 *
 * Built on the existing district classifier (src/lib/regional/district-classifier.ts);
 * this layer adds the national/international split and the feed-eligibility policy.
 * It never invents a district: `districtSlug` is only set from classifier evidence.
 */

import {
  classifyDistrictContent,
  PRIMARY_MIN_CONFIDENCE,
  type DistrictClassification,
} from "@/lib/regional/district-classifier";
import {
  CG_DIRECT_PUBLISHER_SOURCES,
  INDIA_NATIONAL_TERMS,
  INDIA_OTHER_PLACES,
  INTERNATIONAL_TERMS,
} from "@/lib/news/geo/geo-dictionaries";

export const GEO_SCOPES = [
  "DISTRICT_SPECIFIC",
  "STATEWIDE_CHHATTISGARH",
  "INDIA_RELEVANT_TO_CHHATTISGARH",
  "NATIONAL",
  "INTERNATIONAL",
  "UNKNOWN",
] as const;
export type GeoScope = (typeof GEO_SCOPES)[number];

export type GeoScopeInput = {
  title: string;
  description?: string | null;
  body?: string | null;
  /** Publisher / source key, e.g. "rss:ibc24-cg-direct". Weak evidence, only for CG-only publishers. */
  source?: string | null;
  /** Feed region hint (weak — never proof of place on its own). */
  region?: string | null;
  category?: string | null;
};

export type GeoScopeResult = {
  scope: GeoScope;
  /** Primary district slug — only set for DISTRICT_SPECIFIC with confidence ≥ PRIMARY_MIN_CONFIDENCE. */
  districtSlug: string | null;
  /** All districts with strong textual evidence. */
  districts: string[];
  confidence: number;
  method: string;
  evidence: string[];
};

const CG_TEXT_RE = /\b(chhattisgarh|chattisgarh)\b|छत्तीसगढ़?/i;

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function makeMatcher(terms: readonly string[]): (blob: string) => string[] {
  const compiled = terms.map((t) => {
    const term = t.trim().toLowerCase();
    const ascii = /^[\x00-\x7f]+$/.test(term);
    const re = ascii
      ? new RegExp(`(?<![a-z0-9])${escapeRe(term)}(?![a-z0-9])`, "i")
      : new RegExp(`(?<!\\p{L})${escapeRe(term)}(?!\\p{L})`, "iu");
    return { term, re };
  });
  return (blob) => compiled.filter((c) => c.re.test(blob)).map((c) => c.term);
}

const matchIndiaPlaces = makeMatcher(INDIA_OTHER_PLACES);
const matchIndiaNational = makeMatcher(INDIA_NATIONAL_TERMS);
const matchInternational = makeMatcher(INTERNATIONAL_TERMS);

function isCgDirectPublisher(source?: string | null): boolean {
  if (!source) return false;
  const s = source.toLowerCase();
  return CG_DIRECT_PUBLISHER_SOURCES.some((p) => s.includes(p));
}

function fromDistrictClassification(
  c: DistrictClassification,
  evidence: string[]
): GeoScopeResult | null {
  const districts = c.alternatives.map((a) => a.slug);
  if (c.kind === "district" && c.districtSlug) {
    if (c.confidence >= PRIMARY_MIN_CONFIDENCE) {
      return {
        scope: "DISTRICT_SPECIFIC",
        districtSlug: c.districtSlug,
        districts: districts.length ? districts : [c.districtSlug],
        confidence: c.confidence,
        method: c.method,
        evidence: [...evidence, ...c.matchedTerms],
      };
    }
    // A district term below the primary threshold is not proof of a district story.
    return null;
  }
  if (c.kind === "multi_district") {
    const primary = c.confidence >= PRIMARY_MIN_CONFIDENCE ? (c.districtSlug ?? null) : null;
    return {
      scope: primary ? "DISTRICT_SPECIFIC" : "STATEWIDE_CHHATTISGARH",
      districtSlug: primary,
      districts,
      confidence: c.confidence,
      method: c.method,
      evidence: [...evidence, ...c.matchedTerms],
    };
  }
  return null;
}

export function classifyGeoScope(input: GeoScopeInput): GeoScopeResult {
  // Evidence is title + description + body; the source/region are handled separately
  // and only ever as weak, non-district evidence.
  const text = [input.title, input.description, input.body].filter(Boolean).join(" ");
  const blob = text.toLowerCase();

  const district = classifyDistrictContent({
    title: input.title,
    body: [input.description, input.body].filter(Boolean).join(" "),
    region: input.region,
    category: input.category,
  });

  const cgText = CG_TEXT_RE.test(text);
  const indiaPlaces = matchIndiaPlaces(blob);
  const indiaNational = matchIndiaNational(blob);
  const international = matchInternational(blob);

  // 1. Proven district(s). Several Chhattisgarh district names also exist in other
  //    states (Bilaspur/HP, Raigarh/MH, Balod...). A district hit with no Chhattisgarh
  //    text and another state named next to it is NOT proof of a Chhattisgarh story.
  const districtResult = fromDistrictClassification(district, []);
  const otherStateConflict = !cgText && indiaPlaces.length > 0;
  if (districtResult && !(otherStateConflict && districtResult.confidence < 0.85)) {
    return districtResult;
  }

  // 2. Chhattisgarh named in the text.
  if (cgText || district.kind === "statewide") {
    const nationalContext = indiaPlaces.length > 0 || indiaNational.length > 0;
    // A national story that explicitly involves Chhattisgarh: relevant, but not a CG-local story.
    if (nationalContext && district.method !== "statewide_institution_no_district") {
      return {
        scope: "INDIA_RELEVANT_TO_CHHATTISGARH",
        districtSlug: null,
        districts: [],
        confidence: 0.7,
        method: "cg_named_in_national_context",
        evidence: ["chhattisgarh", ...indiaPlaces.slice(0, 3), ...indiaNational.slice(0, 3)],
      };
    }
    return {
      scope: "STATEWIDE_CHHATTISGARH",
      districtSlug: null,
      districts: [],
      confidence: district.kind === "statewide" ? district.confidence : 0.8,
      method: district.kind === "statewide" ? district.method : "cg_named_no_district",
      evidence: ["chhattisgarh", ...district.matchedTerms],
    };
  }

  // 3. Foreign evidence beats generic national evidence (e.g. "India-China talks" → both;
  //    international wins only when nothing places it in India specifically beyond "india").
  if (international.length > 0) {
    const strongIndia = indiaPlaces.length > 0;
    if (!strongIndia) {
      return {
        scope: "INTERNATIONAL",
        districtSlug: null,
        districts: [],
        confidence: Math.min(0.95, 0.7 + international.length * 0.05),
        method: "international_terms",
        evidence: international.slice(0, 5),
      };
    }
  }

  // 4. National evidence with no Chhattisgarh.
  if (indiaPlaces.length > 0 || indiaNational.length > 0) {
    return {
      scope: "NATIONAL",
      districtSlug: null,
      districts: [],
      confidence: Math.min(0.95, 0.7 + (indiaPlaces.length + indiaNational.length) * 0.03),
      method: "national_terms",
      evidence: [...indiaPlaces.slice(0, 3), ...indiaNational.slice(0, 3)],
    };
  }
  if (international.length > 0) {
    return {
      scope: "INTERNATIONAL",
      districtSlug: null,
      districts: [],
      confidence: 0.65,
      method: "international_terms_weak",
      evidence: international.slice(0, 5),
    };
  }

  // 5. CG-only publisher, no contradicting evidence → statewide (never a district).
  if (isCgDirectPublisher(input.source)) {
    return {
      scope: "STATEWIDE_CHHATTISGARH",
      districtSlug: null,
      districts: [],
      confidence: 0.5,
      method: "cg_direct_publisher_no_contrary_evidence",
      evidence: [`source:${input.source}`],
    };
  }

  return {
    scope: "UNKNOWN",
    districtSlug: null,
    districts: [],
    confidence: 0.2,
    method: input.region ? "weak_feed_hint_only" : "no_geo_evidence",
    evidence: input.region ? [`region_hint:${input.region}`] : [],
  };
}

// ---------------------------------------------------------------------------
// Feed policy
// ---------------------------------------------------------------------------

export type FeedKind =
  | "district" // /district/<slug>
  | "statewide" // Chhattisgarh statewide page
  | "cg_home" // default Live / Home / Latest (Chhattisgarh-first)
  | "national"
  | "international"
  | "all"; // admin / archive / search — no geo restriction

const FEED_ALLOWED: Record<FeedKind, readonly GeoScope[]> = {
  district: ["DISTRICT_SPECIFIC"],
  statewide: ["DISTRICT_SPECIFIC", "STATEWIDE_CHHATTISGARH"],
  cg_home: ["DISTRICT_SPECIFIC", "STATEWIDE_CHHATTISGARH", "INDIA_RELEVANT_TO_CHHATTISGARH"],
  national: ["NATIONAL", "INDIA_RELEVANT_TO_CHHATTISGARH"],
  international: ["INTERNATIONAL"],
  all: GEO_SCOPES,
};

export function isScopeAllowedInFeed(scope: GeoScope, feed: FeedKind): boolean {
  return FEED_ALLOWED[feed].includes(scope);
}

/** Only these scopes may be published at all. UNKNOWN is quarantined for evaluation. */
export function isPublishableScope(scope: GeoScope): boolean {
  return scope !== "UNKNOWN";
}

/**
 * A story belongs to a specific district's page only if that district has textual
 * evidence — never because the story is statewide/national/unknown.
 */
export function belongsToDistrictFeed(
  geo: Pick<GeoScopeResult, "scope" | "districtSlug" | "districts">,
  districtSlug: string
): boolean {
  if (geo.scope !== "DISTRICT_SPECIFIC") return false;
  return geo.districtSlug === districtSlug || geo.districts.includes(districtSlug);
}

/** Read the scope back off stored geo_metadata (generated_articles / news_signals). */
export function readStoredGeoScope(
  meta: Record<string, unknown> | null | undefined
): GeoScope | null {
  const s = meta?.scope;
  return typeof s === "string" && (GEO_SCOPES as readonly string[]).includes(s)
    ? (s as GeoScope)
    : null;
}

/**
 * Cap the share of INDIA_RELEVANT_TO_CHHATTISGARH in a Chhattisgarh-first list.
 * Keeps original order; excess relevant items are dropped from the tail.
 */
export function capIndiaRelevantShare<T extends { scope: GeoScope }>(
  items: readonly T[],
  maxShare = 0.2
): T[] {
  const out: T[] = [];
  let relevant = 0;
  for (const item of items) {
    if (item.scope === "INDIA_RELEVANT_TO_CHHATTISGARH") {
      // Allow a relevant item only if it keeps the running share within the cap.
      if ((relevant + 1) / (out.length + 1) > maxShare && out.length > 0) continue;
      relevant++;
    }
    out.push(item);
  }
  return out;
}
