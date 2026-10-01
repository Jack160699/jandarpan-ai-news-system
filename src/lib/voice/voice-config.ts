/**
 * Voice configuration: which voice reads which language/style, the Gemini-TTS delivery prompts,
 * and Chirp 3 HD pacing. Everything is overridable by env so voices can be tuned by ear
 * without a deploy. Voice names are Google's own catalogue voices — no real person's voice is
 * cloned or imitated.
 */

import type { DeliveryStyle, ScriptKind, VoiceLanguage } from "@/lib/voice/types";

export const GEMINI_TTS_DEFAULT_MODEL = "gemini-2.5-flash-tts";

/** Gemini-TTS voices (language-agnostic names). Steady, credible, "informative" registers by default. */
const GEMINI_VOICE_DEFAULTS: Record<VoiceLanguage, { standard: string; urgent: string }> = {
  "hi-IN": { standard: "Charon", urgent: "Kore" },
  "en-IN": { standard: "Charon", urgent: "Kore" },
};

/** Chirp 3 HD voices per locale. */
const CHIRP_VOICE_DEFAULTS: Record<VoiceLanguage, { standard: string; urgent: string }> = {
  "hi-IN": { standard: "hi-IN-Chirp3-HD-Charon", urgent: "hi-IN-Chirp3-HD-Kore" },
  "en-IN": { standard: "en-IN-Chirp3-HD-Charon", urgent: "en-IN-Chirp3-HD-Kore" },
};

const URGENT_STYLES: ReadonlySet<DeliveryStyle> = new Set(["breaking_news", "urgency"]);

const envKey = (lang: VoiceLanguage, kind: "GEMINI" | "CHIRP", tone: "STANDARD" | "URGENT") =>
  `VOICE_${kind}_${lang === "hi-IN" ? "HI" : "EN"}_${tone}`;

export function resolveGeminiVoice(language: VoiceLanguage, style: DeliveryStyle, env: Record<string, string | undefined> = process.env): string {
  const tone = URGENT_STYLES.has(style) ? "urgent" : "standard";
  return (
    env[envKey(language, "GEMINI", tone.toUpperCase() as "STANDARD" | "URGENT")]?.trim() ||
    GEMINI_VOICE_DEFAULTS[language][tone]
  );
}

export function resolveChirpVoice(language: VoiceLanguage, style: DeliveryStyle, env: Record<string, string | undefined> = process.env): string {
  const tone = URGENT_STYLES.has(style) ? "urgent" : "standard";
  return (
    env[envKey(language, "CHIRP", tone.toUpperCase() as "STANDARD" | "URGENT")]?.trim() ||
    CHIRP_VOICE_DEFAULTS[language][tone]
  );
}

export function geminiModel(env: Record<string, string | undefined> = process.env): string {
  return env.GOOGLE_TTS_GEMINI_MODEL?.trim() || GEMINI_TTS_DEFAULT_MODEL;
}

/** Chirp 3 HD speaking rate per style (1.0 = normal). Broadcast pacing: steady, never rushed. */
export const CHIRP_RATE: Record<DeliveryStyle, number> = {
  breaking_news: 1.04,
  urgency: 1.06,
  standard_bulletin: 0.98,
  serious_report: 0.94,
  human_interest: 0.95,
  sports: 1.05,
  weather: 1.0,
  explainer: 0.96,
};

const DICTION: Record<VoiceLanguage, string> = {
  "hi-IN":
    "Speak natural, professional Hindi broadcast diction — the clear, well-articulated register of a Hindi television or radio news reader from Chhattisgarh and the Hindi belt. Pronounce Sanskrit-derived words cleanly, pronounce English loanwords the way Indian newsreaders do, and keep the intonation conversational rather than sing-song.",
  "en-IN":
    "Speak natural Indian English broadcast diction — a neutral, clear Indian-English news reader with crisp consonants, standard Indian pronunciation of place names and Hindi words, and conversational rather than theatrical intonation.",
};

const STYLE_DIRECTION: Record<DeliveryStyle, string> = {
  breaking_news:
    "This is BREAKING NEWS. Deliver it with controlled urgency: a brisk but steady pace, firm emphasis on the key fact in the first sentence, then composed and clear. Serious, credible, never shouting or exaggerated.",
  urgency:
    "This is an urgent public-interest alert. Sound alert and direct with a slightly quicker pace and clear emphasis on instructions or locations, but stay calm and authoritative.",
  standard_bulletin:
    "Deliver a standard news bulletin item: even, confident pacing, natural sentence rhythm, subtle emphasis on names, places and numbers, and a brief natural pause between sentences.",
  serious_report:
    "This is a serious report (crime, accident, court, loss of life). Use a measured, sober tone and a slightly slower pace. No drama, no smiling tone; respectful and factual.",
  human_interest:
    "This is a human-interest story. Sound warm and humane while remaining professional, with an unhurried pace and gentle emphasis; not sentimental or cartoonish.",
  sports:
    "This is a sports item. Sound energetic and upbeat but professional, with a slightly faster pace and clear emphasis on scores, names and results.",
  weather:
    "This is a weather bulletin. Sound clear, calm and informative with even pacing, and give extra clarity to place names, temperatures and warnings.",
  explainer:
    "This is an explainer. Sound like a knowledgeable anchor walking the audience through the topic: steady, clear, slightly slower, with natural pauses between ideas.",
};

const KIND_DIRECTION: Record<ScriptKind, string> = {
  radio: "The listener cannot see anything, so keep the reading self-contained and smooth.",
  tv: "This is a television anchor read: crisp and confident, addressed to the camera.",
  short_bulletin: "This is a short bulletin: tight, punchy and complete in a few sentences.",
};

/**
 * Gemini-TTS style prompt. Explicit guardrails keep the delivery broadcast-grade:
 * natural human pacing and subtle emphasis, never robotic, exaggerated or cartoonish, and
 * no imitation of any named real-world anchor.
 */
export function buildGeminiStylePrompt(language: VoiceLanguage, style: DeliveryStyle, kind: ScriptKind): string {
  return [
    "You are a professional Indian newsreader.",
    DICTION[language],
    STYLE_DIRECTION[style],
    KIND_DIRECTION[kind],
    "Use natural human pacing with natural pauses at commas and sentence ends, and subtle, appropriate emphasis.",
    "Do not sound robotic, monotone, exaggerated, theatrical or cartoonish. Do not imitate any specific real person.",
    "Read only the text provided, exactly as written; do not add words.",
  ].join(" ");
}
