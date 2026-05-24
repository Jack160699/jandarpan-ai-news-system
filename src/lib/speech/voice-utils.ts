const DEVANAGARI_RE = /[\u0900-\u097F]/;

export type SpeechLangHint = "hi-IN" | "en-IN" | "auto";

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
  if (vLang === lang.toLowerCase()) score += 10;
  if (vLang.startsWith(lang.split("-")[0] ?? "")) score += 6;
  if (lang === "hi-IN" && (name.includes("hindi") || name.includes("india"))) {
    score += 4;
  }
  if (voice.localService) score += 2;
  if (!voice.default) score += 1;
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
    window.setTimeout(finish, 400);
  });
}
