/**
 * Deterministic fact-safety check for AI-assisted user news.
 *
 * The AI may improve grammar, structure and wording. It must NOT invent facts: numbers, quotations, dates, named actors or
 * statements ("police said", "eyewitnesses") that are not in what the user actually said or wrote. This module compares the AI draft
 * with the user's source (typed text + voice transcript) and reports what the AI added.
 *
 * Accountability is for the AI only. A fact the AUTHOR types while editing is the author's own claim, not an AI invention, so the
 * final text is judged against the AI draft: a value is an AI fabrication only if it is absent from the source AND was present in the
 * AI draft. (Whether the author's own claims are publishable is a moderation question, handled by risk flags and the moderator.)
 *
 * Pure and deterministic; no model call is involved in deciding what is unsupported.
 */

export type FactFlagCode = "unsupported_number" | "unsupported_quote" | "unsupported_date" | "unsupported_actor" | "unsupported_name" | "low_source_overlap";

export type FactFlag = {
  code: FactFlagCode;
  value: string;
  /** block: must be removed or fixed before the author can approve. warn: shown to the author and moderator. */
  severity: "block" | "warn";
};

const DEVANAGARI_DIGITS = "०१२३४५६७८९";

export function normalizeDigits(text: string): string {
  return text.replace(/[०-९]/g, (d) => String(DEVANAGARI_DIGITS.indexOf(d)));
}

const NUMBER_WORDS: Record<string, string> = {
  // English
  one: "1", two: "2", three: "3", four: "4", five: "5", six: "6", seven: "7", eight: "8", nine: "9", ten: "10",
  eleven: "11", twelve: "12", fifteen: "15", twenty: "20", thirty: "30", fifty: "50", hundred: "100",
  // Hindi (common spoken forms)
  "एक": "1", "दो": "2", "तीन": "3", "चार": "4", "पांच": "5", "पाँच": "5", "छह": "6", "छः": "6", "सात": "7", "आठ": "8", "नौ": "9", "दस": "10",
  "ग्यारह": "11", "बारह": "12", "पंद्रह": "15", "बीस": "20", "तीस": "30", "पचास": "50", "सौ": "100",
};

// \p{M} keeps Devanagari vowel signs (matras): without it Hindi words are mangled and number words like तीन never match.
const stripLetters = (s: string) => s.toLowerCase().replace(/[^\p{L}\p{M}\p{N}\s]/gu, " ").replace(/\s+/g, " ").trim();

/** Every numeric value in the text, normalised (digits, Devanagari digits, thousands separators, and common number words). */
export function extractNumbers(text: string): Set<string> {
  const out = new Set<string>();
  const t = normalizeDigits(text);
  for (const m of t.matchAll(/\d[\d,]*(?:\.\d+)?/g)) out.add(m[0].replace(/,/g, "").replace(/\.0+$/, ""));
  for (const w of stripLetters(t).split(" ")) if (NUMBER_WORDS[w]) out.add(NUMBER_WORDS[w]);
  return out;
}

export function extractQuotes(text: string): string[] {
  const out: string[] = [];
  const patterns = [/“([^”]{8,})”/g, /"([^"]{8,})"/g, /‘([^’]{8,})’/g, /«([^»]{8,})»/g, /「([^」]{8,})」/g];
  for (const re of patterns) for (const m of text.matchAll(re)) out.push(m[1]!.trim());
  return out.filter((q) => q.split(/\s+/).length >= 3);
}

const MONTHS =
  "january|february|march|april|may|june|july|august|september|october|november|december|जनवरी|फरवरी|मार्च|अप्रैल|मई|जून|जुलाई|अगस्त|सितंबर|सितम्बर|अक्टूबर|अक्तूबर|नवंबर|नवम्बर|दिसंबर|दिसम्बर";

/** Calendar dates ("12 October", "October 12", "12/10/2026") as normalised strings. */
export function extractDates(text: string): Set<string> {
  const out = new Set<string>();
  const t = normalizeDigits(text).toLowerCase();
  for (const m of t.matchAll(new RegExp(`(\\d{1,2})\\s*(${MONTHS})`, "g"))) out.add(`${Number(m[1])} ${m[2]}`);
  for (const m of t.matchAll(new RegExp(`(${MONTHS})\\s*(\\d{1,2})`, "g"))) out.add(`${Number(m[2])} ${m[1]}`);
  for (const m of t.matchAll(/(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})/g)) out.add(`${Number(m[1])}/${Number(m[2])}/${m[3]}`);
  return out;
}

/** Actors whose statements or presence an AI is most tempted to invent. [draft-side cue, source-side cues]. */
const ACTORS: Array<{ id: string; draft: RegExp; source: RegExp }> = [
  // \b is ASCII-only in JavaScript: it must never wrap a Devanagari alternative, or the Hindi form silently never matches.
  { id: "police", draft: /\bpolice\b|पुलिस/i, source: /\b(police|sp)\b|पुलिस|थाना|थाने|एसपी/i },
  // Hindi plurals use a short ि (प्रत्यक्षदर्शियों, अधिकारियों, मंत्रियों), so these use stems / [ीि] rather than the singular form.
  { id: "eyewitness", draft: /\b(eye-?witness(es)?|witnesses?)\b|प्रत्यक्षदर्श|चश्मदीद/i, source: /\b(eye-?witness(es)?|witnesses?|saw|seen)\b|प्रत्यक्षदर्श|चश्मदीद|देखा|देखने/i },
  { id: "official", draft: /\b(officials?|authorities)\b|अधिकार[ीि]|प्रशासन/i, source: /\b(officials?|authorities|administration|collector)\b|अधिकार[ीि]|प्रशासन|कलेक्टर/i },
  { id: "minister", draft: /\b(minister|chief minister)\b|मंत्र[ीि]|मुख्यमंत्र[ीि]/i, source: /\b(minister|chief minister|cm)\b|मंत्र[ीि]|मुख्यमंत्र[ीि]|सीएम/i },
  { id: "doctor", draft: /\b(doctors?|physicians?)\b|डॉक्टर|चिकित्सक/i, source: /\b(doctors?|physicians?|hospital)\b|डॉक्टर|चिकित्सक|अस्पताल/i },
  { id: "family", draft: /\b(family members?|relatives?)\b|परिजन|परिवार/i, source: /\b(family|relatives?)\b|परिजन|परिवार|रिश्तेदार/i },
  { id: "spokesperson", draft: /\b(spokes(person|man|woman))\b|प्रवक्ता/i, source: /\b(spokes(person|man|woman))\b|प्रवक्ता/i },
];

const ATTRIBUTION_CUE = /(said|told|stated|confirmed|according to|alleged|claimed|ने (कहा|बताया|पुष्टि)|के अनुसार|का कहना|ने आरोप)/i;

const STOP_LATIN = new Set(["the", "a", "an", "in", "on", "at", "of", "and", "or", "to", "for", "by", "with", "from", "is", "are", "was", "were", "it", "this", "that", "he", "she", "they", "we", "i", "his", "her", "their", "our", "my", "after", "before", "during", "near", "today", "yesterday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"]);

function latinProperNouns(text: string): string[] {
  const out: string[] = [];
  const sentences = text.split(/(?<=[.!?।])\s+/);
  for (const sentence of sentences) {
    const words = sentence.split(/\s+/);
    words.forEach((w, i) => {
      const clean = w.replace(/[^A-Za-z]/g, "");
      if (clean.length < 3 || i === 0) return; // sentence-initial capitals are not evidence of a name
      if (/^[A-Z][a-z]+$/.test(clean) && !STOP_LATIN.has(clean.toLowerCase())) out.push(clean.toLowerCase());
    });
  }
  return out;
}

function contentTokens(text: string): string[] {
  return stripLetters(normalizeDigits(text))
    .split(" ")
    .filter((t) => t.length >= 3 && !STOP_LATIN.has(t));
}

/**
 * What an AI draft contains that the source does not support.
 * `sourceText` is everything the user said/typed (text + transcript). Returns flags for the draft text passed in.
 */
export function findUnsupportedFacts(sourceText: string, draftText: string): FactFlag[] {
  const flags: FactFlag[] = [];
  const sourceNorm = stripLetters(normalizeDigits(sourceText));
  const sourceNumbers = extractNumbers(sourceText);
  const sourceDates = extractDates(sourceText);

  for (const n of extractNumbers(draftText)) {
    if (sourceNumbers.has(n)) continue;
    // a day-of-month or year that is part of a date is checked as a date instead
    flags.push({ code: "unsupported_number", value: n, severity: "block" });
  }

  for (const d of extractDates(draftText)) {
    if (!sourceDates.has(d)) flags.push({ code: "unsupported_date", value: d, severity: "block" });
  }

  for (const q of extractQuotes(draftText)) {
    if (!sourceNorm.includes(stripLetters(normalizeDigits(q)))) flags.push({ code: "unsupported_quote", value: q, severity: "block" });
  }

  for (const actor of ACTORS) {
    if (actor.draft.test(draftText) && !actor.source.test(sourceText) && ATTRIBUTION_CUE.test(draftText)) {
      flags.push({ code: "unsupported_actor", value: actor.id, severity: "block" });
    }
  }

  const sourceLatin = new Set(latinProperNouns(`x ${sourceText}`).concat(stripLetters(sourceText).split(" ")));
  for (const name of new Set(latinProperNouns(draftText))) {
    if (!sourceLatin.has(name) && !sourceNorm.includes(name)) flags.push({ code: "unsupported_name", value: name, severity: "warn" });
  }

  const draftTokens = contentTokens(draftText);
  if (draftTokens.length >= 25) {
    const sourceTokens = new Set(contentTokens(sourceText));
    const novel = draftTokens.filter((t) => !sourceTokens.has(t)).length;
    const ratio = novel / draftTokens.length;
    // Rewording legitimately introduces new words; a draft that is mostly NEW vocabulary suggests invented content.
    if (ratio > 0.7) flags.push({ code: "low_source_overlap", value: `${Math.round(ratio * 100)}% of the draft's words are not in what you said`, severity: "warn" });
  }

  // De-duplicate by code+value
  const seen = new Set<string>();
  return flags.filter((f) => (seen.has(`${f.code}|${f.value}`) ? false : (seen.add(`${f.code}|${f.value}`), true)));
}

/**
 * The AI-added facts still present in the FINAL text.
 * A flagged value counts only if it is unsupported by the source AND was introduced by the AI (present in the AI draft). Anything the
 * author added afterwards is theirs and is not an AI fabrication.
 */
export function findAiFabrications(input: { sourceText: string; aiDraftText: string; finalText: string }): FactFlag[] {
  const aiFlags = findUnsupportedFacts(input.sourceText, input.aiDraftText);
  if (aiFlags.length === 0) return [];
  const stillInFinal = new Set(findUnsupportedFacts(input.sourceText, input.finalText).map((f) => `${f.code}|${f.value}`));
  return aiFlags.filter((f) => stillInFinal.has(`${f.code}|${f.value}`));
}

export function hasBlockingFlags(flags: readonly FactFlag[]): boolean {
  return flags.some((f) => f.severity === "block");
}
