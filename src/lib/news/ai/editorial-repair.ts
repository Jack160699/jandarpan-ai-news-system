/**
 * Borderline editorial repair + fact-pack fallback drafts
 */

import type { NewsEventRow, NewsSignalRow } from "@/lib/types/newsroom";
import type {
  EditorialDraft,
  SupportedEditorialLanguage,
} from "@/lib/news/ai/editorial-types";
import {
  isDuplicateOfSummary,
  stripDuplicateSummaryFromBody,
} from "@/lib/news/ai/editorial-body";
import { scoreHeadlineQuality } from "@/lib/news/ai/editorial-intelligence";
import { scoreSourceConfidence } from "@/lib/news/ai/event-clustering";
import { recordDirectChatCompletion } from "@/lib/observability/openai-cost";
import { repairMaxTokens } from "@/lib/observability/openai-cost/adaptive-tokens";

const OPENAI_URL = "https://api.openai.com/v1/chat/completions";
const REPAIR_TIMEOUT_MS = 18_000;

const CLICKBAIT_TRIM_RE =
  /\b(shocking|unbelievable|you won'?t believe|exposed|slams|destroys|बड़ा धमाका|चौंकाने|सनसनी)\b/gi;

function trimHeadline(text: string, max = 90): string {
  const t = text.replace(/\s+/g, " ").trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1).trim()}…`;
}

function stripClickbait(text: string): string {
  return text.replace(CLICKBAIT_TRIM_RE, "").replace(/\s+/g, " ").trim();
}

/** Improve weak or sensational headlines using event context */
export function enhanceHeadlineQuality(
  draft: EditorialDraft,
  event: NewsEventRow
): EditorialDraft {
  let headline = stripClickbait(draft.headline);
  const quality = scoreHeadlineQuality(headline);

  if (quality < 0.45 || headline.length < 12) {
    headline =
      event.canonical_title?.trim() ||
      headline ||
      (draft.language === "hi" ? "क्षेत्रीय अपडेट" : "Regional update");
  }

  headline = trimHeadline(headline);

  if (headline.length < 10 && event.event_summary) {
    const bit = event.event_summary.split(/[.!?।]/)[0]?.trim();
    if (bit && bit.length >= 12) headline = trimHeadline(bit);
  }

  return {
    ...draft,
    headline,
    seo_title: trimHeadline(draft.seo_title || headline, 70),
  };
}

/** Build summary from body lead when LLM summary is thin */
export function autoGenerateSummary(draft: EditorialDraft): EditorialDraft {
  let summary = draft.summary.replace(/\s+/g, " ").trim();

  if (summary.length >= 60) {
    return { ...draft, summary: summary.slice(0, 320) };
  }

  const bodyText = draft.article_body.replace(/^##[^\n]*\n+/gm, "").trim();
  const firstPara = bodyText.split(/\n{2,}/)[0]?.trim() ?? "";

  if (firstPara.length >= 40 && !isDuplicateOfSummary(firstPara, summary)) {
    summary = firstPara.slice(0, 280);
  } else if (bodyText.length >= 80) {
    summary = bodyText.replace(/\n+/g, " ").trim().slice(0, 280);
  }

  if (summary.length < 40 && draft.headline.length >= 12) {
    summary =
      draft.language === "hi"
        ? `${draft.headline} — संपादकीय डेस्क से संकलित रिपोर्ट।`
        : `${draft.headline} — editorially compiled report for readers.`;
  }

  return {
    ...draft,
    summary: summary.slice(0, 320),
    seo_description: (draft.seo_description || summary).slice(0, 160),
  };
}

export function normalizeEditorialFormatting(draft: EditorialDraft): EditorialDraft {
  let body = draft.article_body
    .replace(/\r\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]+\n/g, "\n")
    .trim();

  const summary = draft.summary.replace(/\s+/g, " ").trim();
  body = stripDuplicateSummaryFromBody(body, summary);

  return {
    ...draft,
    headline: trimHeadline(stripClickbait(draft.headline)),
    summary,
    article_body: body,
    seo_title: trimHeadline(draft.seo_title || draft.headline, 70),
    seo_description: (draft.seo_description || summary).slice(0, 160),
    reading_time: draft.reading_time,
  };
}

export function improveHeadlineFromEvent(
  draft: EditorialDraft,
  event: NewsEventRow
): EditorialDraft {
  return enhanceHeadlineQuality(draft, event);
}

/**
 * Full pre-publish enhancement pass — formatting, headline, summary
 */
export function applyEditorialEnhancements(
  draft: EditorialDraft,
  event: NewsEventRow
): EditorialDraft {
  let out = normalizeEditorialFormatting(draft);
  out = enhanceHeadlineQuality(out, event);
  out = autoGenerateSummary(out);
  return normalizeEditorialFormatting(out);
}

/**
 * Template fallback when LLM JSON fails — source-bound text without filler sections.
 */
export function buildFallbackDraftFromFactPack(input: {
  event: NewsEventRow;
  signals: NewsSignalRow[];
  language: SupportedEditorialLanguage;
}): EditorialDraft {
  const { event, signals, language } = input;
  const top = [...signals].sort(
    (a, b) => scoreSourceConfidence(b) - scoreSourceConfidence(a)
  );
  const lead = top[0];
  const headline =
    event.canonical_title?.trim() ||
    lead?.title?.trim() ||
    (language === "hi" ? "क्षेत्रीय अपडेट" : "Regional update");

  const bullets = top
    .slice(0, 4)
    .map((s) => s.title.trim())
    .filter(Boolean);

  const summary =
    event.event_summary?.trim() ||
    (language === "hi"
      ? `${headline} — ${signals.length} स्रोतों से संकलित ताज़ा अपडेट।`
      : `${headline} — compiled update from ${signals.length} sources.`);

  const leadPara =
    lead?.raw_content?.trim().slice(0, 400) ||
    (language === "hi"
      ? `${headline} पर ${signals.length} स्रोतों से जानकारी मिली है।`
      : `Reports from ${signals.length} sources on ${headline}.`);

  const detailsBlock = bullets.map((b) => `• ${b}`).join("\n");
  const article_body = [leadPara, detailsBlock].filter(Boolean).join("\n\n");

  const wordCount = article_body.split(/\s+/).length;
  const reading_time =
    language === "hi"
      ? `${Math.max(1, Math.round(wordCount / 200))} मिनट`
      : `${Math.max(1, Math.round(wordCount / 200))} min read`;

  const draft: EditorialDraft = {
    headline: trimHeadline(headline),
    summary: summary.slice(0, 320),
    article_body,
    seo_title: trimHeadline(headline, 70),
    seo_description: summary.slice(0, 160),
    tags: [event.category ?? "local", event.region ?? "india"].filter(Boolean),
    reading_time,
    language,
  };

  return applyEditorialEnhancements(draft, event);
}

export async function regenerateIntroSection(input: {
  draft: EditorialDraft;
  factPackText: string;
  language: SupportedEditorialLanguage;
}): Promise<EditorialDraft> {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) return normalizeEditorialFormatting(input.draft);

  const lang =
    input.language === "hi"
      ? "Write in Hindi (Devanagari)."
      : "Write in English.";

  try {
    const model =
      process.env.NEWSROOM_EDITORIAL_MODEL?.trim() ||
      process.env.OPENAI_MODEL?.trim() ||
      "gpt-4o-mini";
    const systemContent = `${lang} Improve ONLY headline and lead paragraph. Use fact pack only. Lead must differ from summary. Return JSON: {"headline":"","summary":"","lead":""}`;
    const userContent = `Current headline: ${input.draft.headline}\nCurrent summary: ${input.draft.summary}\n\n${input.factPackText}`;
    const started = Date.now();

    const res = await fetch(OPENAI_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        temperature: 0.3,
        max_tokens: repairMaxTokens(),
        messages: [
          {
            role: "system",
            content: systemContent,
          },
          {
            role: "user",
            content: userContent,
          },
        ],
        response_format: { type: "json_object" },
      }),
      signal: AbortSignal.timeout(REPAIR_TIMEOUT_MS),
    });

    const latencyMs = Date.now() - started;

    if (!res.ok) {
      recordDirectChatCompletion({
        operation: "editorial_repair",
        model,
        system: systemContent,
        user: userContent,
        latencyMs,
        success: false,
        context: { worker: "editorial_generate" },
      });
      return normalizeEditorialFormatting(input.draft);
    }

    const json = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const content = json.choices?.[0]?.message?.content;
    recordDirectChatCompletion({
      operation: "editorial_repair",
      model,
      system: systemContent,
      user: userContent,
      json,
      content: content ?? undefined,
      latencyMs,
      success: Boolean(content),
      context: { worker: "editorial_generate" },
    });
    if (!content) return normalizeEditorialFormatting(input.draft);

    const parsed = JSON.parse(content) as {
      headline?: string;
      summary?: string;
      lead?: string;
      intro?: string;
    };

    const leadText = (parsed.lead ?? parsed.intro)?.trim();
    let body = input.draft.article_body;
    if (leadText && !isDuplicateOfSummary(leadText, parsed.summary ?? input.draft.summary)) {
      const rest = body.replace(/^[\s\S]*?(?=\n{2,}|$)/, "").trim();
      body = rest ? `${leadText}\n\n${rest}` : leadText;
    }

    return normalizeEditorialFormatting({
      ...input.draft,
      headline: parsed.headline?.trim() || input.draft.headline,
      summary: parsed.summary?.trim() || input.draft.summary,
      article_body: body,
    });
  } catch {
    return normalizeEditorialFormatting(input.draft);
  }
}

export async function repairBorderlineDraft(input: {
  draft: EditorialDraft;
  event: NewsEventRow;
  factPackText: string;
  language: SupportedEditorialLanguage;
}): Promise<EditorialDraft> {
  let draft = applyEditorialEnhancements(input.draft, input.event);
  draft = await regenerateIntroSection({
    draft,
    factPackText: input.factPackText,
    language: input.language,
  });
  return applyEditorialEnhancements(draft, input.event);
}
