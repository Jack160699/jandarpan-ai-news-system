/**
 * Publication gates — deterministic checks that run on every generated draft
 * BEFORE it can be published:
 *
 *   language   headline/summary/body script must match the article's language
 *   headline   not generic/placeholder/duplicate, specific enough to describe an event
 *   geography  scope classified from evidence; UNKNOWN is quarantined (never published)
 *
 * "reject" failures block publication (and feed the repair loop as failure codes);
 * "quarantine" failures persist the draft for evaluation but never auto-publish it.
 * Image generation is intentionally NOT a gate: text eligibility is independent of media.
 */

import { classifyGeoScope, isPublishableScope, type GeoScopeResult } from "@/lib/news/geo/geo-scope";
import type { JsonObject } from "@/types/json";
import { evaluateHeadlineQuality } from "@/lib/news/quality/headline-quality";
import {
  validateArticleLanguage,
  type EditorialLanguage,
} from "@/lib/news/quality/script-detect";

export type PublicationGateFailure = {
  code: string;
  severity: "reject" | "quarantine";
  detail: string;
};

export type PublicationGateInput = {
  language: EditorialLanguage;
  headline: string;
  summary?: string | null;
  body?: string | null;
  /** Ground-truth source text (signal titles + content) used as geography evidence. */
  sourceText?: string | null;
  sourceTitle?: string | null;
  source?: string | null;
  region?: string | null;
  category?: string | null;
  recentHeadlines?: readonly string[];
};

export type PublicationGateResult = {
  failures: PublicationGateFailure[];
  geo: GeoScopeResult;
  /** True when no failure of any severity exists. */
  passed: boolean;
  /** True when the draft may not be auto-published (reject OR quarantine). */
  blocksAutoPublish: boolean;
  /** True when the draft must be rejected outright (repair or drop). */
  mustReject: boolean;
};

export function evaluatePublicationGates(input: PublicationGateInput): PublicationGateResult {
  const failures: PublicationGateFailure[] = [];

  for (const f of validateArticleLanguage({
    language: input.language,
    headline: input.headline,
    summary: input.summary,
    body: input.body,
  })) {
    failures.push({ code: f.code, severity: "reject", detail: f.detail });
  }

  const hq = evaluateHeadlineQuality({
    headline: input.headline,
    language: input.language,
    recentHeadlines: input.recentHeadlines,
  });
  for (const code of hq.failures) {
    failures.push({
      code: `headline:${code}`,
      severity: "reject",
      detail: `headline failed quality check: ${code}`,
    });
  }

  // Geography evidence: the source material is ground truth; the draft is derived from it.
  const geo = classifyGeoScope({
    title: input.sourceTitle ?? input.headline,
    description: input.sourceText ?? input.summary,
    body: [input.summary, input.body].filter(Boolean).join("\n"),
    source: input.source,
    region: input.region,
    category: input.category,
  });
  if (!isPublishableScope(geo.scope)) {
    failures.push({
      code: "geo:unknown_scope",
      severity: "quarantine",
      detail: `no usable geographic evidence (${geo.method})`,
    });
  }

  const mustReject = failures.some((f) => f.severity === "reject");
  return {
    failures,
    geo,
    passed: failures.length === 0,
    blocksAutoPublish: failures.length > 0,
    mustReject,
  };
}

/** Compact JSON stored on the article for audit / admin failure center. */
export function gateAuditPayload(result: PublicationGateResult): JsonObject {
  return {
    passed: result.passed,
    failures: result.failures.map((f) => ({ code: f.code, severity: f.severity })),
    geo_scope: result.geo.scope,
    geo_method: result.geo.method,
    geo_confidence: result.geo.confidence,
    evaluated_at: new Date().toISOString(),
  };
}
