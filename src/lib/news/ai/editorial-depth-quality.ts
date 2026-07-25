/**
 * Editorial depth & factual-safety quality gates for generated bodies.
 */

import {
  type ArticleType,
  ARTICLE_DEPTH_RULES,
  depthRejectThreshold,
  paragraphCount,
  wordCount,
} from "@/lib/news/ai/article-type";
import { isDuplicateOfSummary } from "@/lib/news/ai/editorial-body";

export type DepthQualityCode =
  | "missing_body"
  | "body_equals_excerpt"
  | "body_too_short_for_type"
  | "insufficient_paragraphs"
  | "duplicated_paragraphs"
  | "summary_repeated_in_body"
  | "placeholder_text"
  | "unresolved_template_token"
  | "null_undefined_artifact"
  | "markdown_artifact"
  | "unsupported_quote"
  | "malformed_hindi_noise"
  | "factual_padding_suspected"
  | "insufficient_evidence_for_longform";

export type DepthQualityIssue = {
  code: DepthQualityCode;
  message: string;
  retryable: boolean;
};

export type DepthQualityResult = {
  ok: boolean;
  issues: DepthQualityIssue[];
  codes: DepthQualityCode[];
  retryable: boolean;
  metrics: {
    words: number;
    paragraphs: number;
    minWordsForType: number;
    articleType: ArticleType;
  };
};

const PLACEHOLDER_RE =
  /\b(TODO|TBD|lorem ipsum|placeholder|insert (fact|quote|detail)|\[your text\]|XXX+)\b/i;

const TEMPLATE_TOKEN_RE =
  /\{\{[^{}]+\}\}|\[\[[^[\]]+\]\]|<%[^%]+%>|\$\{[^}]+\}|<<[^>]+>>/;

const NULLISH_RE = /\b(undefined|null)\b/;

const MARKDOWN_ARTIFACT_RE =
  /```|^\s*#{1,6}\s*(सारांश|Background|Conclusion|Key Developments)\s*$/im;

/** Quoted spans that look invented when not present in fact pack */
const QUOTE_RE = /[“"]([^”"]{12,200})[”"]/g;

/** Broken single-glyph spam (rare); requires many consecutive 1-char Devanagari tokens */
const HINDI_NOISE_RE =
  /(?:^|\s)(?:[\u0900-\u097F]\s+){12,}[\u0900-\u097F](?=\s|$)/;

const PADDING_PHRASES_RE =
  /(इससे क्षेत्रीय विकास को नई दिशा मिलेगी|यह एक महत्वपूर्ण कदम है जो|निष्कर्षतः कहा जा सकता है कि|overall this shows that|in conclusion,? it is clear)/i;

const MAX_GENERATION_DEPTH_RETRIES = 2;

export function maxEditorialDepthRetries(): number {
  const raw = process.env.EDITORIAL_DEPTH_MAX_RETRIES?.trim();
  if (raw) {
    const n = Number(raw);
    if (Number.isFinite(n) && n >= 0 && n <= 4) return n;
  }
  return MAX_GENERATION_DEPTH_RETRIES;
}

function issue(
  code: DepthQualityCode,
  message: string,
  retryable: boolean
): DepthQualityIssue {
  return { code, message, retryable };
}

function normalizePara(text: string): string {
  return text
    .replace(/[^\p{L}\p{N}\s]/gu, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

export function findDuplicatedParagraphs(body: string): string[] {
  const paras = body
    .replace(/\r\n/g, "\n")
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter((p) => p.length >= 40);
  const seen = new Map<string, number>();
  const dupes: string[] = [];
  for (const p of paras) {
    const key = normalizePara(p).slice(0, 160);
    if (!key) continue;
    const count = (seen.get(key) ?? 0) + 1;
    seen.set(key, count);
    if (count === 2) dupes.push(p.slice(0, 80));
  }
  return dupes;
}

export function bodyEqualsExcerpt(body: string, summary: string): boolean {
  const a = normalizePara(body);
  const b = normalizePara(summary);
  if (!a || !b) return false;
  if (a === b) return true;
  // Body is only a slight expansion of the dek
  if (a.length <= b.length + 40 && (a.startsWith(b) || b.startsWith(a))) {
    return true;
  }
  return isDuplicateOfSummary(body, summary) && wordCount(body) <= wordCount(summary) + 30;
}

export function findUnsupportedQuotes(
  body: string,
  factPackText: string
): string[] {
  const pack = factPackText.toLowerCase();
  const unsupported: string[] = [];
  for (const match of body.matchAll(QUOTE_RE)) {
    const q = (match[1] ?? "").trim();
    if (q.length < 12) continue;
    const needle = q.slice(0, Math.min(48, q.length)).toLowerCase();
    if (!pack.includes(needle)) {
      unsupported.push(q.slice(0, 60));
      if (unsupported.length >= 3) break;
    }
  }
  return unsupported;
}

export function validateEditorialDepth(input: {
  articleBody: string;
  summary: string;
  articleType: ArticleType;
  factPackText: string;
  language?: string | null;
  evidenceSufficient?: boolean;
}): DepthQualityResult {
  const body = (input.articleBody ?? "").trim();
  const summary = (input.summary ?? "").trim();
  const rule = ARTICLE_DEPTH_RULES[input.articleType];
  const words = wordCount(body);
  const paragraphs = paragraphCount(body);
  const minWords = depthRejectThreshold(input.articleType);
  const issues: DepthQualityIssue[] = [];

  if (!body) {
    issues.push(issue("missing_body", "Article body is empty", true));
  } else {
    if (bodyEqualsExcerpt(body, summary)) {
      issues.push(
        issue(
          "body_equals_excerpt",
          "Article body is identical or near-identical to the summary/excerpt",
          true
        )
      );
    }

    if (words < minWords) {
      issues.push(
        issue(
          "body_too_short_for_type",
          `Body has ${words} words; ${input.articleType} requires ≥${minWords} (target ~${rule.targetWords})`,
          true
        )
      );
    }

    const minParas =
      input.articleType === "breaking_alert"
        ? 2
        : Math.min(rule.minParagraphs, 4);
    if (paragraphs < minParas && words < rule.targetWords) {
      issues.push(
        issue(
          "insufficient_paragraphs",
          `Body has ${paragraphs} paragraphs; expected ≥${minParas} for ${input.articleType}`,
          true
        )
      );
    }

    const dupes = findDuplicatedParagraphs(body);
    if (dupes.length > 0) {
      issues.push(
        issue(
          "duplicated_paragraphs",
          `Duplicated paragraphs detected (${dupes.length})`,
          true
        )
      );
    }

    if (isDuplicateOfSummary(body.split(/\n{2,}/)[0] ?? "", summary) && words < minWords + 80) {
      issues.push(
        issue(
          "summary_repeated_in_body",
          "Opening body repeats summary without additional reporting",
          true
        )
      );
    }

    if (PLACEHOLDER_RE.test(body) || PLACEHOLDER_RE.test(summary)) {
      issues.push(issue("placeholder_text", "Placeholder text present", true));
    }
    if (TEMPLATE_TOKEN_RE.test(body)) {
      issues.push(
        issue("unresolved_template_token", "Unresolved template tokens in body", true)
      );
    }
    if (NULLISH_RE.test(body) || NULLISH_RE.test(summary)) {
      issues.push(
        issue("null_undefined_artifact", "null/undefined artifact in copy", true)
      );
    }
    if (MARKDOWN_ARTIFACT_RE.test(body)) {
      issues.push(
        issue("markdown_artifact", "Markdown/template artifacts in body", true)
      );
    }

    const badQuotes = findUnsupportedQuotes(body, input.factPackText);
    if (badQuotes.length > 0) {
      issues.push(
        issue(
          "unsupported_quote",
          `Quoted text not found in fact pack: "${badQuotes[0]}"`,
          true
        )
      );
    }

    if ((input.language ?? "hi").startsWith("hi") && HINDI_NOISE_RE.test(body)) {
      issues.push(
        issue("malformed_hindi_noise", "Malformed Hindi character spam detected", true)
      );
    }

    if (PADDING_PHRASES_RE.test(body) && words > rule.maxWords * 0.9) {
      issues.push(
        issue(
          "factual_padding_suspected",
          "Generic padding phrases detected near/over max depth",
          true
        )
      );
    }

    if (
      input.evidenceSufficient === false &&
      (input.articleType === "standard_report" ||
        input.articleType === "explainer" ||
        input.articleType === "analysis") &&
      words > ARTICLE_DEPTH_RULES.short_update.maxWords
    ) {
      issues.push(
        issue(
          "insufficient_evidence_for_longform",
          "Longform depth without sufficient source evidence",
          true
        )
      );
    }
  }

  const retryable = issues.length > 0 && issues.every((i) => i.retryable);

  return {
    ok: issues.length === 0,
    issues,
    codes: issues.map((i) => i.code),
    retryable,
    metrics: {
      words,
      paragraphs,
      minWordsForType: minWords,
      articleType: input.articleType,
    },
  };
}

export function shouldRetryDepthFailure(
  result: DepthQualityResult,
  attempts: number
): boolean {
  if (result.ok) return false;
  if (attempts >= maxEditorialDepthRetries()) return false;
  return result.retryable;
}
