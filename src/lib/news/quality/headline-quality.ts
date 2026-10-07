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
  // qualifier + scope + noun: "Latest Regional Update", "Breaking National News", "ताज़ा क्षेत्रीय समाचार"
  /^(latest|breaking|top|today'?s?|daily|live|fresh|big|major|important)\s+(regional|local|state|national|world|india|district|chhattisgarh)\s+(news|update|updates|headlines?|stories|story|report|bulletin|roundup)(\s+(update|updates|today|now))?$/i,
  /^(ताज़ा|ताजा|ब्रेकिंग|आज\s*की|बड़ी|प्रमुख|मुख्य)\s*(क्षेत्रीय|स्थानीय|प्रादेशिक|राज्य|राष्ट्रीय|जिला|छत्तीसगढ़?)\s*(खबर|खबरें|ख़बरें|समाचार|न्यूज़|न्यूज|अपडेट)(\s+(अपडेट|आज))?$/,
  /^chhattisgarh\s+(news|update|updates|headlines?)(\s+(update|today))?$/i,
  /^(क्षेत्रीय|स्थानीय|प्रादेशिक|प्रदेश|जिला|ज़िला|राज्य|राष्ट्रीय|अंतरराष्ट्रीय|देश|विदेश|सामान्य)?\s*(समाचार|खबर|खबरें|ख़बरें|अपडेट|सुर्खियां|सुर्खियाँ|बुलेटिन)(\s+(अपडेट|आज))?$/,
  /^(ताज़ा|ताजा|ताज़ा-तरीन|ब्रेकिंग|आज\s*की|बड़ी|प्रमुख|मुख्य)\s*(खबर|खबरें|ख़बर|ख़बरें|समाचार|न्यूज़|न्यूज|अपडेट|सुर्खियां)(\s+(अपडेट|आज))?$/,
  /^छत्तीसगढ़?\s*(समाचार|खबर|खबरें|अपडेट|न्यूज़?)(\s+अपडेट)?$/,
];

/**
 * Roundup / "live update page" headlines: a dated digest of unrelated items, not a story.
 * Seen in production: "29 सितंबर के मुख्य और ताजा समाचार: देश-दुनिया की लाइव ब्रेकिंग न्यूज अपडेट",
 * "Amar Ujala publishes live breaking news page for 22 September".
 */
const MONTHS_HI = "जनवरी|फरवरी|मार्च|अप्रैल|मई|जून|जुलाई|अगस्त|सितंबर|सितम्बर|अक्टूबर|अक्तूबर|नवंबर|नवम्बर|दिसंबर|दिसम्बर";
const MONTHS_EN = "january|february|march|april|may|june|july|august|september|october|november|december";
const ROUNDUP_PATTERNS: RegExp[] = [
  new RegExp(`^\\d{1,2}\\s*(${MONTHS_HI})\\s*(के|की|:|-)?\\s*(मुख्य|प्रमुख|ताजा|ताज़ा|बड़ी|टॉप)`),
  new RegExp(`(${MONTHS_HI})\\s*(की|के)?\\s*(प्रमुख|मुख्य|बड़ी|ताजा|ताज़ा)\\s*(खबर|खबरें|समाचार)`),
  /(ताजा|ताज़ा|मुख्य|प्रमुख)\s*(समाचारों?|खबरों?)\s*का\s*लाइव/,
  /लाइव\s*(ब्रेकिंग\s*)?(न्यूज़?|न्यूज|अपडेट)/,
  /देश[\s-]*(और|व)?[\s-]*दुनिया\s*(की|के|का)?\s*(ताजा|ताज़ा|मुख्य|प्रमुख|बड़ी)?\s*(खबर|खबरें|समाचार|अपडेट)/,
  /देशभर\s*की\s*(ताजा|ताज़ा)?\s*(और\s*मुख्य\s*)?खबरों/,
  /आज\s*की\s*(प्रमुख|मुख्य|बड़ी|ताजा|ताज़ा)\s*खबरों?/,
  /आज\s*का\s*(अंक\s*ज्योतिष|राशिफल|पंचांग)/,
  new RegExp(`live\\s*(breaking\\s*)?news\\s*(page|updates?|blog)`, "i"),
  new RegExp(`(top|main|breaking)\\s*(news|headlines|stories)\\s*(for|of|on)\\s*(\\d{1,2}\\s*)?(${MONTHS_EN})`, "i"),
  new RegExp(`(news|headlines|live\\s*updates?)\\s*(for|of|on)\\s*(\\d{1,2}\\s*)(${MONTHS_EN})`, "i"),
  // Month-first dates ("... Coverage for September 30, 2026") - seen in a draft that passed the gates on 2026-09-30.
  new RegExp(`(news|updates?|headlines|coverage|roundup|digest)\\s*(for|of|on)\\s*(${MONTHS_EN})\\s*\\d{1,2}`, "i"),
  // Filler "coverage" headlines: they describe a page, not an event.
  /\b(comprehensive|complete)\s+(news\s+)?(coverage|roundup|digest)\b/i,
  /(व्यापक|समग्र)\s*(समाचार\s*)?(कवरेज|खबरों?)/,
  /\be-?paper\b|ई-?पेपर/i,
];

export function isRoundupHeadline(headline: string | null | undefined): boolean {
  const h = (headline ?? "").trim();
  if (!h) return false;
  return ROUNDUP_PATTERNS.some((re) => re.test(h));
}

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
  | "generic_roundup"
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
  if (isRoundupHeadline(headline)) failures.push("generic_roundup");
  if (PLACEHOLDER_RE.test(headline)) failures.push("placeholder");

  const toks = tokens(headline);
  const minWords = input.language === "hi" ? 3 : 4;
  if (toks.length < minWords) failures.push("too_short");

  const content = contentTokens(headline, input.language);
  const minContent = input.language === "hi" ? 2 : 2;
  if (!failures.includes("generic_boilerplate") && !failures.includes("generic_roundup") && content.length < minContent) {
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

/**
 * Read-time guard for PUBLIC feeds. Publication already runs evaluateHeadlineQuality; this protects readers from rows that were
 * published before a gate existed or by another path. It only rejects the unambiguous failures (empty, boilerplate, roundup,
 * placeholder) -- it deliberately does not apply the stricter specificity / length / duplicate rules, which are publication-time
 * editorial judgements.
 */
export function isHeadlineFitForPublicFeed(headline: string | null | undefined): boolean {
  const h = (headline ?? "").trim();
  if (!h) return false;
  if (isGenericHeadline(h) || isRoundupHeadline(h)) return false;
  return !PLACEHOLDER_RE.test(h);
}

// ---------------------------------------------------------------------------
// Cross-headline audit (read-only): duplicates, near-duplicates and repetitive templates.
// ---------------------------------------------------------------------------

function significantTokens(headline: string): string[] {
  return normalizeHeadline(headline)
    .split(" ")
    .filter((t) => t.length >= 3 && !EN_STOPWORDS.has(t) && !HI_STOPWORDS.has(t));
}

/** Jaccard similarity of significant tokens (0..1). */
export function headlineSimilarity(a: string, b: string): number {
  const ta = new Set(significantTokens(a));
  const tb = new Set(significantTokens(b));
  if (ta.size === 0 || tb.size === 0) return 0;
  let inter = 0;
  for (const t of ta) if (tb.has(t)) inter++;
  return inter / (ta.size + tb.size - inter);
}

export type HeadlineAuditItem = { id: string; headline: string; eventId?: string | null };

export type HeadlineAuditReport = {
  total: number;
  generic: HeadlineAuditItem[];
  /** Same normalised headline on rows that are NOT the same event (or have no event id to prove it). */
  exactDuplicates: Array<{ headline: string; ids: string[] }>;
  /** Highly similar headlines on different events; same-event pairs (translations/updates) are excluded. */
  nearDuplicates: Array<{ a: HeadlineAuditItem; b: HeadlineAuditItem; similarity: number }>;
  /** The same opening words used by many headlines -- a repetitive generated template. */
  repetitiveOpenings: Array<{ opening: string; count: number; ids: string[] }>;
};

export function auditHeadlines(
  items: readonly HeadlineAuditItem[],
  options: { nearDuplicateThreshold?: number; openingWords?: number; openingMinCount?: number } = {}
): HeadlineAuditReport {
  const threshold = options.nearDuplicateThreshold ?? 0.8;
  const openingWords = options.openingWords ?? 3;
  const openingMin = options.openingMinCount ?? 4;

  const generic = items.filter((i) => !isHeadlineFitForPublicFeed(i.headline));

  const byNorm = new Map<string, HeadlineAuditItem[]>();
  for (const it of items) {
    const n = normalizeHeadline(it.headline);
    if (!n) continue;
    byNorm.set(n, [...(byNorm.get(n) ?? []), it]);
  }
  const exactDuplicates: HeadlineAuditReport["exactDuplicates"] = [];
  for (const [, group] of byNorm) {
    if (group.length < 2) continue;
    const events = new Set(group.map((g) => g.eventId ?? `__none:${g.id}`));
    if (events.size > 1) exactDuplicates.push({ headline: group[0].headline, ids: group.map((g) => g.id) });
  }

  const nearDuplicates: HeadlineAuditReport["nearDuplicates"] = [];
  for (let i = 0; i < items.length; i++) {
    for (let j = i + 1; j < items.length; j++) {
      const a = items[i];
      const b = items[j];
      if (a.eventId && b.eventId && a.eventId === b.eventId) continue;
      if (normalizeHeadline(a.headline) === normalizeHeadline(b.headline)) continue; // already an exact duplicate
      const similarity = headlineSimilarity(a.headline, b.headline);
      if (similarity >= threshold) nearDuplicates.push({ a, b, similarity: Math.round(similarity * 100) / 100 });
    }
  }

  const openings = new Map<string, string[]>();
  for (const it of items) {
    const words = normalizeHeadline(it.headline).split(" ").filter(Boolean);
    if (words.length < openingWords + 2) continue;
    const key = words.slice(0, openingWords).join(" ");
    openings.set(key, [...(openings.get(key) ?? []), it.id]);
  }
  const repetitiveOpenings = [...openings.entries()]
    .filter(([, ids]) => ids.length >= openingMin)
    .map(([opening, ids]) => ({ opening, count: ids.length, ids }))
    .sort((x, y) => y.count - x.count);

  return { total: items.length, generic, exactDuplicates, nearDuplicates, repetitiveOpenings };
}
