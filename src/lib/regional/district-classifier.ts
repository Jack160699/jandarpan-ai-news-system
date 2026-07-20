/**
 * District content classifier — statewide / multi / single / unknown / non-CG.
 * Never forces Raipur for state-government-only copy.
 */

import { CG_DISTRICTS, CG_STATE_SLUG, getDistrict } from "@/lib/regional/districts";

export type DistrictClassificationKind =
  | "district"
  | "statewide"
  | "multi_district"
  | "unknown"
  | "non_cg";

export type DistrictClassification = {
  kind: DistrictClassificationKind;
  districtSlug?: string;
  districtId?: string;
  confidence: number;
  matchedTerms: string[];
  method: string;
  ambiguity: boolean;
  alternatives: Array<{ slug: string; confidence: number; terms: string[] }>;
};

export type ClassifyDistrictInput = {
  title: string;
  body?: string | null;
  region?: string | null;
  category?: string | null;
};

/** Aliases too weak to assign a primary district alone */
const WEAK_ALIASES = new Set(["capital"]);

const CG_STATE_RE =
  /\b(chhattisgarh|chattisgarh|छत्तीसगढ|छत्तीसगढ़|cg\b)\b/i;

/** State institutions — do NOT imply Raipur unless a district term also matches */
const STATEWIDE_INSTITUTION_RE =
  /\b(secretariat|cabinet|vidhan\s*sabha|विधान\s*सभा|mantralaya|मंत्रालय|chief\s*minister|मुख्यमंत्री|\bcm\b|state\s+government|राज्य\s*सरकार|cg\s+government|chhattisgarh\s+government|governor|राज्यपाल|assembly\s+session|legislative\s+assembly|mahanadi\s+bhawan|atal\s+nagar)\b/i;

const INDIA_NATIONAL_RE =
  /\b(delhi|mumbai|kolkata|parliament|lok\s*sabha|rajya\s*sabha|modi|centre|center\s+government|national\s+capital|maharashtra|uttar\s+pradesh|madhya\s+pradesh|bihar|rajasthan|gujarat|karnataka|tamil\s+nadu|west\s+bengal)\b/i;

const PRIMARY_MIN_CONFIDENCE = 0.65;
const STRONG_HIT_WEIGHT = 0.42;
const WEAK_HIT_WEIGHT = 0.12;

function normalizeBlob(parts: Array<string | null | undefined>): string {
  return parts.filter(Boolean).join(" ").toLowerCase();
}

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

type DistrictHit = {
  slug: string;
  strongHits: number;
  weakHits: number;
  terms: string[];
  confidence: number;
};

function scoreDistrictHits(blob: string): DistrictHit[] {
  const hits: DistrictHit[] = [];

  for (const district of CG_DISTRICTS) {
    let strongHits = 0;
    let weakHits = 0;
    const terms: string[] = [];

    for (const alias of district.aliases) {
      const re = new RegExp(`\\b${escapeRe(alias)}\\b`, "i");
      if (!re.test(blob)) continue;
      terms.push(alias);
      if (WEAK_ALIASES.has(alias.toLowerCase())) {
        weakHits++;
      } else {
        strongHits++;
      }
    }

    // Always treat official name + Hindi name as strong if present
    for (const term of [district.name, district.nameHi, district.slug.replace(/-/g, " ")]) {
      const re = new RegExp(`\\b${escapeRe(term)}\\b`, "i");
      if (re.test(blob) && !terms.some((t) => t.toLowerCase() === term.toLowerCase())) {
        terms.push(term);
        strongHits++;
      }
    }

    if (strongHits === 0 && weakHits === 0) continue;

    const confidence = Math.min(
      1,
      Math.round(
        (strongHits * STRONG_HIT_WEIGHT + weakHits * WEAK_HIT_WEIGHT + 0.2) * 100
      ) / 100
    );

    hits.push({
      slug: district.slug,
      strongHits,
      weakHits,
      terms,
      confidence,
    });
  }

  return hits.sort((a, b) => {
    if (b.strongHits !== a.strongHits) return b.strongHits - a.strongHits;
    if (b.confidence !== a.confidence) return b.confidence - a.confidence;
    return a.slug.localeCompare(b.slug);
  });
}

export function classifyDistrictContent(
  input: ClassifyDistrictInput
): DistrictClassification {
  const blob = normalizeBlob([input.title, input.body, input.region, input.category]);
  const hits = scoreDistrictHits(blob);
  const strongHits = hits.filter((h) => h.strongHits > 0);
  const textCg = CG_STATE_RE.test(blob);
  const regionCg =
    input.region?.toLowerCase() === "chhattisgarh" ||
    input.region?.toLowerCase() === "cg";
  const statewideInstitution = STATEWIDE_INSTITUTION_RE.test(blob);
  const categoryLocal = input.category?.toLowerCase() === "local";
  const isCgContext = textCg || regionCg || categoryLocal || strongHits.length > 0;

  const alternatives = strongHits.slice(0, 5).map((h) => ({
    slug: h.slug,
    confidence: h.confidence,
    terms: h.terms,
  }));

  // Multi-district: ≥2 strong district matches
  if (strongHits.length >= 2) {
    const top = strongHits[0];
    return {
      kind: "multi_district",
      districtSlug: top.confidence >= PRIMARY_MIN_CONFIDENCE ? top.slug : undefined,
      districtId: top.confidence >= PRIMARY_MIN_CONFIDENCE ? top.slug : undefined,
      confidence: Math.min(1, top.confidence),
      matchedTerms: strongHits.flatMap((h) => h.terms),
      method: "multi_strong_district",
      ambiguity: true,
      alternatives,
    };
  }

  // Single strong district
  if (strongHits.length === 1) {
    const top = strongHits[0];
    // Statewide institution alone must not override a real district match,
    // but weak-only / capital-only is handled by strongHits filter.
    return {
      kind: "district",
      districtSlug: top.slug,
      districtId: top.slug,
      confidence: top.confidence,
      matchedTerms: top.terms,
      method: "single_strong_district",
      ambiguity: false,
      alternatives,
    };
  }

  // Statewide: CG/state keywords or institutions without a specific district
  if (statewideInstitution || ((textCg || regionCg) && strongHits.length === 0)) {
    // Explicitly never force Raipur for secretariat/cabinet/vidhan sabha alone
    return {
      kind: "statewide",
      confidence: statewideInstitution ? 0.78 : textCg || regionCg ? 0.72 : 0.6,
      matchedTerms: [
        ...(statewideInstitution ? ["statewide_institution"] : []),
        ...(textCg || regionCg ? ["chhattisgarh"] : []),
      ],
      method: statewideInstitution
        ? "statewide_institution_no_district"
        : "cg_keywords_no_district",
      ambiguity: false,
      alternatives: [],
    };
  }

  // Weak-only matches (e.g. "capital") — do not assign Raipur
  if (hits.length > 0 && strongHits.length === 0) {
    if (isCgContext || statewideInstitution) {
      return {
        kind: "statewide",
        confidence: 0.55,
        matchedTerms: hits.flatMap((h) => h.terms),
        method: "weak_alias_only_no_force",
        ambiguity: true,
        alternatives: hits.slice(0, 3).map((h) => ({
          slug: h.slug,
          confidence: h.confidence,
          terms: h.terms,
        })),
      };
    }
  }

  if (INDIA_NATIONAL_RE.test(blob) && !isCgContext) {
    return {
      kind: "non_cg",
      confidence: 0.55,
      matchedTerms: ["national_or_other_state"],
      method: "national_non_cg",
      ambiguity: false,
      alternatives: [],
    };
  }

  return {
    kind: "unknown",
    confidence: 0.35,
    matchedTerms: [],
    method: "no_match",
    ambiguity: false,
    alternatives: [],
  };
}

export function classificationToDistrictSlug(
  classification: DistrictClassification
): string | null {
  if (classification.kind !== "district") return null;
  if ((classification.confidence ?? 0) < PRIMARY_MIN_CONFIDENCE) return null;
  const slug = classification.districtSlug;
  if (!slug || !getDistrict(slug)) return null;
  return slug;
}

export { PRIMARY_MIN_CONFIDENCE, CG_STATE_SLUG };
