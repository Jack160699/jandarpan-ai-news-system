import type { AiDeskTemplate, AiStoryLanguage } from "./types";

const TEMPLATE_HINTS: Record<AiDeskTemplate, string> = {
  breaking_news:
    "Breaking news format: urgent lead, what happened, who is affected, what is next. Keep sentences short.",
  district_update:
    "District desk update for Chhattisgarh: local names, places, administration response, citizen impact.",
  political_report:
    "Political report: neutral tone, attribute claims, party/office-holder context, no sensationalism.",
  crime_report:
    "Crime report: facts only, police attribution, avoid graphic detail, victim privacy.",
  sports_brief:
    "Sports brief: score/result upfront, key performers, tournament context.",
  business_update:
    "Business update: market/company impact, numbers if present, policy angle for readers.",
  general: "Standard regional newsroom article structure.",
};

export function resolveStoryLanguage(code?: string): AiStoryLanguage {
  const c = (code ?? "hi").toLowerCase();
  if (c === "en" || c === "english") return "en";
  if (c === "hinglish") return "hinglish";
  return "hi";
}

export function languageInstruction(lang: AiStoryLanguage): string {
  switch (lang) {
    case "en":
      return "Write in clear English suitable for Indian regional readers.";
    case "hinglish":
      return "Write in Hinglish (Hindi in Latin script mixed with English news terms) for mobile readers.";
    default:
      return "Write in Hindi (Devanagari) suitable for Chhattisgarh regional readers.";
  }
}

export function buildStorySystemPrompt(input: {
  language: AiStoryLanguage;
  deskTemplate: AiDeskTemplate;
}): string {
  return [
    "You are a senior editor at Jan Darpan, a Chhattisgarh regional digital newsroom.",
    languageInstruction(input.language),
    TEMPLATE_HINTS[input.deskTemplate],
    "Output MUST be valid JSON only with this exact shape:",
    "{",
    '  "headline": string,',
    '  "summary": string (2-3 sentences, dek),',
    '  "body": string (markdown with ## sections: lead, details, context; mobile-readable paragraphs),',
    '  "tags": string[] (4-8 lowercase slug tags),',
    '  "seoTitle": string (<=60 chars),',
    '  "metaDescription": string (<=155 chars),',
    '  "socialCaptions": { "whatsapp": string, "twitter": string, "facebook": string }',
    "}",
    "Rules: professional, factual, SEO-aware, no fabricated quotes, no clickbait.",
    "If source material is thin, write a cautious desk draft and note verification needed in body.",
  ].join("\n");
}

export function buildCoverImagePrompt(input: {
  headline: string;
  summary: string;
}): string {
  return [
    "Editorial news thumbnail for Indian regional newspaper website.",
    "Professional photojournalism style, realistic, no text overlay, no logos, no watermarks.",
    `Story: ${input.headline}.`,
    `Context: ${input.summary.slice(0, 180)}.`,
    "Muted colors, credible newsroom aesthetic, 16:9 friendly composition.",
  ].join(" ");
}
