/**
 * 60-second AI summaries for news shorts
 */

import type { NewsroomLanguage } from "@/lib/i18n/languages";
import type { HomeSectionId } from "@/lib/homepage/types";

const OPENAI_URL = "https://api.openai.com/v1/chat/completions";

export type ShortSummaryResult = {
  summary60s: string;
  script: string;
  highlights: string[];
  durationSec: number;
};

const LANG_INSTRUCTION: Record<NewsroomLanguage, string> = {
  hi: "Write in clear Hindi (Devanagari). ~150 words max for 60 seconds spoken.",
  en: "Write in clear Indian English. ~130 words max for 60 seconds spoken.",
  cg: "Write in accessible Chhattisgarhi-flavoured Hindi (Devanagari).",
  mr: "Write in standard Marathi (Devanagari).",
  bn: "Write in standard Bengali script.",
  ta: "Write in standard Tamil script.",
};

export async function generate60SecondSummary(input: {
  headline: string;
  summary: string;
  articleBody?: string | null;
  section: HomeSectionId;
  language: NewsroomLanguage;
}): Promise<ShortSummaryResult | null> {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) return buildFallbackSummary(input);

  const body = {
    model:
      process.env.NEWSROOM_SHORTS_MODEL?.trim() ||
      process.env.NEWSROOM_EDITORIAL_MODEL?.trim() ||
      "gpt-4o-mini",
    temperature: 0.35,
    max_tokens: 900,
    response_format: { type: "json_object" as const },
    messages: [
      {
        role: "system",
        content: `You create 60-second mobile news shorts for Indian regional audiences.
${LANG_INSTRUCTION[input.language]}
- Neutral newsroom tone, no clickbait.
- Only facts from the source material.
Return JSON:
{
  "summary_60s": "single paragraph for on-screen deck",
  "script": "spoken anchor script with natural pauses (full 60s read)",
  "highlights": ["bullet 1", "bullet 2", "bullet 3"],
  "duration_sec": 58
}`,
      },
      {
        role: "user",
        content: `Section: ${input.section}
Headline: ${input.headline}
Summary: ${input.summary}
Body excerpt: ${(input.articleBody ?? "").slice(0, 2500)}`,
      },
    ],
  };

  try {
    const res = await fetch(OPENAI_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(45_000),
    });

    if (!res.ok) return buildFallbackSummary(input);
    const json = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const text = json.choices?.[0]?.message?.content?.trim();
    if (!text) return buildFallbackSummary(input);

    const parsed = JSON.parse(text) as {
      summary_60s?: string;
      script?: string;
      highlights?: string[];
      duration_sec?: number;
    };

    const summary60s = parsed.summary_60s?.trim() || input.summary;
    const script = parsed.script?.trim() || summary60s;
    const highlights = (parsed.highlights ?? []).filter(Boolean).slice(0, 5);

    return {
      summary60s,
      script,
      highlights: highlights.length
        ? highlights
        : extractHighlightsFallback(script),
      durationSec: Math.min(65, Math.max(52, parsed.duration_sec ?? 58)),
    };
  } catch {
    return buildFallbackSummary(input);
  }
}

function extractHighlightsFallback(script: string): string[] {
  return splitSentences(script).slice(0, 4);
}

function splitSentences(text: string): string[] {
  return text
    .split(/(?<=[.!?।])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 8);
}

function buildFallbackSummary(input: {
  headline: string;
  summary: string;
  articleBody?: string | null;
}): ShortSummaryResult {
  const base = input.summary?.trim() || input.headline;
  const script = `${input.headline}. ${base}`.slice(0, 680);
  return {
    summary60s: base.slice(0, 320),
    script,
    highlights: splitSentences(script).slice(0, 3),
    durationSec: 58,
  };
}
