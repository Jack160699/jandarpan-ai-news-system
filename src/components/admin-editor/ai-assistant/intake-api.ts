import { createAiId } from "./lib/browser-safe";
import type { AiIntakeMode, AiStoryDraft, EditorAiContext } from "./types";

const REQUEST_TIMEOUT_MS = 50_000;

export type DeskTemplate =
  | "breaking_news"
  | "district_update"
  | "political_report"
  | "crime_report"
  | "sports_brief"
  | "business_update"
  | "general";

type ApiStoryPack = {
  headline: string;
  summary: string;
  body: string;
  tags: string[];
  seoTitle: string;
  metaDescription: string;
  socialCaptions: {
    whatsapp: string;
    twitter: string;
    facebook: string;
  };
};

const ERROR_MESSAGES: Record<string, string> = {
  ai_unavailable: "Add OPENAI_API_KEY in server environment.",
  ai_timeout: "AI timed out — try again with shorter text.",
  ai_rate_limit: "AI rate limit — wait a moment and retry.",
  extract_failed: "Could not read that link — paste text instead.",
  invalid_url: "Enter a valid http(s) URL.",
  missing_url: "Paste a URL first.",
  missing_text: "Paste story text first.",
  missing_prompt: "Enter a short brief first.",
  ai_parse_failed: "AI response was malformed — retry.",
  ai_upstream_error: "AI service error — retry.",
  ai_image_failed: "Cover image failed — retry.",
};

export function intakeErrorMessage(code?: string): string {
  if (!code) return "Generation failed — retry.";
  return ERROR_MESSAGES[code] ?? "Generation failed — retry.";
}

async function postJson<T>(
  path: string,
  body: Record<string, unknown>
): Promise<{ ok: boolean; status: number; data: T }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const res = await fetch(path, {
      method: "POST",
      credentials: "include",
      signal: controller.signal,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const data = (await res.json().catch(() => ({}))) as T;
    return { ok: res.ok, status: res.status, data };
  } finally {
    clearTimeout(timer);
  }
}

function packToDraft(
  pack: ApiStoryPack,
  sourceType: AiIntakeMode,
  meta?: AiStoryDraft["meta"]
): AiStoryDraft {
  return {
    id: createAiId(),
    sourceType,
    headline: pack.headline,
    summary: pack.summary,
    body: pack.body,
    tags: pack.tags,
    seoTitle: pack.seoTitle,
    metaDescription: pack.metaDescription,
    socialCaptions: [
      { platform: "whatsapp", text: pack.socialCaptions.whatsapp },
      { platform: "x", text: pack.socialCaptions.twitter },
      { platform: "facebook", text: pack.socialCaptions.facebook },
    ],
    coverImageUrl: null,
    meta,
    createdAt: new Date().toISOString(),
  };
}

export async function apiExtractLink(url: string): Promise<
  | { ok: true; title: string; text: string; url: string }
  | { ok: false; error: string }
> {
  const { ok, data } = await postJson<{
    ok?: boolean;
    error?: string;
    title?: string;
    text?: string;
    url?: string;
  }>("/api/editorial/ai/extract-link", { url });

  if (!ok || !data.ok || !data.text) {
    return { ok: false, error: data.error ?? "extract_failed" };
  }

  return {
    ok: true,
    title: data.title ?? "",
    text: data.text,
    url: data.url ?? url,
  };
}

export async function apiGenerateStory(input: {
  mode: AiIntakeMode;
  context: EditorAiContext;
  prompt?: string;
  rawText?: string;
  linkUrl?: string;
  sourceText?: string;
  deskTemplate?: DeskTemplate;
}): Promise<{ ok: true; draft: AiStoryDraft } | { ok: false; error: string }> {
  const { ok, data } = await postJson<{
    ok?: boolean;
    error?: string;
    story?: ApiStoryPack;
  }>("/api/editorial/ai/generate-story", {
    mode: input.mode,
    language: input.context.language ?? "hi",
    deskTemplate: input.deskTemplate ?? "general",
    prompt: input.prompt,
    rawText: input.rawText,
    sourceText: input.sourceText,
    url: input.linkUrl,
    existingHeadline: input.context.headline,
  });

  if (!ok || !data.ok || !data.story) {
    return { ok: false, error: data.error ?? "ai_request_failed" };
  }

  return {
    ok: true,
    draft: packToDraft(data.story, input.mode, {
      sourceUrl: input.linkUrl,
    }),
  };
}

export async function apiGenerateCoverImage(input: {
  headline: string;
  summary: string;
}): Promise<{ ok: true; imageUrl: string } | { ok: false; error: string }> {
  const { ok, data } = await postJson<{
    ok?: boolean;
    error?: string;
    imageUrl?: string;
  }>("/api/editorial/ai/generate-image", {
    headline: input.headline,
    summary: input.summary,
  });

  if (!ok || !data.ok || !data.imageUrl) {
    return { ok: false, error: data.error ?? "ai_image_failed" };
  }

  return { ok: true, imageUrl: data.imageUrl };
}
