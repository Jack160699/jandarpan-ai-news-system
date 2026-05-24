const DEVANAGARI_RE = /[\u0900-\u097F]/;

export type SpeechLangHint = "hi-IN" | "en-IN" | "auto";

/** Default pacing — calmer, less robotic */
export const SPEECH_DEFAULT_RATE = 0.9;
export const SPEECH_DEFAULT_PITCH = 1;
export const SPEECH_DEFAULT_VOLUME = 1;

const ROBOTIC_VOICE_RE =
  /\b(david|mark|zira|fred|richard|samantha|microsoft)\b/i;

const PREMIUM_VOICE_RE =
  /\b(google|natural|neural|premium|enhanced|lekha|heera|swara|rishi)\b/i;

export function detectSpeechLang(text: string): "hi-IN" | "en-IN" {
  if (DEVANAGARI_RE.test(text)) return "hi-IN";
  return "en-IN";
}

export function resolveSpeechLang(
  text: string,
  hint?: SpeechLangHint
): "hi-IN" | "en-IN" {
  if (hint && hint !== "auto") return hint;
  return detectSpeechLang(text);
}

function voiceScore(voice: SpeechSynthesisVoice, lang: "hi-IN" | "en-IN"): number {
  const vLang = voice.lang.toLowerCase();
  const name = voice.name.toLowerCase();
  let score = 0;

  if (vLang === lang.toLowerCase()) score += 12;
  if (vLang.startsWith(lang.split("-")[0] ?? "")) score += 8;

  if (PREMIUM_VOICE_RE.test(name)) score += 18;
  if (name.includes("google")) score += 16;

  if (lang === "hi-IN") {
    if (name.includes("hindi") || name.includes("india")) score += 8;
    if (name.includes("lekha") || name.includes("heera") || name.includes("swara")) {
      score += 14;
    }
  }

  if (lang === "en-IN") {
    if (name.includes("india") || name.includes("english")) score += 6;
  }

  if (voice.localService) score += 3;

  if (ROBOTIC_VOICE_RE.test(name) && !PREMIUM_VOICE_RE.test(name)) {
    score -= 12;
  }

  if (voice.default && PREMIUM_VOICE_RE.test(name)) score += 2;

  return score;
}

export function pickVoice(
  voices: SpeechSynthesisVoice[],
  lang: "hi-IN" | "en-IN"
): SpeechSynthesisVoice | null {
  if (!voices.length) return null;
  const ranked = [...voices].sort(
    (a, b) => voiceScore(b, lang) - voiceScore(a, lang)
  );
  return ranked[0] ?? null;
}

/** Split into speakable chunks with natural pauses */
export function splitSpeechChunks(text: string): string[] {
  const normalized = text.replace(/\s+/g, " ").trim();
  if (!normalized) return [];

  const parts = normalized
    .split(/(?<=[.!?।])\s+|\n+/)
    .map((p) => p.trim())
    .filter((p) => p.length > 0);

  if (parts.length > 0) return parts;
  return [normalized];
}

export function loadVoices(): Promise<SpeechSynthesisVoice[]> {
  if (typeof window === "undefined" || !window.speechSynthesis) {
    return Promise.resolve([]);
  }
  const synth = window.speechSynthesis;
  const existing = synth.getVoices();
  if (existing.length > 0) return Promise.resolve(existing);

  return new Promise((resolve) => {
    const finish = () => resolve(synth.getVoices());
    synth.onvoiceschanged = () => {
      synth.onvoiceschanged = null;
      finish();
    };
    window.setTimeout(finish, 500);
  });
}
