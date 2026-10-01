/**
 * Script (Unicode) detection and language validation for Hindi / English copy.
 *
 * Replaces the count-based check in news/language.ts, which used `match()` without
 * the global flag (the "count" was always ≤ 1, so a Hindi headline in an English
 * slot was never detected — 11 of 35 `en` generated_articles had Devanagari headlines).
 */

export type ScriptStats = {
  devanagari: number;
  latin: number;
  /** Devanagari + Latin letters (digits/punctuation/emoji excluded). */
  letters: number;
  devanagariRatio: number;
  latinRatio: number;
};

const DEVANAGARI = /[ऀ-ॿ]/g;
const LATIN = /[A-Za-z]/g;

export function scriptStats(text: string | null | undefined): ScriptStats {
  const s = text ?? "";
  const devanagari = (s.match(DEVANAGARI) ?? []).length;
  const latin = (s.match(LATIN) ?? []).length;
  const letters = devanagari + latin;
  return {
    devanagari,
    latin,
    letters,
    devanagariRatio: letters ? devanagari / letters : 0,
    latinRatio: letters ? latin / letters : 0,
  };
}

export type DominantScript = "devanagari" | "latin" | "mixed" | "none";

export function dominantScript(text: string | null | undefined): DominantScript {
  const st = scriptStats(text);
  if (st.letters === 0) return "none";
  if (st.devanagariRatio >= 0.7) return "devanagari";
  if (st.latinRatio >= 0.7) return "latin";
  return "mixed";
}

export type EditorialLanguage = "hi" | "en";
export type LanguageField = "headline" | "summary" | "body";

export type LanguageValidation =
  | { ok: true }
  | { ok: false; code: string; detail: string };

/**
 * Field-aware limits. Hindi copy legitimately carries Latin acronyms/names
 * (CM, IPL, GST, "Raipur"), so Hindi tolerates more Latin than English tolerates Devanagari.
 * English tolerates essentially no Devanagari: a Hindi word in an English headline is a defect.
 */
const LIMITS: Record<LanguageField, { enMaxDevanagariRatio: number; hiMinDevanagariRatio: number }> = {
  headline: { enMaxDevanagariRatio: 0.0, hiMinDevanagariRatio: 0.55 },
  summary: { enMaxDevanagariRatio: 0.03, hiMinDevanagariRatio: 0.5 },
  body: { enMaxDevanagariRatio: 0.05, hiMinDevanagariRatio: 0.5 },
};

export function validateLanguageScript(
  text: string | null | undefined,
  language: EditorialLanguage,
  field: LanguageField
): LanguageValidation {
  const st = scriptStats(text);
  if (st.letters === 0) {
    return { ok: false, code: `${field}_no_letters`, detail: "no alphabetic content" };
  }
  const limits = LIMITS[field];

  if (language === "en") {
    if (st.devanagariRatio > limits.enMaxDevanagariRatio) {
      return {
        ok: false,
        code: `script_mismatch:devanagari_in_en_${field}`,
        detail: `${(st.devanagariRatio * 100).toFixed(0)}% Devanagari in an English ${field}`,
      };
    }
    return { ok: true };
  }

  if (st.devanagariRatio < limits.hiMinDevanagariRatio) {
    return {
      ok: false,
      code: `script_mismatch:latin_in_hi_${field}`,
      detail: `only ${(st.devanagariRatio * 100).toFixed(0)}% Devanagari in a Hindi ${field}`,
    };
  }
  return { ok: true };
}

/** Validate headline + summary + body together; returns every failure. */
export function validateArticleLanguage(input: {
  language: EditorialLanguage;
  headline: string | null | undefined;
  summary?: string | null;
  body?: string | null;
}): Array<{ code: string; detail: string }> {
  const failures: Array<{ code: string; detail: string }> = [];
  const check = (text: string | null | undefined, field: LanguageField) => {
    if (field !== "headline" && !(text ?? "").trim()) return;
    const r = validateLanguageScript(text, input.language, field);
    if (!r.ok) failures.push({ code: r.code, detail: r.detail });
  };
  check(input.headline, "headline");
  check(input.summary, "summary");
  check(input.body, "body");
  return failures;
}

/**
 * Detect the language of arbitrary text from script, honouring a hint only when the
 * script does not contradict it. Fixes news/language.ts detectLanguage semantics.
 */
export function detectLanguageByScript(
  text: string,
  hint?: EditorialLanguage | null
): EditorialLanguage {
  const st = scriptStats(text.slice(0, 400));
  if (st.letters === 0) return hint ?? "en";
  if (st.devanagariRatio >= 0.4) return "hi";
  if (st.devanagariRatio <= 0.1) return "en";
  return hint ?? (st.devanagariRatio >= 0.25 ? "hi" : "en");
}
