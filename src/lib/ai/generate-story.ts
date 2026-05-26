import { extractLinkContent } from "./extract-link";
import { AiServiceError, chatJsonCompletion, isOpenAiConfigured, parseJsonFromModel } from "./openai";
import { buildStorySystemPrompt, resolveStoryLanguage } from "./prompts";
import type {
  AiDeskTemplate,
  AiStoryPack,
  GenerateStoryInput,
  GenerateStoryResult,
} from "./types";

const MAX_SOURCE_CHARS = 6_500;

function trimSource(text: string): string {
  return text.replace(/\s+/g, " ").trim().slice(0, MAX_SOURCE_CHARS);
}

function normalizeTemplate(t?: string): AiDeskTemplate {
  const allowed: AiDeskTemplate[] = [
    "breaking_news",
    "district_update",
    "political_report",
    "crime_report",
    "sports_brief",
    "business_update",
    "general",
  ];
  return allowed.includes(t as AiDeskTemplate) ? (t as AiDeskTemplate) : "general";
}

function validateStoryPack(raw: unknown): AiStoryPack | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const social = o.socialCaptions as Record<string, unknown> | undefined;
  if (
    typeof o.headline !== "string" ||
    typeof o.summary !== "string" ||
    typeof o.body !== "string" ||
    !Array.isArray(o.tags) ||
    typeof o.seoTitle !== "string" ||
    typeof o.metaDescription !== "string" ||
    !social ||
    typeof social.whatsapp !== "string" ||
    typeof social.twitter !== "string" ||
    typeof social.facebook !== "string"
  ) {
    return null;
  }

  return {
    headline: o.headline.trim(),
    summary: o.summary.trim(),
    body: o.body.trim(),
    tags: o.tags.map((t) => String(t).trim().toLowerCase()).filter(Boolean).slice(0, 10),
    seoTitle: o.seoTitle.trim().slice(0, 70),
    metaDescription: o.metaDescription.trim().slice(0, 160),
    socialCaptions: {
      whatsapp: social.whatsapp.trim(),
      twitter: social.twitter.trim(),
      facebook: social.facebook.trim(),
    },
  };
}

function buildUserPayload(input: {
  mode: GenerateStoryInput["mode"];
  source: string;
  prompt?: string;
  url?: string;
  existingHeadline?: string;
}): string {
  const parts = [
    `Mode: ${input.mode}`,
    input.existingHeadline ? `Editor headline hint: ${input.existingHeadline}` : "",
    input.url ? `Source URL: ${input.url}` : "",
    input.prompt ? `Desk brief: ${input.prompt}` : "",
    `Source material:\n${input.source}`,
  ];
  return parts.filter(Boolean).join("\n\n");
}

export async function generateNewsroomStory(
  input: GenerateStoryInput
): Promise<GenerateStoryResult> {
  if (!isOpenAiConfigured()) {
    return { ok: false, error: "ai_unavailable" };
  }

  const language = resolveStoryLanguage(input.language);
  const deskTemplate = normalizeTemplate(input.deskTemplate);

  let sourceText = "";
  let sourceUrl = input.url;

  try {
    if (input.mode === "link") {
      if (input.sourceText?.trim()) {
        sourceText = trimSource(input.sourceText);
      } else if (input.url?.trim()) {
        const extracted = await extractLinkContent(input.url.trim());
        if (!extracted.ok) {
          return { ok: false, error: extracted.error };
        }
        sourceText = trimSource(
          extracted.title ? `${extracted.title}\n\n${extracted.text}` : extracted.text
        );
        sourceUrl = extracted.url;
      } else {
        return { ok: false, error: "missing_url" };
      }
    } else if (input.mode === "text") {
      sourceText = trimSource(input.rawText ?? "");
      if (!sourceText) return { ok: false, error: "missing_text" };
    } else {
      const brief = (input.prompt ?? "").trim();
      if (!brief) return { ok: false, error: "missing_prompt" };
      sourceText = trimSource(
        input.rawText?.trim()
          ? `${brief}\n\n---\n\n${input.rawText}`
          : brief
      );
    }

    const raw = await chatJsonCompletion({
      system: buildStorySystemPrompt({ language, deskTemplate }),
      user: buildUserPayload({
        mode: input.mode,
        source: sourceText,
        prompt: input.prompt,
        url: sourceUrl,
        existingHeadline: input.existingHeadline,
      }),
      maxTokens: 1300,
    });

    const parsed = validateStoryPack(parseJsonFromModel<unknown>(raw));
    if (!parsed) {
      return { ok: false, error: "ai_parse_failed" };
    }

    return { ok: true, story: parsed };
  } catch (err) {
    if (err instanceof AiServiceError) {
      return { ok: false, error: err.code };
    }
    return { ok: false, error: "ai_request_failed" };
  }
}
