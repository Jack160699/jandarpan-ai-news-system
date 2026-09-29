/**
 * Headline quality gate — blocks generic / placeholder / non-specific headlines
 * ("Regional News Update", "Latest News Update", ...) before publication.
 *
 * A headline must be: specific (names an entity, place, number or event), long enough
 * to describe something, not boilerplate, and not a duplicate of a recent headline.
 * Language correctness is validated separately (script-detect.ts).
 */

import type { EditorialLanguage } from "@/lib/news/quality/script-detect";

/** Whole-headline boilerplate (after normalisation). */
const GENERIC_EXACT: RegExp[] = [
  /^(regional|local|state|national|world|india|district)?\s*(news|update|updates|headlines?|stories|story|report|bulletin|roundup)(\s+(update|updates|today|now))?$/i,
  /^(latest|breaking|top|today'?s?|daily|live|fresh|big|major|important)\s+(news|update|updates|headlines?|stories|story|bulletin)(\s+(update|updates|today|now))?$/i,
  /^(news|breaking|latest)\s*(today|now|update|alert)?$/i,
  /^chhattisgarh\s+(news|update|updates|headlines?)(\s+(update|today))?$/i,
  /^(क्षेत्रीय|स्थानीय|राज्य|राष्ट्रीय)?\s*(समाचार|खबर|खबरें|ख़बरें|अपडेट|सुर्खियां|सुर्खियाँ|बुलेटिन)(\s+(अपडेट|आज))?$/,
  /^(ताज़ा|ताजा|ताज़ा-तरीन|ब्रेकिंग|आज\s*की|बड़ी|प्रमुख|मुख्य)\s*(खबर|खबरें|ख़बर|ख़बरें|समाचार|न्यूज़|न्यूज|अपडेट|सुर्खियां)(\s+(अपडेट|आज))?$/,
  /^छत्तीसगढ़?\s*(समाचार|खबर|खबरें|अपडेट|न्यूज़?)(\s+अपडेट)?$/,
];

/** Placeholder markers that must never survive into a published headline. */
const PLACEHOLDER_RE =
  /\b(lorem ipsum|untitled|no title|n\/a|null|undefined|tbd|placeholder|headline here|desk draft)\b|\[[^\]]*headline[^\]]*\]|\{\{[^}]*\}\}/i;

const EN_STOPWORDS = new Set([
  "a", "an", "the", "and", "or", "of", "in", "on", "at", "to", "for", "by", "with", "from",
  "as", "is", "are", "was", "were", "be", "news", "update", "updates", "latest", "breaking",
  "today", "new", "says", "said", "over", "after", "amid", "about", "into", "out", "up",
]);
const HI_STOPWORDS = new Set([
  "का", "की", "के", "में", "से", "पर", "को", "और", "है", "हैं", "था", "थी", "थे", "ने", "एक",
  "यह", "वह", "भी", "तो", "कि", "लिए", "साथ", "बाद", "खबर", "समाचार", "अपडेट", "ताजा", "ताज़ा",
]);

export type HeadlineQualityFailure =
  | "empty"
  | "generic_boilerplate"
  | "placeholder"
  | "too_short"
  | "no_specific_entity"
  | "duplicate_of_recent"
  | "all_caps_shouting";

export type HeadlineQualityResult = {
  ok: boolean;
  failures: HeadlineQualityFailure[];
  /** Informational tokens used for the specificity decision. */
  contentTokens: string[];
};

export function normalizeHeadline(h: string): string {
  return h
    .toLowerCase()
    .replace(/[‘’“”"'`]/g, "")
    .replace(/[|:\-–—•·!?.,;()[\]{}]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function isGenericHeadline(headline: string | null | undefined): boolean {
  const h = (headline ?? "").trim();
  if (!h) return true;
  const stripped = h
    .replace(/^[\s|:\-–—•·]+|[\s|:\-–—•·!?.]+$/g, "")
    .replace(/\s+/g, " ");
  return GENERIC_EXACT.some((re) => re.test(stripped));
}

function tokens(headline: string): string[] {
  return headline
    .replace(/[|:\-–—•·!?.,;()[\]{}"'‘’“”]+/g, " ")
    .split(/\s+/)
    .filter(Boolean);
}

/** A "specific" token: a number, a proper-noun-looking Latin word, or a non-stopword Devanagari word. */
function contentTokens(headline: string, language: EditorialLanguage): string[] {
  const all = tokens(headline);
  const out: string[] = [];
  all.forEach((tok, idx) => {
    const lower = tok.toLowerCase();
    if (/^\d[\d,.]*%?$/.test(tok)) {
      out.push(tok);
      return;
    }
    if (/[ऀ-ॿ]/.test(tok)) {
      if (tok.length >= 3 && !HI_STOPWORDS.has(tok)) out.push(tok);
      return;
    }
    if (/^[A-Za-z][A-Za-z'.-]*$/.test(tok)) {
      if (EN_STOPWORDS.has(lower)) return;
      // Proper noun / acronym (Capitalised or ALLCAPS, not the sentence-initial word) or a long content word.
      const capitalised = /^[A-Z]/.test(tok);
      if ((capitalised && idx > 0) || tok.length >= 6 || (language === "en" && capitalised && all.length >= 5)) {
        out.push(tok);
      }
    }
  });
  return out;
}

export function evaluateHeadlineQuality(input: {
  headline: string | null | undefined;
  language: EditorialLanguage;
  /** Recent published headlines to check uniqueness against. */
  recentHeadlines?: readonly string[];
}): HeadlineQualityResult {
  const failures: HeadlineQualityFailure[] = [];
  const headline = (input.headline ?? "").trim();

  if (!headline) {
    return { ok: false, failures: ["empty"], contentTokens: [] };
  }

  if (isGenericHeadline(headline)) failures.push("generic_boilerplate");
  if (PLACEHOLDER_RE.test(headline)) failures.push("placeholder");

  const toks = tokens(headline);
  const minWords = input.language === "hi" ? 3 : 4;
  if (toks.length < minWords) failures.push("too_short");

  const content = contentTokens(headline, input.language);
  const minContent = input.language === "hi" ? 2 : 2;
  if (!failures.includes("generic_boilerplate") && content.length < minContent) {
    failures.push("no_specific_entity");
  }

  const letters = headline.replace(/[^A-Za-z]/g, "");
  if (letters.length >= 12 && letters === letters.toUpperCase() && input.language === "en") {
    failures.push("all_caps_shouting");
  }

  if (input.recentHeadlines?.length) {
    const norm = normalizeHeadline(headline);
    if (input.recentHeadlines.some((r) => normalizeHeadline(r) === norm)) {
      failures.push("duplicate_of_recent");
    }
  }

  return { ok: failures.length === 0, failures, contentTokens: content };
}
