/**
 * Regenerate editorial article body / queue hero image
 */

import { createAdminServerClient, isSupabaseConfigured } from "@/lib/supabase";
import {
  applyEditorialEnhancements,
  repairBorderlineDraft,
} from "@/lib/news/ai/editorial-repair";
import { runEditorialQualityChecks } from "@/lib/news/ai/editorial-guards";
import { enqueueEditorialImage } from "@/lib/news/ai/editorial-image-queue";
import type { EditorialDraft, SupportedEditorialLanguage } from "@/lib/news/ai/editorial-types";
import type { EditorialActionResult } from "@/lib/editorial-dashboard/actions";
import type {
  GeneratedArticleRow,
  NewsEventRow,
  NewsSignalRow,
} from "@/lib/types/newsroom";
import { recordDirectChatCompletion } from "@/lib/observability/openai-cost";

const OPENAI_URL = "https://api.openai.com/v1/chat/completions";
const TIMEOUT_MS = 28_000;

async function loadArticle(
  articleId: string,
  tenantId: string
): Promise<GeneratedArticleRow | null> {
  const supabase = createAdminServerClient();
  const { data } = await supabase
    .from("generated_articles")
    .select("*")
    .eq("id", articleId)
    .eq("tenant_id", tenantId)
    .maybeSingle();
  return (data ?? null) as unknown as GeneratedArticleRow | null;
}

async function loadEvent(eventId: string): Promise<NewsEventRow | null> {
  const supabase = createAdminServerClient();
  const { data } = await supabase
    .from("news_events")
    .select("*")
    .eq("id", eventId)
    .maybeSingle();
  return (data ?? null) as unknown as NewsEventRow | null;
}

async function loadSignals(event: NewsEventRow): Promise<NewsSignalRow[]> {
  if (!event.signal_ids?.length) return [];
  const supabase = createAdminServerClient();
  const { data } = await supabase
    .from("news_signals")
    .select("*")
    .in("id", event.signal_ids);
  return (data ?? []) as unknown as NewsSignalRow[];
}

function buildFactPack(event: NewsEventRow, signals: NewsSignalRow[]): string {
  const facts = signals.map((s, i) => {
    const excerpt = (s.raw_content ?? s.title).trim().slice(0, 400);
    return `[${i + 1}] ${s.title}\n${excerpt}`;
  });
  return [
    `Event: ${event.canonical_title}`,
    `Summary: ${event.event_summary ?? ""}`,
    `Region: ${event.region ?? "india"}`,
    ...facts,
  ].join("\n\n");
}

async function callRegenerateLlm(
  factPack: string,
  language: SupportedEditorialLanguage
): Promise<EditorialDraft | null> {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) return null;

  const model =
    process.env.NEWSROOM_EDITORIAL_MODEL?.trim() ||
    process.env.OPENAI_MODEL?.trim() ||
    "gpt-4o-mini";
  const systemContent = `Regenerate a news article from the fact pack. Return JSON: {"headline":"","summary":"","sections":{"intro":"","key_developments":"","regional_implications":""}}. Language: ${language === "hi" ? "Hindi" : "English"}.`;
  const started = Date.now();

  const res = await fetch(OPENAI_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      temperature: 0.35,
      max_tokens: 2400,
      messages: [
        {
          role: "system",
          content: systemContent,
        },
        { role: "user", content: factPack },
      ],
      response_format: { type: "json_object" },
    }),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });

  const latencyMs = Date.now() - started;

  if (!res.ok) {
    recordDirectChatCompletion({
      operation: "editorial_regenerate",
      model,
      system: systemContent,
      user: factPack,
      latencyMs,
      success: false,
      context: { worker: "admin_regenerate" },
    });
    return null;
  }
  const json = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const raw = json.choices?.[0]?.message?.content;
  recordDirectChatCompletion({
    operation: "editorial_regenerate",
    model,
    system: systemContent,
    user: factPack,
    json,
    content: raw ?? undefined,
    latencyMs,
    success: Boolean(raw),
    context: { worker: "admin_regenerate" },
  });
  if (!raw) return null;

  const parsed = JSON.parse(raw) as {
    headline?: string;
    summary?: string;
    sections?: Record<string, string>;
  };
  const labels =
    language === "hi"
      ? { intro: "सारांश", key: "मुख्य घटनाक्रम", regional: "क्षेत्रीय प्रभाव" }
      : { intro: "Summary", key: "Key developments", regional: "Regional impact" };

  const body = ["intro", "key_developments", "regional_implications"]
    .map((k) => {
      const text = parsed.sections?.[k]?.trim();
      if (!text) return "";
      const label =
        k === "intro"
          ? labels.intro
          : k === "key_developments"
            ? labels.key
            : labels.regional;
      return `## ${label}\n\n${text}`;
    })
    .filter(Boolean)
    .join("\n\n");

  if (!parsed.headline || !parsed.summary) return null;

  const wc = body.split(/\s+/).length;
  return {
    headline: parsed.headline,
    summary: parsed.summary,
    article_body: body || parsed.summary,
    seo_title: parsed.headline.slice(0, 70),
    seo_description: parsed.summary.slice(0, 160),
    tags: [],
    reading_time:
      language === "hi"
        ? `${Math.max(1, Math.round(wc / 200))} मिनट`
        : `${Math.max(1, Math.round(wc / 200))} min read`,
    language,
  };
}

export async function regenerateGeneratedArticle(
  articleId: string,
  tenantId: string
): Promise<EditorialActionResult> {
  if (!isSupabaseConfigured()) return { ok: false, message: "No database" };
  if (!process.env.OPENAI_API_KEY?.trim()) {
    return { ok: false, message: "OPENAI_API_KEY not set" };
  }

  const article = await loadArticle(articleId, tenantId);
  if (!article) return { ok: false, message: "Article not found" };

  const eventId = article.event_id;
  if (!eventId) return { ok: false, message: "No linked event" };

  const event = await loadEvent(eventId);
  if (!event) return { ok: false, message: "Event not found" };

  const signals = await loadSignals(event);
  const language = (article.language === "en" ? "en" : "hi") as SupportedEditorialLanguage;
  const factPack = buildFactPack(event, signals);

  let draft =
    (await callRegenerateLlm(factPack, language)) ??
    ({
      headline: article.headline,
      summary: article.summary ?? "",
      article_body: article.article_body ?? "",
      seo_title: article.seo_title ?? article.headline,
      seo_description: article.seo_description ?? article.summary ?? "",
      tags: article.tags ?? [],
      reading_time: article.reading_time ?? "3 min read",
      language,
    } satisfies EditorialDraft);

  draft = await repairBorderlineDraft({ draft, event, factPackText: factPack, language });
  draft = applyEditorialEnhancements(draft, event);

  const sourceTexts = signals.map((s) => `${s.title} ${s.raw_content ?? ""}`);
  const quality = runEditorialQualityChecks({
    headline: draft.headline,
    summary: draft.summary,
    articleBody: draft.article_body,
    seoTitle: draft.seo_title,
    seoDescription: draft.seo_description,
    sourceTexts,
    factPackText: factPack,
    sourceCount: signals.length,
    region: event.region,
    category: event.category,
    language: draft.language,
    event,
    forcePublish: true,
  });

  const meta = article.editorial_metadata ?? {};
  const supabase = createAdminServerClient();
  const { error } = await supabase
    .from("generated_articles")
    .update({
      headline: draft.headline,
      summary: draft.summary,
      article_body: draft.article_body,
      seo_title: draft.seo_title,
      seo_description: draft.seo_description,
      reading_time: draft.reading_time,
      editorial_metadata: {
        ...meta,
        ai_confidence: quality.ai_confidence,
        quality_breakdown: quality.quality_breakdown,
        quality_report: quality,
        regenerated_at: new Date().toISOString(),
        source_count: signals.length,
      },
    })
    .eq("id", articleId)
    .eq("tenant_id", tenantId);

  if (error) return { ok: false, message: error.message };
  return { ok: true, message: "Article regenerated" };
}

export async function queueArticleImageRegeneration(
  articleId: string,
  tenantId: string
): Promise<EditorialActionResult> {
  if (!isSupabaseConfigured()) return { ok: false, message: "No database" };

  const article = await loadArticle(articleId, tenantId);
  if (!article) return { ok: false, message: "Article not found" };

  const queued = await enqueueEditorialImage(articleId);
  if (!queued) return { ok: false, message: "Failed to queue image" };
  return { ok: true, message: "Image queued for regeneration" };
}
