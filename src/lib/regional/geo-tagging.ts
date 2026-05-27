/**
 * Geo-tagging — extract Chhattisgarh districts and state from text + region hints
 */

import { CG_DISTRICTS, CG_STATE_SLUG } from "@/lib/regional/districts";
import type { Json } from "@/types/supabase";
import type { JsonObject } from "@/types/json";

export type RegionalGeoMetadata = {
  state: typeof CG_STATE_SLUG | "india" | "unknown";
  districts: string[];
  primary_district: string | null;
  confidence: number;
  is_chhattisgarh: boolean;
  tagged_at: string;
};

const CG_STATE_RE =
  /\b(chhattisgarh|chattisgarh|छत्तीसगढ|छत्तीसगढ़|cg\b)\b/i;

const INDIA_NATIONAL_RE =
  /\b(delhi|mumbai|kolkata|parliament|lok sabha|rajya sabha|modi|centre|center government|national capital)\b/i;

function normalizeBlob(parts: Array<string | null | undefined>): string {
  return parts.filter(Boolean).join(" ").toLowerCase();
}

export function matchDistrictsInText(blob: string): Array<{ slug: string; hits: number }> {
  const matches: Array<{ slug: string; hits: number }> = [];

  for (const district of CG_DISTRICTS) {
    let hits = 0;
    for (const alias of district.aliases) {
      const re = new RegExp(`\\b${alias.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i");
      if (re.test(blob)) hits++;
    }
    if (hits > 0) matches.push({ slug: district.slug, hits });
  }

  return matches.sort((a, b) => b.hits - a.hits);
}

export function tagGeoFromContent(input: {
  title: string;
  body?: string | null;
  region?: string | null;
  category?: string | null;
}): RegionalGeoMetadata {
  const blob = normalizeBlob([input.title, input.body, input.region, input.category]);
  const districtMatches = matchDistrictsInText(blob);
  const districts = districtMatches.map((m) => m.slug);

  let state: RegionalGeoMetadata["state"] = "unknown";
  let confidence = 0.35;

  const regionCg =
    input.region?.toLowerCase() === "chhattisgarh" ||
    input.region?.toLowerCase() === "cg";
  const textCg = CG_STATE_RE.test(blob);
  const categoryLocal = input.category?.toLowerCase() === "local";

  if (regionCg || textCg || categoryLocal || districts.length > 0) {
    state = CG_STATE_SLUG;
    confidence = 0.55;
    if (regionCg) confidence += 0.2;
    if (textCg) confidence += 0.15;
    if (districts.length) confidence += Math.min(0.2, districts.length * 0.08);
    if (categoryLocal) confidence += 0.1;
  } else if (INDIA_NATIONAL_RE.test(blob)) {
    state = "india";
    confidence = 0.5;
  }

  const primary_district = districts[0] ?? null;
  confidence = Math.min(1, Math.round(confidence * 100) / 100);

  return {
    state,
    districts,
    primary_district,
    confidence,
    is_chhattisgarh: state === CG_STATE_SLUG,
    tagged_at: new Date().toISOString(),
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
  const primary =
    best.primary_district && districts.includes(best.primary_district)
      ? best.primary_district
      : districts[0] ?? null;

  const isCg = valid.some((t) => t.is_chhattisgarh) || best.state === CG_STATE_SLUG;

  return {
    state: isCg ? CG_STATE_SLUG : best.state,
    districts,
    primary_district: primary,
    confidence: Math.min(
      1,
      valid.reduce((max, t) => Math.max(max, t.confidence), 0)
    ),
    is_chhattisgarh: isCg,
    tagged_at: new Date().toISOString(),
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
