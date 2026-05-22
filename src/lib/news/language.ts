/**
 * Lightweight language detection for Hindi / English headlines
 */

const DEVANAGARI_RE = /[\u0900-\u097F]/;

export function detectLanguage(text: string, hint?: "hi" | "en" | null): "hi" | "en" {
  if (hint === "hi" || hint === "en") {
    const sample = text.slice(0, 200);
    const devanagari = (sample.match(DEVANAGARI_RE) ?? []).length;
    const ratio = devanagari / Math.max(sample.replace(/\s/g, "").length, 1);
    if (ratio > 0.15 && hint === "en") return "hi";
    if (ratio < 0.05 && hint === "hi") return "en";
    return hint;
  }

  const sample = `${text}`.slice(0, 400);
  const chars = sample.replace(/\s/g, "");
  if (!chars.length) return "en";

  const devanagari = (sample.match(DEVANAGARI_RE) ?? []).length;
  const ratio = devanagari / chars.length;

  return ratio >= 0.12 ? "hi" : "en";
}
