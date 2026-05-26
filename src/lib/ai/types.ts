export type AiDeskTemplate =
  | "breaking_news"
  | "district_update"
  | "political_report"
  | "crime_report"
  | "sports_brief"
  | "business_update"
  | "general";

export type AiStoryLanguage = "en" | "hi" | "hinglish";

export type AiGenerateStoryMode = "prompt" | "text" | "link";

export type AiSocialCaptionsPayload = {
  whatsapp: string;
  twitter: string;
  facebook: string;
};

export type AiStoryPack = {
  headline: string;
  summary: string;
  body: string;
  tags: string[];
  seoTitle: string;
  metaDescription: string;
  socialCaptions: AiSocialCaptionsPayload;
};

export type GenerateStoryInput = {
  mode: AiGenerateStoryMode;
  language?: string;
  deskTemplate?: AiDeskTemplate;
  prompt?: string;
  rawText?: string;
  sourceText?: string;
  url?: string;
  existingHeadline?: string;
};

export type ExtractLinkResult =
  | { ok: true; title: string; text: string; url: string }
  | { ok: false; error: string };

export type GenerateStoryResult =
  | { ok: true; story: AiStoryPack }
  | { ok: false; error: string };

export type GenerateImageResult =
  | { ok: true; imageUrl: string }
  | { ok: false; error: string };
