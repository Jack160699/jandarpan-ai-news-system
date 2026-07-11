/**
 * Policy Engine — allow only safe SEO modifications
 */

import type { PolicyDecision, SeoActionDraft } from "@/lib/seo-autonomous/types";
import { AUTONOMOUS_MIN_CONFIDENCE } from "@/lib/seo-autonomous/config";

/** Fields the autonomous engine may modify */
export const AUTONOMOUS_ALLOWED_FIELDS = new Set([
  "seo_title",
  "seo_description",
  "og_title",
  "og_description",
  "twitter_title",
  "twitter_description",
  "og_image",
  "related_slugs",
  "faq_schema",
  "image_alt",
  "breadcrumb_schema",
  "topic_metadata",
  "keyword_metadata",
]);

/** Never queue or execute these */
export const AUTONOMOUS_PROHIBITED_FIELDS = new Set([
  "slug",
  "seo_title_variant",
  "headline",
  "summary",
  "article_body",
  "hero_image_url",
  "published_at",
  "author",
  "image_caption",
  "suggested_expansion",
  "suggested_expansion_stats",
  "suggested_expansion_sections",
  "suggested_expansion_context",
  "image_title",
  "image_description",
]);

const PROHIBITED_CONTENT_PATTERNS = [
  /\d{4}-\d{2}-\d{2}/, // dates in content
  /source:/i,
  /quote:/i,
  /according to/i,
];

export interface PolicyResult {
  draft: SeoActionDraft;
  decision: PolicyDecision;
  reason: string;
}

export function validatePolicy(draft: SeoActionDraft): PolicyResult {
  if (AUTONOMOUS_PROHIBITED_FIELDS.has(draft.field_key)) {
    return {
      draft,
      decision: "rejected",
      reason: `field_key '${draft.field_key}' is prohibited`,
    };
  }

  if (!AUTONOMOUS_ALLOWED_FIELDS.has(draft.field_key)) {
    return {
      draft,
      decision: "rejected",
      reason: `field_key '${draft.field_key}' not in allowlist`,
    };
  }

  if (draft.confidence < AUTONOMOUS_MIN_CONFIDENCE) {
    return {
      draft,
      decision: "rejected",
      reason: `confidence ${draft.confidence} below threshold ${AUTONOMOUS_MIN_CONFIDENCE}`,
    };
  }

  if (!draft.suggested_value?.trim()) {
    return {
      draft,
      decision: "rejected",
      reason: "empty suggested_value",
    };
  }

  if (draft.suggested_value === draft.current_value) {
    return {
      draft,
      decision: "rejected",
      reason: "no change from current value",
    };
  }

  for (const pattern of PROHIBITED_CONTENT_PATTERNS) {
    if (
      draft.field_key !== "seo_description" &&
      pattern.test(draft.suggested_value)
    ) {
      return {
        draft,
        decision: "rejected",
        reason: "suggested value may alter factual/editorial content",
      };
    }
  }

  return {
    draft,
    decision: "allowed",
    reason: "passed policy validation",
  };
}

export function validatePolicies(drafts: SeoActionDraft[]): PolicyResult[] {
  return drafts.map(validatePolicy);
}

export function filterAllowed(drafts: SeoActionDraft[]): SeoActionDraft[] {
  return validatePolicies(drafts)
    .filter((r) => r.decision === "allowed")
    .map((r) => r.draft);
}
