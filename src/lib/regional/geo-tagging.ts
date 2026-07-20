/**
 * Geo-tagging — extract Chhattisgarh districts and state from text + region hints
 */

import { CG_STATE_SLUG } from "@/lib/regional/districts";
import {
  classifyDistrictContent,
  PRIMARY_MIN_CONFIDENCE,
} from "@/lib/regional/district-classifier";
import type { Json } from "@/types/supabase";
import type { JsonObject } from "@/types/json";

export type RegionalGeoMetadata = {
  state: typeof CG_STATE_SLUG | "india" | "unknown";
  districts: string[];
  primary_district: string | null;
  confidence: number;
  is_chhattisgarh: boolean;
  tagged_at: string;
  classification_kind?: string;
  classification_method?: string;
};

const CG_STATE_RE =
  /\b(chhattisgarh|chattisgarh|छत्तीसगढ|छत्तीसगढ़|cg\b)\b/i;

const INDIA_NATIONAL_RE =
  /\b(delhi|mumbai|kolkata|parliament|lok sabha|rajya sabha|modi|centre|center government|national capital)\b/i;

function normalizeBlob(parts: Array<string | null | undefined>): string {
  return parts.filter(Boolean).join(" ").toLowerCase();
}

export function matchDistrictsInText(blob: string): Array<{ slug: string; hits: number }> {
  const classification = classifyDistrictContent({ title: blob });
  if (classification.kind === "district" && classification.districtSlug) {
    return [
      {
        slug: classification.districtSlug,
        hits: Math.max(1, classification.matchedTerms.length),
      },
      ...classification.alternatives
        .filter((a) => a.slug !== classification.districtSlug)
        .map((a) => ({ slug: a.slug, hits: a.terms.length || 1 })),
    ];
  }
  if (classification.kind === "multi_district") {
    return classification.alternatives.map((a) => ({
      slug: a.slug,
      hits: a.terms.length || 1,
    }));
  }
  return [];
}

/**
 * Tag geo from content using the district classifier.
 * - kind=district + confidence ≥ 0.65 → primary_district set
 * - multi → districts[] filled; primary = best if ≥0.65 else null
 * - statewide → state=chhattisgarh, is_chhattisgarh=true, primary_district=null
 * - Never forces Raipur for state-govt-only
 */
export function tagGeoFromContent(input: {
  title: string;
  body?: string | null;
  region?: string | null;
  category?: string | null;
}): RegionalGeoMetadata {
  const classification = classifyDistrictContent(input);
  const tagged_at = new Date().toISOString();

  if (classification.kind === "statewide") {
    return {
      state: CG_STATE_SLUG,
      districts: [],
      primary_district: null,
      confidence: classification.confidence,
      is_chhattisgarh: true,
      tagged_at,
      classification_kind: classification.kind,
      classification_method: classification.method,
    };
  }

  if (classification.kind === "multi_district") {
    const districts = classification.alternatives.map((a) => a.slug);
    const best = classification.alternatives[0];
    const primary =
      best && best.confidence >= PRIMARY_MIN_CONFIDENCE ? best.slug : null;
    return {
      state: CG_STATE_SLUG,
      districts,
      primary_district: primary,
      confidence: classification.confidence,
      is_chhattisgarh: true,
      tagged_at,
      classification_kind: classification.kind,
      classification_method: classification.method,
    };
  }

  if (classification.kind === "district" && classification.districtSlug) {
    const primary =
      classification.confidence >= PRIMARY_MIN_CONFIDENCE
        ? classification.districtSlug
        : null;
    return {
      state: CG_STATE_SLUG,
      districts: [classification.districtSlug],
      primary_district: primary,
      confidence: classification.confidence,
      is_chhattisgarh: true,
      tagged_at,
      classification_kind: classification.kind,
      classification_method: classification.method,
    };
  }

  if (classification.kind === "non_cg") {
    return {
      state: "india",
      districts: [],
      primary_district: null,
      confidence: classification.confidence,
      is_chhattisgarh: false,
      tagged_at,
      classification_kind: classification.kind,
      classification_method: classification.method,
    };
  }

  // unknown — light heuristic fallback for region/category hints
  const blob = normalizeBlob([input.title, input.body, input.region, input.category]);
  const regionCg =
    input.region?.toLowerCase() === "chhattisgarh" ||
    input.region?.toLowerCase() === "cg";
  const textCg = CG_STATE_RE.test(blob);
  const categoryLocal = input.category?.toLowerCase() === "local";

  if (regionCg || textCg || categoryLocal) {
    return {
      state: CG_STATE_SLUG,
      districts: [],
      primary_district: null,
      confidence: Math.min(0.6, classification.confidence + 0.15),
      is_chhattisgarh: true,
      tagged_at,
      classification_kind: "statewide",
      classification_method: "unknown_cg_context",
    };
  }

  if (INDIA_NATIONAL_RE.test(blob)) {
    return {
      state: "india",
      districts: [],
      primary_district: null,
      confidence: 0.5,
      is_chhattisgarh: false,
      tagged_at,
      classification_kind: "non_cg",
      classification_method: "national_fallback",
    };
  }

  return {
    state: "unknown",
    districts: [],
    primary_district: null,
    confidence: classification.confidence,
    is_chhattisgarh: false,
    tagged_at,
    classification_kind: classification.kind,
    classification_method: classification.method,
  };
}

export function mergeGeoMetadata(
  ...tags: Array<RegionalGeoMetadata | null | undefined>
): RegionalGeoMetadata {
  const valid = tags.filter(Boolean) as RegionalGeoMetadata[];
  if (!valid.length) {
    return tagGeoFromContent({ title: "" });
  }

  const districtSet = new Set<string>();
  let best: RegionalGeoMetadata = valid[0];

  for (const tag of valid) {
    tag.districts.forEach((d) => districtSet.add(d));
    if (tag.confidence > best.confidence) best = tag;
  }

  const districts = [...districtSet];
  // Prefer best.primary only when classifier-grade; never invent Raipur
  const primary =
    best.primary_district && districts.includes(best.primary_district)
      ? best.primary_district
      : null;

  const isCg = valid.some((t) => t.is_chhattisgarh) || best.state === CG_STATE_SLUG;
  const anyStatewide = valid.some(
    (t) => t.classification_kind === "statewide" && !t.primary_district
  );

  return {
    state: isCg ? CG_STATE_SLUG : best.state,
    districts,
    primary_district: anyStatewide && districts.length === 0 ? null : primary,
    confidence: Math.min(
      1,
      valid.reduce((max, t) => Math.max(max, t.confidence), 0)
    ),
    is_chhattisgarh: isCg,
    tagged_at: new Date().toISOString(),
    classification_kind: best.classification_kind,
    classification_method: best.classification_method,
  };
}

export function geoFromRecord(
  row: {
    geo_metadata?: RegionalGeoMetadata | Json | null;
    editorial_metadata?: { regional?: RegionalGeoMetadata } | JsonObject | Json | null;
    ingestion_metadata?: { geo?: RegionalGeoMetadata } | JsonObject | Json | null;
    headline?: string;
    title?: string;
    summary?: string | null;
    article_body?: string | null;
    raw_content?: string | null;
    region?: string | null;
    category?: string | null;
    tags?: string[];
  }
): RegionalGeoMetadata {
  const direct = row.geo_metadata as RegionalGeoMetadata | undefined;
  if (direct?.tagged_at && direct.state) return direct;

  const editorial = (row.editorial_metadata as { regional?: RegionalGeoMetadata })
    ?.regional;
  if (editorial?.tagged_at) return editorial;

  const ingest = (row.ingestion_metadata as { geo?: RegionalGeoMetadata })?.geo;
  if (ingest?.tagged_at) return ingest;

  return tagGeoFromContent({
    title: row.headline ?? row.title ?? "",
    body: row.summary ?? row.article_body ?? row.raw_content,
    region: row.region ?? null,
    category: row.category ?? row.tags?.[0] ?? null,
  });
}

// Re-export classifier for callers that import from geo-tagging
export {
  classifyDistrictContent,
  type DistrictClassification,
  type ClassifyDistrictInput,
} from "@/lib/regional/district-classifier";
