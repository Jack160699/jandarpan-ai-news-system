/**
 * Phase 5 — shared generated-article validation contract.
 * Structural / publication-safety gates (not soft LLM quality scoring).
 */

import { createHash } from "node:crypto";
import {
  isNewsroomLanguage,
  normalizeArticleLanguage,
  type NewsroomLanguage,
} from "@/lib/i18n/languages";
import { bodyEqualsExcerpt } from "@/lib/news/ai/editorial-depth-quality";
import { normalizeTitle, titleSimilarity } from "@/lib/news/normalize";
import { extractSignificantNumbers } from "@/lib/autonomous/claim-number-scan";
import { extractDateMentions, extractQuotedSpans, type FactPack } from "@/lib/news/ai/fact-pack";

export const GENERATION_VALIDATION_LIMITS = {
  minHeadlineChars: 8,
  minSummaryChars: 20,
  /** Structural floor — type-specific depth gates enforce higher targets */
  minBodyChars: 280,
  minBodyWords: 100,
  maxValidationRetries: 3,
  duplicateTitleSimilarity: 0.88,
  duplicateBodySimilarity: 0.92,
} as const;

export type GenerationValidationCode =
  | "empty_title"
  | "placeholder_title"
  | "empty_body"
  | "body_too_short"
  | "body_equals_excerpt"
  | "body_headings_only"
  | "body_urls_only"
  | "model_apology"
  | "generation_error_text"
  | "invalid_summary"
  | "invalid_language"
  | "missing_category"
  | "missing_region"
  | "missing_source_attribution"
  | "missing_source_urls"
  | "missing_generation_metadata"
  | "duplicate_title"
  | "duplicate_body"
  | "duplicate_cluster"
  | "duplicate_source_url"
  | "unresolved_template_token"
  | "raw_json_or_instructions"
  | "empty_section"
  | "unsafe_markup"
  | "null_undefined_artifact"
  | "unsupported_name"
  | "unsupported_date"
  | "unsupported_number"
  | "unsupported_quote"
  | "insufficient_sensitive_sourcing";

export type GenerationValidationIssue = {
  code: GenerationValidationCode;
  message: string;
  retryable: boolean;
};

export type GeneratedArticleValidationInput = {
  headline: string;
  summary: string;
  articleBody: string;
  language?: string | null;
  category?: string | null;
  region?: string | null;
  /** When true, district/region is required (CG local stories) */
  requireRegion?: boolean;
  sourceAttributions?: Array<{
    source?: string | null;
    article_url?: string | null;
    signal_id?: string | null;
  }>;
  sourceUrls?: string[];
  generationMetadata?: Record<string, unknown> | null;
  eventId?: string | null;
  existingHeadlines?: string[];
  existingBodyFingerprints?: string[];
  existingSourceUrlHashes?: string[];
  existingEventIds?: string[];
  activeGenerationEventIds?: string[];
  /** Desk drafts may skip source/attribution until authored */
  allowDeskDraft?: boolean;
  /**
   * draft — structural title/body/language (pre-persist quality)
   * persist — also requires sources + generation metadata
   * publish — same as persist (final gate)
   */
  stage?: "draft" | "persist" | "publish";
};

export type GeneratedArticleValidationResult = {
  ok: boolean;
  issues: GenerationValidationIssue[];
  codes: GenerationValidationCode[];
  retryable: boolean;
  quarantineRecommended: boolean;
  titleFingerprint: string;
  bodyFingerprint: string;
  metrics: {
    titleFailure: boolean;
    bodyFailure: boolean;
    missingSource: boolean;
    duplicateRejection: boolean;
    languageFailure: boolean;
  };
};

const PLACEHOLDER_TITLES = new Set(
  [
    "untitled story",
    "untitled",
    "untitled draft",
    "no title",
    "draft",
    "test",
    "null",
    "undefined",
    "placeholder",
    "n/a",
    "na",
    "बिना शीर्षक",
    "शीर्षक नहीं",
  ].map((s) => s.toLowerCase())
);

const PLACEHOLDER_TITLE_RE =
  /^(untitled(\s+story|\s+draft)?|no\s*title|draft|test|placeholder|null|undefined)$/i;

const MODEL_APOLOGY_RE =
  /\b(as an ai|i'?m sorry|i cannot|i can'?t assist|i am unable|as a language model|मुझे क्षमा|मैं सहायता नहीं)\b/i;

const GENERATION_ERROR_RE =
  /\b(generation failed|content unavailable|failed to generate|error generating|translation_failed|llm_error)\b/i;

const TEMPLATE_TOKEN_RE =
  /\{\{[^{}]+\}\}|\[\[[^[\]]+\]\]|<%[^%]+%>|\$\{[^}]+\}|<<[^>]+>>/;

const RAW_JSON_OR_INSTRUCTIONS_RE =
  /^\s*\{[\s\S]*"headline"\s*:|^\s*\[?\s*\{[\s\S]*"article_body"|system prompt:|return json only|you are a (senior|helpful)/i;

const UNSAFE_MARKUP_RE =
  /<script[\s>]|javascript:|data:text\/html|onerror\s*=|onclick\s*=/i;

function wordCount(text: string): number {
  return text.split(/\s+/).filter(Boolean).length;
}

function stripMarkdownNoise(body: string): string {
  return body
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/^\s*[-*+]\s+/gm, "")
    .replace(/!\[[^\]]*]\([^)]*\)/g, "")
    .replace(/\[[^\]]*]\((https?:\/\/[^)]+)\)/g, "$1")
    .replace(/https?:\/\/\S+/gi, "")
    .replace(/\s+/g, " ")
    .trim();
}

function isHeadingsOrMetaOnly(body: string): boolean {
  const lines = body
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (!lines.length) return true;
  const contentLines = lines.filter(
    (l) =>
      !/^#{1,6}\s/.test(l) &&
      !/^[-*_]{3,}$/.test(l) &&
      !/^(source|sources|category|region|tags|metadata)\s*:/i.test(l)
  );
  const prose = stripMarkdownNoise(contentLines.join("\n"));
  return prose.length < 40 || wordCount(prose) < 12;
}

function isUrlsOnlyBody(body: string): boolean {
  const withoutUrls = body.replace(/https?:\/\/\S+/gi, "").replace(/\s+/g, " ").trim();
  const urlCount = (body.match(/https?:\/\/\S+/gi) ?? []).length;
  return urlCount > 0 && (withoutUrls.length < 40 || wordCount(withoutUrls) < 10);
}

function hasEmptyMarkdownSection(body: string): boolean {
  const parts = body.split(/^#{1,6}\s+.+$/m);
  // If there are headings, ensure at least one section has prose
  if (!/^#{1,6}\s+/m.test(body)) return false;
  const nonempty = parts.some((p) => stripMarkdownNoise(p).length >= 40);
  return !nonempty;
}

export function fingerprintTitle(headline: string): string {
  return createHash("sha256").update(normalizeTitle(headline)).digest("hex").slice(0, 24);
}

export function fingerprintBody(body: string): string {
  const normalized = stripMarkdownNoise(body).toLowerCase();
  return createHash("sha256").update(normalized).digest("hex").slice(0, 24);
}

export function hashSourceUrl(url: string): string {
  try {
    const u = new URL(url.trim());
    u.hash = "";
    u.hostname = u.hostname.replace(/^www\./, "");
    return createHash("sha256")
      .update(`${u.protocol}//${u.hostname}${u.pathname}`)
      .digest("hex")
      .slice(0, 24);
  } catch {
    return createHash("sha256").update(url.trim().toLowerCase()).digest("hex").slice(0, 24);
  }
}

export function isPlaceholderTitle(headline: string | null | undefined): boolean {
  const raw = (headline ?? "").trim();
  if (!raw) return true;
  const collapsed = raw.replace(/\s+/g, " ");
  if (PLACEHOLDER_TITLES.has(collapsed.toLowerCase())) return true;
  if (PLACEHOLDER_TITLE_RE.test(collapsed)) return true;
  if (/^untitled\b/i.test(collapsed)) return true;
  return false;
}

export function isValidGeneratedLanguage(
  language: string | null | undefined
): language is NewsroomLanguage {
  if (!language?.trim()) return false;
  return isNewsroomLanguage(normalizeArticleLanguage(language));
}

function issue(
  code: GenerationValidationCode,
  message: string,
  retryable: boolean
): GenerationValidationIssue {
  return { code, message, retryable };
}

/**
 * Validate a generated (or about-to-persist) article against the Phase 5 contract.
 */
export function validateGeneratedArticle(
  input: GeneratedArticleValidationInput
): GeneratedArticleValidationResult {
  const issues: GenerationValidationIssue[] = [];
  const headline = (input.headline ?? "").trim();
  const summary = (input.summary ?? "").trim();
  const body = (input.articleBody ?? "").trim();
  const titleFingerprint = fingerprintTitle(headline);
  const bodyFingerprint = fingerprintBody(body);

  if (!headline) {
    issues.push(issue("empty_title", "Headline is empty", true));
  } else if (isPlaceholderTitle(headline) || headline.length < GENERATION_VALIDATION_LIMITS.minHeadlineChars) {
    issues.push(
      issue(
        "placeholder_title",
        `Headline is a placeholder or too short: "${headline.slice(0, 40)}"`,
        true
      )
    );
  }

  if (!summary || summary.length < GENERATION_VALIDATION_LIMITS.minSummaryChars) {
    issues.push(issue("invalid_summary", "Summary missing or too short", true));
  }

  if (!body) {
    issues.push(issue("empty_body", "Article body is empty", true));
  } else {
    const words = wordCount(body);
    if (
      words < GENERATION_VALIDATION_LIMITS.minBodyWords ||
      body.length < GENERATION_VALIDATION_LIMITS.minBodyChars
    ) {
      issues.push(
        issue(
          "body_too_short",
          `Body too short (${words} words / ${body.length} chars)`,
          true
        )
      );
    }
    if (summary && bodyEqualsExcerpt(body, summary)) {
      issues.push(
        issue(
          "body_equals_excerpt",
          "Article body is identical or near-identical to summary",
          true
        )
      );
    }
    if (/\b(undefined|null)\b/.test(body) || /\b(undefined|null)\b/.test(summary)) {
      issues.push(
        issue("null_undefined_artifact", "null/undefined artifact in copy", true)
      );
    }
    if (isHeadingsOrMetaOnly(body)) {
      issues.push(
        issue("body_headings_only", "Body is headings/metadata without prose", true)
      );
    }
    if (isUrlsOnlyBody(body)) {
      issues.push(
        issue("body_urls_only", "Body is mostly source URLs without article content", true)
      );
    }
    if (MODEL_APOLOGY_RE.test(body) || MODEL_APOLOGY_RE.test(summary)) {
      issues.push(
        issue("model_apology", "Body/summary contains model apology text", true)
      );
    }
    if (GENERATION_ERROR_RE.test(body)) {
      issues.push(
        issue("generation_error_text", "Body contains generation-error text", true)
      );
    }
    if (TEMPLATE_TOKEN_RE.test(body) || TEMPLATE_TOKEN_RE.test(headline)) {
      issues.push(
        issue(
          "unresolved_template_token",
          "Unresolved template tokens present",
          true
        )
      );
    }
    if (RAW_JSON_OR_INSTRUCTIONS_RE.test(body)) {
      issues.push(
        issue(
          "raw_json_or_instructions",
          "Body looks like raw JSON or model instructions",
          true
        )
      );
    }
    if (hasEmptyMarkdownSection(body)) {
      issues.push(issue("empty_section", "Markdown sections are empty", true));
    }
    if (UNSAFE_MARKUP_RE.test(body)) {
      issues.push(
        issue("unsafe_markup", "Body contains unsafe HTML/script patterns", false)
      );
    }
  }

  if (!isValidGeneratedLanguage(input.language)) {
    issues.push(
      issue("invalid_language", `Invalid language: ${input.language ?? "null"}`, false)
    );
  }

  const stage = input.stage ?? "draft";
  const requireSources = !input.allowDeskDraft && stage !== "draft";

  if (!input.allowDeskDraft && !input.category?.trim()) {
    issues.push(issue("missing_category", "Category is required", true));
  }
  if (!input.allowDeskDraft && input.requireRegion && !input.region?.trim()) {
    issues.push(issue("missing_region", "District/region is required", true));
  }

  if (requireSources) {
    const attributions = input.sourceAttributions ?? [];
    const urls = [
      ...(input.sourceUrls ?? []),
      ...attributions
        .map((a) => a.article_url)
        .filter((u): u is string => typeof u === "string" && u.trim().length > 0),
    ];
    const namedSources = attributions.filter(
      (a) => (a.source ?? "").trim() || (a.signal_id ?? "").trim()
    );

    if (!namedSources.length) {
      issues.push(
        issue("missing_source_attribution", "Source attribution missing", true)
      );
    }
    if (!urls.length) {
      issues.push(issue("missing_source_urls", "Source URLs missing", true));
    }

    if (!input.generationMetadata || typeof input.generationMetadata !== "object") {
      issues.push(
        issue(
          "missing_generation_metadata",
          "Generation metadata missing",
          false
        )
      );
    }
  }

  // Duplicates
  if (input.eventId && input.existingEventIds?.includes(input.eventId)) {
    issues.push(
      issue("duplicate_cluster", "Generated article already exists for cluster/event", false)
    );
  }
  if (input.eventId && input.activeGenerationEventIds?.includes(input.eventId)) {
    issues.push(
      issue(
        "duplicate_cluster",
        "Active generation job already covers this cluster/event",
        false
      )
    );
  }

  if (headline && input.existingHeadlines?.length) {
    const norm = normalizeTitle(headline);
    for (const existing of input.existingHeadlines) {
      if (titleSimilarity(norm, normalizeTitle(existing)) >= GENERATION_VALIDATION_LIMITS.duplicateTitleSimilarity) {
        issues.push(
          issue("duplicate_title", "Headline too similar to a recent article", false)
        );
        break;
      }
    }
  }

  if (bodyFingerprint && input.existingBodyFingerprints?.includes(bodyFingerprint)) {
    issues.push(
      issue("duplicate_body", "Body fingerprint matches a recent article", false)
    );
  }

  const urlHashes = (input.sourceUrls ?? [])
    .concat(
      (input.sourceAttributions ?? [])
        .map((a) => a.article_url ?? "")
        .filter(Boolean)
    )
    .map(hashSourceUrl);
  if (
    input.existingSourceUrlHashes?.length &&
    urlHashes.some((h) => input.existingSourceUrlHashes!.includes(h))
  ) {
    issues.push(
      issue(
        "duplicate_source_url",
        "Canonical source URL already used by a generated article",
        false
      )
    );
  }

  const codes = issues.map((i) => i.code);
  const retryable = issues.length > 0 && issues.every((i) => i.retryable);
  const titleFailure = codes.some(
    (c) => c === "empty_title" || c === "placeholder_title"
  );
  const bodyFailure = codes.some((c) =>
    [
      "empty_body",
      "body_too_short",
      "body_equals_excerpt",
      "body_headings_only",
      "body_urls_only",
      "model_apology",
      "generation_error_text",
      "empty_section",
      "unsafe_markup",
      "raw_json_or_instructions",
      "unresolved_template_token",
      "null_undefined_artifact",
    ].includes(c)
  );
  const missingSource = codes.some(
    (c) => c === "missing_source_attribution" || c === "missing_source_urls"
  );
  const duplicateRejection = codes.some((c) => c.startsWith("duplicate_"));
  const languageFailure = codes.includes("invalid_language");

  return {
    ok: issues.length === 0,
    issues,
    codes,
    retryable,
    quarantineRecommended: !retryable && issues.length > 0,
    titleFingerprint,
    bodyFingerprint,
    metrics: {
      titleFailure,
      bodyFailure,
      missingSource,
      duplicateRejection,
      languageFailure,
    },
  };
}

/** Soft quality may be force-published; structural validation must never be. */
export function applyStructuralHardReject(
  existingHardRejectReasons: string[],
  validation: GeneratedArticleValidationResult
): string[] {
  const next = [...existingHardRejectReasons];
  for (const code of validation.codes) {
    if (!next.includes(code)) next.push(code);
  }
  return next;
}

export function shouldRetryGenerationFailure(
  validation: GeneratedArticleValidationResult,
  attempts: number
): boolean {
  if (validation.ok) return false;
  if (attempts >= GENERATION_VALIDATION_LIMITS.maxValidationRetries) return false;
  return validation.retryable;
}

export function shouldQuarantineGenerationFailure(
  validation: GeneratedArticleValidationResult,
  attempts: number
): boolean {
  if (validation.ok) return false;
  if (attempts >= GENERATION_VALIDATION_LIMITS.maxValidationRetries) return true;
  return validation.quarantineRecommended && !validation.retryable;
}

const COMMON_CAPITALIZED_WORDS = new Set([
  "the", "this", "that", "these", "those", "he", "she", "it", "they", "we", "you",
  "monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday",
  "january", "february", "march", "april", "may", "june", "july", "august",
  "september", "october", "november", "december",
]);

const ORG_HINT_RE =
  /\b(ministry|government|court|police|election|commission|party|cabinet|department|corporation|committee|assembly|council|board|authority|company|university|college|hospital|bank)\b/i;

const NAME_CANDIDATE_RE = /\b[A-Z][a-z]{2,}(?:\s+[A-Z][a-z]{2,}){1,3}\b/g;

const RELATIVE_DATE_RE =
  /^(today|yesterday|tomorrow|tonight|this\s+(week|month|year)|last\s+(week|month|year)|next\s+(week|month|year)|आज|कल|परसों|इस\s*सप्ताह|इस\s*महीने|पिछले\s*सप्ताह|पिछले\s*महीने)$/i;

function extractNameCandidates(text: string): string[] {
  const matches = text.match(NAME_CANDIDATE_RE) ?? [];
  const out: string[] = [];
  const seen = new Set<string>();
  for (const m of matches) {
    const trimmed = m.trim();
    const key = trimmed.toLowerCase();
    if (seen.has(key) || ORG_HINT_RE.test(trimmed)) continue;
    const words = trimmed.split(/\s+/);
    if (words.every((w) => COMMON_CAPITALIZED_WORDS.has(w.toLowerCase()))) continue;
    seen.add(key);
    out.push(trimmed);
  }
  return out;
}

function wordOverlap(a: string, b: string): boolean {
  const wordsA = a.toLowerCase().split(/\s+/).filter((w) => w.length >= 3);
  const wordsB = new Set(b.toLowerCase().split(/\s+/).filter((w) => w.length >= 3));
  return wordsA.some((w) => wordsB.has(w));
}

function nameSupportedByFactPack(name: string, people: string[]): boolean {
  if (!people.length) return false;
  const lower = name.toLowerCase();
  return people.some((p) => {
    const pLower = p.toLowerCase();
    return (
      wordOverlap(name, p) ||
      lower.includes(pLower) ||
      pLower.includes(lower) ||
      titleSimilarity(name, p) >= 0.5
    );
  });
}

function normalizeDateToken(d: string): string {
  return d.toLowerCase().replace(/[.,]/g, "").replace(/\s+/g, " ").trim();
}

function dateSupportedByFactPack(date: string, factDates: string[]): boolean {
  const norm = normalizeDateToken(date);
  return factDates.some((f) => {
    const fn = normalizeDateToken(f);
    return fn === norm || fn.includes(norm) || norm.includes(fn);
  });
}

function normalizeNumberForCompare(n: string): string {
  return n.replace(/[₹,\s]|rs\.?|inr/gi, "").toLowerCase();
}

function numberSupportedByFactPack(num: string, factNumbers: string[]): boolean {
  const norm = normalizeNumberForCompare(num);
  if (!norm) return true;
  return factNumbers.some((f) => {
    const fn = normalizeNumberForCompare(f);
    return fn === norm || (fn.length >= 2 && (fn.includes(norm) || norm.includes(fn)));
  });
}

function quoteSupportedByFactPack(quote: string, factQuotes: FactPack["quotes"]): boolean {
  const normQuote = quote.toLowerCase().replace(/\s+/g, " ").trim();
  return factQuotes.some((q) => {
    const normFact = q.text.toLowerCase().replace(/\s+/g, " ").trim();
    if (!normFact) return false;
    if (normFact === normQuote || normFact.includes(normQuote) || normQuote.includes(normFact)) {
      return true;
    }
    return titleSimilarity(normQuote, normFact) >= 0.6;
  });
}

/**
 * Claim-against-fact-pack checks — a safety net against fabrication, not a
 * grammar-precision tool. This pipeline has no real NLP entity linker, so
 * every matcher below (name/date/number/quote) is deliberately permissive:
 * substring, word-overlap, and bigram-similarity matches all count as
 * "supported". A stricter matcher would reject legitimate paraphrasing
 * (e.g. "the minister" after the model already named them once, or
 * "12,000 crore" reformatted as "Rs 12,000 crore") far more often than it
 * would ever catch a genuine fabrication. We accept a higher false-negative
 * rate (some fabrications slip through this regex net) to keep the
 * false-positive rate (blocking real, well-sourced articles) low — judgment-
 * based hallucination screening additionally runs via the independent AI
 * reviewer (independent-review.ts), which this function does not replace.
 *
 * The one exception is "insufficient_sensitive_sourcing", which is a hard,
 * non-retryable block (see duplicate_title/unsafe_markup for the same
 * pattern) — sensitive-category stories must clear a sourcing floor
 * regardless of how well the rest of the draft reads.
 */
export function validateClaimsAgainstFactPack(input: {
  headline: string;
  summary: string;
  articleBody: string;
  factPack: FactPack;
}): GenerationValidationIssue[] {
  const issues: GenerationValidationIssue[] = [];
  const { factPack } = input;
  const combined = `${input.headline}\n${input.summary}\n${input.articleBody}`;

  for (const name of extractNameCandidates(combined)) {
    if (!nameSupportedByFactPack(name, factPack.people)) {
      issues.push(
        issue(
          "unsupported_name",
          `Name-shaped mention has no match in fact pack: "${name}"`,
          true
        )
      );
    }
  }

  for (const date of extractDateMentions(combined)) {
    if (RELATIVE_DATE_RE.test(date.trim())) continue;
    if (!dateSupportedByFactPack(date, factPack.dates)) {
      issues.push(
        issue("unsupported_date", `Date not traceable to fact pack: "${date}"`, true)
      );
    }
  }

  // Numbers — noise-filtered: only 3+ digit figures or currency/percent-marked
  // ones are checked; ages, counts, and list positions are not claims worth
  // gating on and would otherwise dominate false positives.
  const draftNumbers = extractSignificantNumbers(combined).filter(
    (n) => n.includes("%") || n.replace(/[^\d]/g, "").length >= 3
  );
  for (const num of draftNumbers) {
    if (!numberSupportedByFactPack(num, factPack.numbers)) {
      issues.push(
        issue("unsupported_number", `Number not traceable to fact pack: "${num}"`, true)
      );
    }
  }

  for (const quote of extractQuotedSpans(input.articleBody)) {
    if (!quoteSupportedByFactPack(quote, factPack.quotes)) {
      issues.push(
        issue(
          "unsupported_quote",
          `Quoted text has no matching source quote in fact pack: "${quote.slice(0, 60)}"`,
          true
        )
      );
    }
  }

  if (factPack.sensitiveCategory) {
    const sufficient = factPack.sources.length >= 2 || factPack.primarySourceIndicator === true;
    if (!sufficient) {
      issues.push(
        issue(
          "insufficient_sensitive_sourcing",
          `Sensitive category "${factPack.sensitiveCategory}" requires 2+ sources or a primary source; fact pack has ${factPack.sources.length} source(s), primarySourceIndicator=${factPack.primarySourceIndicator}`,
          false
        )
      );
    }
  }

  return issues;
}
