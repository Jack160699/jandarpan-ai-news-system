/**
 * Multilingual AI voice narration — OpenAI TTS
 */

import {
  getLanguageConfig,
  normalizeArticleLanguage,
  type NewsroomLanguage,
} from "@/lib/i18n/languages";
import type { ShortVoiceMeta } from "@/lib/news/shorts/types";

const OPENAI_SPEECH_URL = "https://api.openai.com/v1/audio/speech";

/** OpenAI voices — Hindi/CG use warm narrator; regional newsroom feel */
const VOICE_BY_LANG: Record<NewsroomLanguage, string> = {
  en: "alloy",
  hi: "nova",
  cg: "nova",
  mr: "nova",
  bn: "shimmer",
  ta: "coral",
};

export function resolveVoiceId(language: NewsroomLanguage): string {
  return (
    process.env.NEWSROOM_TTS_VOICE?.trim() ||
    VOICE_BY_LANG[language] ||
    "nova"
  );
}

export function buildVoiceStreamPath(slug: string): string {
  return `/api/shorts/voice/${slug}`;
}

export function buildVoiceMeta(
  slug: string,
  language: NewsroomLanguage,
  durationSec: number,
  status: ShortVoiceMeta["status"] = "pending"
): ShortVoiceMeta {
  return {
    status,
    language,
    voiceId: resolveVoiceId(language),
    durationSec,
    streamPath: buildVoiceStreamPath(slug),
    generatedAt: status === "ready" ? new Date().toISOString() : undefined,
  };
}

export async function synthesizeShortVoice(input: {
  script: string;
  language: NewsroomLanguage;
  slug: string;
}): Promise<{ audio: ArrayBuffer; voice: ShortVoiceMeta } | null> {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  const lang = normalizeArticleLanguage(input.language);
  const voiceId = resolveVoiceId(lang);

  if (!apiKey) {
    return {
      audio: new ArrayBuffer(0),
      voice: buildVoiceMeta(input.slug, lang, 58, "unavailable"),
    };
  }

  const truncated = input.script.slice(0, 4096);

  try {
    const res = await fetch(OPENAI_SPEECH_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: process.env.NEWSROOM_TTS_MODEL?.trim() || "tts-1",
        voice: voiceId,
        input: truncated,
        response_format: "mp3",
      }),
      signal: AbortSignal.timeout(60_000),
    });

    if (!res.ok) {
      return {
        audio: new ArrayBuffer(0),
        voice: {
          ...buildVoiceMeta(input.slug, lang, 58, "failed"),
          error: `tts_http_${res.status}`,
        },
      };
    }

    const audio = await res.arrayBuffer();
    return {
      audio,
      voice: {
        ...buildVoiceMeta(input.slug, lang, 58, "ready"),
        voiceId,
        generatedAt: new Date().toISOString(),
      },
    };
  } catch (err) {
    return {
      audio: new ArrayBuffer(0),
      voice: {
        ...buildVoiceMeta(input.slug, lang, 58, "failed"),
        error: err instanceof Error ? err.message : "tts_failed",
      },
    };
  }
}

export function ttsLocaleHint(language: NewsroomLanguage): string {
  return getLanguageConfig(language).bcp47;
}
