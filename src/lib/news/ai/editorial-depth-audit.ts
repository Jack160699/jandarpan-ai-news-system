/**
 * Dry-run audit helpers for short / low-quality published bodies.
 * Used by scripts/audit-editorial-depth.ts — never mutates Production.
 */

import {
  classifyArticleType,
  type ArticleType,
  wordCount,
  paragraphCount,
  ARTICLE_DEPTH_RULES,
  depthRejectThreshold,
} from "@/lib/news/ai/article-type";
import {
  bodyEqualsExcerpt,
  findDuplicatedParagraphs,
  validateEditorialDepth,
} from "@/lib/news/ai/editorial-depth-quality";

export type EditorialDepthAuditIssueCode =
  | "body_shorter_than_type_threshold"
  | "body_equals_excerpt"
  | "one_paragraph_report"
  | "repeated_text"
  | "missing_context"
  | "malformed_structured_data"
  | "truncated_translation"
  | "empty_body";

export type EditorialDepthAuditRow = {
  id: string;
  headline: string | null;
  summary: string | null;
  article_body: string | null;
  language?: string | null;
  category?: string | null;
  region?: string | null;
  urgency_score?: number | null;
  editorial_metadata?: Record<string, unknown> | null;
  published_at?: string | null;
  source_count?: number | null;
};

export type EditorialDepthAuditFinding = {
  articleId: string;
  headline: string | null;
  articleType: ArticleType;
  words: number;
  paragraphs: number;
  codes: EditorialDepthAuditIssueCode[];
  details: string[];
  estimatedRegenCostUsd: number;
};

/** Rough gpt-4o-mini chat cost estimate for one regeneration */
export const ESTIMATED_REGEN_COST_USD = 0.004;

export function inferArticleTypeForAudit(row: EditorialDepthAuditRow): ArticleType {
  const meta = row.editorial_metadata ?? {};
  const stored = meta.article_type;
  if (
    typeof stored === "string" &&
    stored in ARTICLE_DEPTH_RULES
  ) {
    return stored as ArticleType;
  }

  const body = (row.article_body ?? "").trim();
  const classification = classifyArticleType({
    urgencyScore: row.urgency_score,
    signalCount: row.source_count ?? 2,
    factPackChars: Math.max(body.length, (row.summary ?? "").length * 3),
    category: row.category,
    canonicalTitle: row.headline,
    eventSummary: row.summary,
  });
  return classification.type;
}

export function auditEditorialDepthRow(
  row: EditorialDepthAuditRow
): EditorialDepthAuditFinding | null {
  const body = (row.article_body ?? "").trim();
  const summary = (row.summary ?? "").trim();
  const articleType = inferArticleTypeForAudit(row);
  const words = wordCount(body);
  const paragraphs = paragraphCount(body);
  const codes: EditorialDepthAuditIssueCode[] = [];
  const details: string[] = [];

  if (!body) {
    codes.push("empty_body");
    details.push("Missing article_body");
  } else {
    const minWords = depthRejectThreshold(articleType);
    if (words < minWords) {
      codes.push("body_shorter_than_type_threshold");
      details.push(
        `${words} words < ${minWords} for ${articleType} (target ${ARTICLE_DEPTH_RULES[articleType].targetWords})`
      );
    }
    if (bodyEqualsExcerpt(body, summary)) {
      codes.push("body_equals_excerpt");
      details.push("Body equals or near-equals summary");
    }
    if (paragraphs <= 1 && words < ARTICLE_DEPTH_RULES.standard_report.minWords) {
      codes.push("one_paragraph_report");
      details.push("Single-paragraph body");
    }
    const dupes = findDuplicatedParagraphs(body);
    if (dupes.length > 0) {
      codes.push("repeated_text");
      details.push(`Duplicated paragraphs: ${dupes.length}`);
    }
    // Missing context: no second/third development beyond dek for standard+ types
    if (
      (articleType === "standard_report" ||
        articleType === "explainer" ||
        articleType === "analysis") &&
      paragraphs < 3
    ) {
      codes.push("missing_context");
      details.push("Insufficient context paragraphs for article type");
    }
  }

  const meta = row.editorial_metadata;
  if (meta && typeof meta === "object") {
    const intel = meta.intelligence_v2;
    if (intel != null && typeof intel !== "object") {
      codes.push("malformed_structured_data");
      details.push("intelligence_v2 is not an object");
    }
    const translations = meta.translations as
      | Record<string, { article_body?: string }>
      | undefined;
    if (translations && typeof translations === "object") {
      for (const [lang, bundle] of Object.entries(translations)) {
        const tBody = bundle?.article_body?.trim() ?? "";
        if (tBody && body && tBody.length < Math.min(200, body.length * 0.35)) {
          codes.push("truncated_translation");
          details.push(`Translation ${lang} body looks truncated (${tBody.length} chars)`);
        }
      }
    }
  }

  // Also fold depth validator codes that map to audit categories
  const depth = validateEditorialDepth({
    articleBody: body,
    summary,
    articleType,
    factPackText: summary,
    language: row.language,
  });
  if (depth.codes.includes("null_undefined_artifact") || depth.codes.includes("markdown_artifact")) {
    if (!codes.includes("malformed_structured_data")) {
      codes.push("malformed_structured_data");
      details.push("Artifacts in body (null/undefined/markdown)");
    }
  }

  if (!codes.length) return null;

  return {
    articleId: row.id,
    headline: row.headline,
    articleType,
    words,
    paragraphs,
    codes: [...new Set(codes)],
    details,
    estimatedRegenCostUsd: ESTIMATED_REGEN_COST_USD,
  };
}

export function summarizeEditorialDepthAudit(
  findings: EditorialDepthAuditFinding[]
): {
  affectedCount: number;
  byCode: Record<string, number>;
  byType: Record<string, number>;
  estimatedTotalRegenCostUsd: number;
} {
  const byCode: Record<string, number> = {};
  const byType: Record<string, number> = {};
  for (const f of findings) {
    byType[f.articleType] = (byType[f.articleType] ?? 0) + 1;
    for (const c of f.codes) {
      byCode[c] = (byCode[c] ?? 0) + 1;
    }
  }
  return {
    affectedCount: findings.length,
    byCode,
    byType,
    estimatedTotalRegenCostUsd:
      Math.round(findings.length * ESTIMATED_REGEN_COST_USD * 1000) / 1000,
  };
}
