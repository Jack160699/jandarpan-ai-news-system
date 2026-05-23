/**
 * Regional tone adaptation — preserve readability per language
 */

import type { NewsroomLanguage } from "@/lib/i18n/languages";

export type ToneProfile = {
  id: string;
  instruction: string;
};

const TONE_BY_LANGUAGE: Record<NewsroomLanguage, ToneProfile> = {
  hi: {
    id: "hindi_wire",
    instruction:
      "Clear Hindi (Devanagari). Short sentences. Neutral newsroom tone — no sensationalism. Preserve names and place spellings.",
  },
  en: {
    id: "indian_english",
    instruction:
      "Indian English newsroom style. Plain words, active voice. Keep Chhattisgarh place names accurate.",
  },
  cg: {
    id: "chhattisgarhi_local",
    instruction:
      "Chhattisgarhi flavour in Devanagari — local idioms OK but stay readable. Respectful, community-first tone for CG audiences.",
  },
  mr: {
    id: "marathi_regional",
    instruction:
      "Standard Marathi (Devanagari). Mumbai/Pune wire clarity. Local CG references explained briefly if needed.",
  },
  bn: {
    id: "bengali_regional",
    instruction:
      "Standard Bengali (Bangla script). Calm public-service tone. Short paragraphs for mobile reading.",
  },
  ta: {
    id: "tamil_regional",
    instruction:
      "Standard Tamil script. Formal news register. Avoid overly literary words; mobile-friendly sentence length.",
  },
};

export function getRegionalToneProfile(language: NewsroomLanguage): ToneProfile {
  return TONE_BY_LANGUAGE[language];
}

export function buildToneSystemPrompt(
  target: NewsroomLanguage,
  sourceLanguage: NewsroomLanguage
): string {
  const tone = getRegionalToneProfile(target);
  return `You are a senior regional news editor translating for Indian audiences.
Target language: ${target}
Source language: ${sourceLanguage}
Tone: ${tone.instruction}

Rules:
- Preserve facts, names, numbers, and quotes exactly — do not invent.
- Headlines must be natural in the target language (not literal calques).
- SEO title ≤ 60 characters; SEO description ≤ 155 characters in target script.
- Maintain Unicode integrity (Devanagari, Bengali, Tamil, or Latin as required).
- Reading experience: short paragraphs, high readability on mobile.`;
}
