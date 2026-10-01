/**
 * Quality gate for a TRANSLATED article bundle (pure). A translation is only stored - and therefore only ever shown to
 * readers of the target language - when it clears this gate. It reuses the pipeline's existing language-script gate
 * (validateArticleLanguage) and headline gate (evaluateHeadlineQuality) instead of inventing parallel rules.
 *
 * Why it exists: translateArticleBundle used to accept ANY parsed JSON, and silently fell back to the SOURCE-language
 * body when the model omitted `article_body` - so a "Hindi" article could be an English body under a Hindi headline.
 */

import { evaluateHeadlineQuality } from "@/lib/news/quality/headline-quality";
import { validateArticleLanguage, type EditorialLanguage } from "@/lib/news/quality/script-detect";

export type TranslationCandidate = { headline?: string | null; summary?: string | null; article_body?: string | null };

export type TranslationQualityResult = { ok: true } | { ok: false; codes: string[] };

const norm = (s: string | null | undefined) => (s ?? "").replace(/\s+/g, " ").trim().toLowerCase();

const paragraphs = (s: string | null | undefined) => (s ?? "").split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);

/** Model artefacts that mean the output is not publishable copy. */
const ARTEFACT_RE = /(```|^\s*\{\s*"|"article_body"\s*:|\bas an ai\b|\bi (cannot|can't|am unable)\b|\bi'm sorry\b|मैं एक एआई)/i;

/** Body length ratio (translated / source) outside this band means summarised-away or padded output. */
const MIN_BODY_RATIO = 0.4;
const MAX_BODY_RATIO = 2.6;

export function validateTranslationBundle(input: {
  targetLanguage: string;
  /** The EXACT source text that was sent to the model (for long articles that is the adaptive body slice, not the full body). */
  source: { headline: string; summary: string; article_body: string; language: string };
  bundle: TranslationCandidate;
}): TranslationQualityResult {
  const codes: string[] = [];
  const { bundle, source } = input;
  const headline = (bundle.headline ?? "").trim();
  const summary = (bundle.summary ?? "").trim();
  const body = (bundle.article_body ?? "").trim();

  // 1. completeness - no silent fallback to the source text
  if (!headline) codes.push("headline_missing");
  if (!summary) codes.push("summary_missing");
  if (source.article_body.trim() && !body) codes.push("body_missing");

  // 2. the model must actually have translated: not an echo of the source
  if (headline && norm(headline) === norm(source.headline)) codes.push("headline_untranslated");
  if (body && source.article_body.trim() && norm(body) === norm(source.article_body)) codes.push("body_untranslated");

  // 3. script/language gate (hi/en). Other languages only get the structural checks.
  if (input.targetLanguage === "hi" || input.targetLanguage === "en") {
    for (const f of validateArticleLanguage({ language: input.targetLanguage as EditorialLanguage, headline, summary, body })) {
      codes.push(`language:${f.code}`);
    }
    // 4. headline quality on the translated headline (roundup / generic / e-paper listing titles)
    if (headline) {
      const hq = evaluateHeadlineQuality({ headline, language: input.targetLanguage as EditorialLanguage });
      if (!hq.ok) for (const f of hq.failures) codes.push(`headline:${f}`);
    }
  }

  // 5. completeness of the body relative to what was sent
  if (body && source.article_body.trim()) {
    const ratio = body.length / source.article_body.trim().length;
    if (ratio < MIN_BODY_RATIO) codes.push(`body_too_short:${ratio.toFixed(2)}`);
    else if (ratio > MAX_BODY_RATIO) codes.push(`body_too_long:${ratio.toFixed(2)}`);
    const srcParas = paragraphs(source.article_body).length;
    const outParas = paragraphs(body).length;
    if (srcParas >= 3 && outParas < Math.ceil(srcParas * 0.6)) codes.push(`paragraphs_lost:${outParas}/${srcParas}`);
  }

  // 6. model artefacts / refusals / leaked JSON
  if ([headline, summary, body].some((t) => t && ARTEFACT_RE.test(t))) codes.push("model_artefact");

  return codes.length ? { ok: false, codes } : { ok: true };
}
