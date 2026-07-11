import { describe, expect, it } from "vitest";
import {
  AUTONOMOUS_ALLOWED_FIELDS,
  AUTONOMOUS_PROHIBITED_FIELDS,
  validatePolicy,
} from "@/lib/seo-autonomous/policy-engine";
import type { SeoActionDraft } from "@/lib/seo-autonomous/types";

function draft(overrides: Partial<SeoActionDraft> = {}): SeoActionDraft {
  return {
    external_key: "test:1",
    action_type: "meta_description",
    article_id: "a1",
    article_slug: "test-article",
    field_key: "seo_description",
    current_value: "old",
    suggested_value: "new meta description for SEO",
    reason: "improve CTR",
    confidence: 0.8,
    expected_impact: "CTR +5%",
    rollback_strategy: "snapshot_restore",
    ...overrides,
  };
}

describe("policy-engine", () => {
  it("allows safe SEO fields above confidence threshold", () => {
    const result = validatePolicy(draft());
    expect(result.decision).toBe("allowed");
  });

  it("rejects prohibited fields", () => {
    const result = validatePolicy(draft({ field_key: "article_body" }));
    expect(result.decision).toBe("rejected");
    expect(AUTONOMOUS_PROHIBITED_FIELDS.has("article_body")).toBe(true);
  });

  it("rejects low confidence actions", () => {
    const result = validatePolicy(draft({ confidence: 0.5 }));
    expect(result.decision).toBe("rejected");
  });

  it("rejects slug modifications", () => {
    const result = validatePolicy(draft({ field_key: "slug" }));
    expect(result.decision).toBe("rejected");
  });

  it("allowlist includes meta and schema fields", () => {
    expect(AUTONOMOUS_ALLOWED_FIELDS.has("seo_title")).toBe(true);
    expect(AUTONOMOUS_ALLOWED_FIELDS.has("faq_schema")).toBe(true);
    expect(AUTONOMOUS_ALLOWED_FIELDS.has("related_slugs")).toBe(true);
  });
});
