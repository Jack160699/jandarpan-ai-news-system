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

/** Supplemental desk guidance when category does not map 1:1 to AiDeskTemplate */
const CATEGORY_EDITORIAL_HINTS: Record<string, string> = {
  weather:
    "Weather desk: IMD or official alert attribution, district-wise impact, safety guidance — only from sources.",
  education:
    "Education desk: school, board, or exam facts; attribute to education department or named officials when present.",
  health:
    "Health desk: hospital or government health department attribution; symptoms and prevention only from sources.",
  entertainment:
    "Entertainment brief: film, event, or celebrity facts only; no invented gossip or speculation.",
};

const ATTRIBUTION_RULES: Record<"hi" | "en", string> = {
  hi: [
    "Attribution (only when the fact pack supports it):",
    'Use natural Hindi phrasing such as "पुलिस के अनुसार", "प्रशासन के अनुसार", "प्रत्यक्षदर्शियों के अनुसार", "अधिकारियों के अनुसार".',
    "Never invent quotes, speakers, or attributions.",
  ].join(" "),
  en: [
    "Attribution (only when the fact pack supports it):",
    'Use phrases such as "according to police", "officials said", "witnesses said".',
    "Never invent quotes, speakers, or attributions.",
  ].join(" "),
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

/** Map news event category to the existing desk template system */
export function resolveDeskTemplateFromCategory(
  category?: string | null,
  options?: { region?: string | null; urgencyScore?: number | null }
): AiDeskTemplate {
  if (options?.urgencyScore != null && options.urgencyScore >= 0.75) {
    return "breaking_news";
  }

  const cat = (category ?? "").toLowerCase();

  if (cat === "crime" || cat.includes("crime")) return "crime_report";
  if (cat === "politics") return "political_report";
  if (cat === "sports") return "sports_brief";
  if (cat === "business" || cat === "technology") return "business_update";
  if (cat === "local" || options?.region === "chhattisgarh") return "district_update";

  return "general";
}

/** Extra category hint layered on top of desk template (weather, education, etc.) */
export function getCategoryEditorialHint(category?: string | null): string | null {
  const cat = (category ?? "").toLowerCase();
  return CATEGORY_EDITORIAL_HINTS[cat] ?? null;
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

/** Pipeline editorial prompt — reuses desk templates + language rules from the manual desk */
export function buildEditorialPipelineSystemPrompt(input: {
  language: "hi" | "en";
  deskTemplate: AiDeskTemplate;
  categoryHint?: string | null;
}): string {
  const lang = input.language === "en" ? "en" : "hi";

  return [
    "You are a senior editor at Jan Darpan, a Chhattisgarh regional digital newsroom.",
    languageInstruction(lang),
    TEMPLATE_HINTS[input.deskTemplate],
    input.categoryHint ?? "",
    ATTRIBUTION_RULES[lang],
    "Output MUST be valid JSON only:",
    "{",
    '  "headline": string,',
    '  "summary": string (2-3 sentence dek — shown separately; do NOT repeat in body),',
    '  "sections": {',
    '    "lead": string (opening paragraph — must differ from summary),',
    '    "details": string (main report in natural newsroom prose),',
    '    "context": string (OPTIONAL — only if fact pack has verifiable background; omit key if no facts)',
    "  },",
    '  "seo_title": string (<=60 chars),',
    '  "seo_description": string (<=155 chars),',
    '  "tags": string[] (4-8 lowercase tags)',
    "}",
    "Rules:",
    "- Synthesize ONLY facts in the fact pack. Do NOT invent names, numbers, quotes, or outcomes.",
    "- Do NOT add Background, Regional Impact, or Conclusion unless explicitly supported by facts.",
    "- Never use visible template section headings inside section text (no ## सारांश, ## Background, etc.).",
    "- Write like a professional newsroom article — flowing paragraphs, not an AI report template.",
    "- If source material is thin, write a cautious short wire; omit empty optional sections entirely.",
    "No fabricated quotes, no clickbait.",
  ]
    .filter(Boolean)
    .join("\n");
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
