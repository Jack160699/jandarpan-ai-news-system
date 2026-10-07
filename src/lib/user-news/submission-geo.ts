/**
 * Geography for a user submission.
 *
 * The AI may SUGGEST a place and the author may CORRECT it, but only evidence in the text can make a story district-specific.
 * A district the author merely types in a form field is a claim, not proof: it is recorded as `declaredDistrict` and the story is
 * published as statewide / unknown-district content until a moderator confirms it. A district is never invented and unknown is never
 * silently turned into one.
 *
 * Uses the same classifier as the editorial pipeline (classifyGeoScope), so a user story and an AI-written story are held to the
 * same standard and appear in exactly the same feeds.
 */

import { classifyGeoScope, isPublishableScope, type GeoScope } from "@/lib/news/geo/geo-scope";
import { getDistrict } from "@/lib/regional/districts";

export type SubmissionGeo = {
  scope: GeoScope;
  /** Set only when the TEXT proves the district (or a moderator confirmed the declared one). */
  districtSlug: string | null;
  districts: string[];
  confidence: number;
  method: string;
  /** What the author typed/selected, kept for the moderator even when it is not proven. */
  declaredDistrict: string | null;
  /** The declared district contradicts what the text proves, or has no support in it. */
  declaredDistrictStatus: "none" | "confirmed_by_text" | "unverified" | "conflicts_with_text" | "confirmed_by_moderator";
  publishable: boolean;
  reasons: string[];
};

export function resolveSubmissionGeo(input: {
  headline: string;
  summary?: string | null;
  body?: string | null;
  location?: string | null;
  declaredDistrict?: string | null;
  /** Set by a moderator who verified the declared district. */
  moderatorConfirmedDistrict?: string | null;
}): SubmissionGeo {
  const evidence = classifyGeoScope({
    title: input.headline,
    description: [input.summary, input.location].filter(Boolean).join(" "),
    body: input.body ?? null,
  });
  const reasons: string[] = [];

  const declared = input.declaredDistrict ? (getDistrict(input.declaredDistrict)?.slug ?? null) : null;
  if (input.declaredDistrict && !declared) reasons.push("declared_district_not_recognised");

  let scope = evidence.scope;
  let districtSlug = evidence.districtSlug;
  let districts = evidence.districts;
  let declaredStatus: SubmissionGeo["declaredDistrictStatus"] = "none";

  const confirmed = input.moderatorConfirmedDistrict ? (getDistrict(input.moderatorConfirmedDistrict)?.slug ?? null) : null;

  if (declared) {
    if (evidence.scope === "DISTRICT_SPECIFIC" && (evidence.districtSlug === declared || evidence.districts.includes(declared))) {
      declaredStatus = "confirmed_by_text";
    } else if (evidence.scope === "DISTRICT_SPECIFIC" && evidence.districtSlug && evidence.districtSlug !== declared) {
      declaredStatus = "conflicts_with_text";
      reasons.push(`declared_${declared}_but_text_names_${evidence.districtSlug}`);
    } else {
      declaredStatus = "unverified";
      reasons.push("declared_district_has_no_support_in_text");
    }
  }

  if (confirmed && declared === confirmed) {
    declaredStatus = "confirmed_by_moderator";
    scope = "DISTRICT_SPECIFIC";
    districtSlug = confirmed;
    districts = [confirmed];
    reasons.push("district_confirmed_by_moderator");
  }

  return {
    scope,
    districtSlug: scope === "DISTRICT_SPECIFIC" ? districtSlug : null,
    districts: scope === "DISTRICT_SPECIFIC" ? districts : [],
    confidence: evidence.confidence,
    method: evidence.method,
    declaredDistrict: declared,
    declaredDistrictStatus: declaredStatus,
    publishable: isPublishableScope(scope),
    reasons,
  };
}

/** A story may appear on a district page only with proven or moderator-confirmed geography. */
export function canPublishAsDistrict(geo: SubmissionGeo): boolean {
  return geo.scope === "DISTRICT_SPECIFIC" && geo.districtSlug !== null && geo.declaredDistrictStatus !== "conflicts_with_text";
}

/** The geo_metadata written onto the published generated_articles row, in the exact shape the feeds read. */
export function toGeoMetadata(geo: SubmissionGeo, now: Date = new Date()): Record<string, unknown> {
  return {
    state: "chhattisgarh",
    scope: geo.scope,
    scope_confidence: geo.confidence,
    scope_method: `user_submission:${geo.method}`,
    primary_district: geo.districtSlug,
    districts: geo.districts,
    is_chhattisgarh: geo.scope === "DISTRICT_SPECIFIC" || geo.scope === "STATEWIDE_CHHATTISGARH" || geo.scope === "INDIA_RELEVANT_TO_CHHATTISGARH",
    classification_kind: geo.scope === "DISTRICT_SPECIFIC" ? "district" : geo.scope === "STATEWIDE_CHHATTISGARH" ? "statewide" : "other",
    declared_district: geo.declaredDistrict,
    declared_district_status: geo.declaredDistrictStatus,
    tagged_at: now.toISOString(),
  };
}
