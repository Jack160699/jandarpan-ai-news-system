/**
 * News-anchor script transformer.
 *
 * Raw article text is never sent to TTS. This builds a broadcast-ready script from the headline,
 * summary, body and facts: web/SEO junk removed, abbreviations/numbers/dates normalised, awkward
 * sentence lengths split, the headline read once (never repeated by the summary), natural pauses
 * as paragraph breaks, and a length budget per script kind:
 *
 *   short_bulletin  ~15–20 s   headline + one key fact
 *   tv              ~30–40 s   headline + up to 3 supporting sentences
 *   radio           ~50–70 s   dateline + headline + summary + up to 5 sentences
 */

import { normalizeForSpeech, type ScriptLang } from "@/lib/voice/script/normalize";
import type { DeliveryStyle, ScriptKind } from "@/lib/voice/types";

export type NewsScriptInput = {
  language: ScriptLang;
  headline: string;
  summary?: string | null;
  body?: string | null;
  /** Verified key facts (already-attributed sentences); preferred over body sentences. */
  facts?: readonly string[];
  /** Proper nouns to leave untouched by abbreviation expansion. */
  names?: readonly string[];
  locations?: readonly string[];
  /** Evidence-based district display name (e.g. "रायपुर") — only used for a dateline. */
  district?: string | null;
  kind: ScriptKind;
  isBreaking?: boolean;
};

export type NewsScript = {
  kind: ScriptKind;
  language: ScriptLang;
  /** Paragraphs → sentences. Paragraph breaks are the natural pauses. */
  paragraphs: string[][];
  /** Plain text: sentences joined by spaces, paragraphs by a blank line. */
  text: string;
  wordCount: number;
  estimatedSeconds: number;
  truncated: boolean;
};

const BUDGET: Record<ScriptKind, { maxWords: number; maxBodySentences: number }> = {
  short_bulletin: { maxWords: 52, maxBodySentences: 1 },
  tv: { maxWords: 100, maxBodySentences: 3 },
  radio: { maxWords: 170, maxBodySentences: 5 },
};

const WORDS_PER_SEC: Record<ScriptLang, number> = { hi: 2.3, en: 2.5 };
const PAUSE_PER_SENTENCE_SEC = 0.35;
const MAX_SENTENCE_WORDS = 26;

const words = (s: string) => s.split(/\s+/).filter(Boolean);
export const countWords = (s: string) => words(s).length;

export function estimateSeconds(text: string, lang: ScriptLang, sentences: number): number {
  return Math.round((countWords(text) / WORDS_PER_SEC[lang] + sentences * PAUSE_PER_SENTENCE_SEC) * 10) / 10;
}

const STOP = new Set([
  "में", "का", "के", "की", "को", "से", "ने", "पर", "है", "हैं", "था", "थी", "थे", "और", "या", "भी", "तो", "कि", "यह", "वह", "इस", "उस",
  "in", "on", "at", "to", "of", "by", "for", "with", "is", "are", "was", "were", "and", "or", "the", "a", "an", "this", "that",
]);

function tokenSet(s: string): Set<string> {
  return new Set(
    s
      .toLowerCase()
      .replace(/[^\p{L}\p{M}\p{N}\s]/gu, " ")
      .split(/\s+/)
      .filter((w) => w.length > 1 && !STOP.has(w))
  );
}

/** Share of `a`'s content tokens that also appear in `b`. */
export function overlapRatio(a: string, b: string): number {
  const ta = tokenSet(a);
  if (!ta.size) return 0;
  const tb = tokenSet(b);
  let hit = 0;
  for (const t of ta) if (tb.has(t)) hit++;
  return hit / ta.size;
}

function cleanHeadline(h: string, lang: ScriptLang, protectedTerms: readonly string[]): string {
  let t = normalizeForSpeech(h, lang, protectedTerms);
  // trailing outlet suffixes: " - Dainik Bhaskar", " | IBC24"
  t = t.replace(/\s+[-|–—]\s+[^-|–—]{2,40}$/u, "");
  const letters = t.replace(/[^A-Za-z]/g, "");
  if (letters.length >= 12 && letters === letters.toUpperCase()) {
    t = t.toLowerCase().replace(/(^|[.!?]\s+)([a-z])/g, (_m, p, c) => `${p}${c.toUpperCase()}`);
  }
  return t.replace(/[.।!?…]+$/u, "").trim();
}

const SENTENCE_END = /(?<=[।.!?])\s+(?=[\p{L}\p{N}"'(₹])/u;

export function splitSentences(text: string): string[] {
  return text
    .split(/\n+/)
    .flatMap((line) => line.split(SENTENCE_END))
    .map((s) => s.trim())
    .filter(Boolean);
}

const SPLIT_HINTS: Record<ScriptLang, RegExp> = {
  hi: /,\s+(?=(?:और|लेकिन|जबकि|तथा|वहीं|जिसके बाद|इसके बाद|हालांकि|जिससे|क्योंकि)\b)/,
  en: /,\s+(?=(?:and|but|while|which|whereas|although|after|because)\b)/i,
};

/** Split over-long sentences at a conjunction so no single sentence exceeds ~26 words. */
export function shapeSentence(sentence: string, lang: ScriptLang): string[] {
  const terminator = lang === "hi" ? "।" : ".";
  const bare = sentence.replace(/[.।!?…]+$/u, "").trim();
  if (countWords(bare) <= MAX_SENTENCE_WORDS) return [`${bare}${/[!?]$/.test(sentence.trim()) ? sentence.trim().slice(-1) : terminator}`];

  const parts = bare.split(SPLIT_HINTS[lang]);
  if (parts.length > 1) {
    // rebalance greedily so each chunk stays under the limit
    const chunks: string[] = [];
    let cur = "";
    for (const p of parts) {
      if (cur && countWords(`${cur}, ${p}`) > MAX_SENTENCE_WORDS) {
        chunks.push(cur);
        cur = p;
      } else cur = cur ? `${cur}, ${p}` : p;
    }
    if (cur) chunks.push(cur);
    return chunks.map((c) => `${c.trim()}${terminator}`);
  }
  // fall back to a comma near the middle
  const w = words(bare);
  const mid = Math.floor(w.length / 2);
  let cut = -1;
  for (let d = 0; d < mid; d++) {
    for (const i of [mid + d, mid - d]) if (w[i - 1]?.endsWith(",")) { cut = i; break; }
    if (cut > 0) break;
  }
  if (cut > 0) {
    return [
      `${w.slice(0, cut).join(" ").replace(/,$/, "")}${terminator}`,
      `${w.slice(cut).join(" ")}${terminator}`,
    ];
  }
  return [`${bare}${terminator}`];
}

const BOILERPLATE = /(?:सत्यापित स्थानीय कवरेज|verified local coverage|अधिक जानकारी के लिए|for more (?:details|information)|click here|अपडेट जारी|इस खबर को .*शेयर)/i;

export function buildNewsScript(input: NewsScriptInput): NewsScript {
  const lang = input.language;
  const protectedTerms = [...(input.names ?? []), ...(input.locations ?? [])];
  const budget = BUDGET[input.kind];
  const terminator = lang === "hi" ? "।" : ".";

  const headline = cleanHeadline(input.headline, lang, protectedTerms);
  const headlineSentence = `${headline}${terminator}`;

  const summary = input.summary ? normalizeForSpeech(input.summary, lang, protectedTerms) : "";
  const bodyText = input.body ? normalizeForSpeech(input.body, lang, protectedTerms) : "";
  const factText = (input.facts ?? []).map((f) => normalizeForSpeech(f, lang, protectedTerms)).filter(Boolean);

  // Candidate supporting sentences, best first: verified facts, summary, then body.
  const rawCandidates = [...factText, ...splitSentences(summary), ...splitSentences(bodyText)];
  const seen: string[] = [headline];
  const support: string[] = [];
  for (const cand of rawCandidates) {
    if (BOILERPLATE.test(cand)) continue;
    if (countWords(cand) < 4) continue;
    // never repeat the headline, and drop near-duplicates of what we already have
    if (seen.some((s) => overlapRatio(cand, s) >= 0.7 || overlapRatio(s, cand) >= 0.85)) continue;
    seen.push(cand);
    support.push(cand);
  }

  const limit = input.kind === "radio" ? budget.maxBodySentences : budget.maxBodySentences;
  const shapedSupport = support.slice(0, limit).flatMap((s) => shapeSentence(s, lang));

  const cue = input.isBreaking ? (lang === "hi" ? "ब्रेकिंग न्यूज़।" : "Breaking news.") : null;
  const dateline =
    input.kind === "radio" && input.district
      ? lang === "hi"
        ? `${input.district} से खबर।`
        : `News from ${input.district}.`
      : null;

  const lead: string[] = [];
  if (cue) lead.push(cue);
  if (dateline) lead.push(dateline);
  lead.push(...shapeSentence(headlineSentence, lang));

  const paragraphs: string[][] = [lead, ...(shapedSupport.length ? [shapedSupport] : [])];

  // Enforce the word budget by trimming trailing sentences (never the headline).
  let truncated = false;
  const flat = () => paragraphs.flat();
  while (countWords(flat().join(" ")) > budget.maxWords && paragraphs.length > 1) {
    const last = paragraphs[paragraphs.length - 1]!;
    if (last.length > 1) last.pop();
    else paragraphs.pop();
    truncated = true;
  }

  const text = paragraphs.map((p) => p.join(" ")).join("\n\n");
  const sentences = flat().length;
  return {
    kind: input.kind,
    language: lang,
    paragraphs,
    text,
    wordCount: countWords(text),
    estimatedSeconds: estimateSeconds(text, lang, sentences),
    truncated,
  };
}

// ------------------------------------------------------------------ delivery style

export type StyleSignals = {
  category?: string | null;
  headline: string;
  summary?: string | null;
  urgencyScore?: number | null;
  isBreaking?: boolean;
};

const RE = {
  sports: /\b(?:cricket|ipl|match|tournament|olympic|football|hockey|kabaddi|medal|wicket|innings|score)\b|क्रिकेट|आईपीएल|मैच|टूर्नामेंट|ओलंपिक|फुटबॉल|हॉकी|कबड्डी|पदक|विकेट|खिलाड़ी/i,
  weather: /\b(?:weather|rain|rainfall|monsoon|cyclone|heatwave|cold wave|forecast|orange alert|yellow alert|red alert|thunderstorm)\b|मौसम|बारिश|वर्षा|मानसून|चक्रवात|लू|शीतलहर|ओलावृष्टि|येलो अलर्ट|ऑरेंज अलर्ट|रेड अलर्ट|तूफान/i,
  serious: /\b(?:murder|killed|dead|death|died|accident|crash|rape|suicide|blast|naxal|encounter|arrested|court|verdict|sentenced|fire|drowned|flood)\b|हत्या|मौत|मृत|दुर्घटना|हादसा|आत्महत्या|विस्फोट|नक्सल|मुठभेड़|गिरफ्तार|अदालत|फैसला|सज़ा|आग|डूब|बाढ़/i,
  human: /\b(?:inspiring|heartwarming|success story|honoured|rescued|donat|village girl|farmer's son)\b|प्रेरणा|सम्मानित|मिसाल|जज्बा|सफलता की कहानी|मदद|दान/i,
  explainer: /\b(?:explained|explainer|what is|why|how to|analysis|understand)\b|समझिए|जानिए|क्या है|क्यों|कैसे|विश्लेषण/i,
  alert: /\b(?:advisory|evacuat|warning|alert issued|curfew|shutdown|traffic diversion)\b|एडवाइजरी|चेतावनी|अलर्ट जारी|कर्फ्यू|डायवर्ट|खाली कराया/i,
};

export const BREAKING_URGENCY_THRESHOLD = 90;

/** Pick the delivery style from category, wording and urgency. Deterministic. */
export function pickDeliveryStyle(s: StyleSignals): DeliveryStyle {
  const text = `${s.headline} ${s.summary ?? ""}`;
  const cat = (s.category ?? "").toLowerCase();
  if (s.isBreaking || (s.urgencyScore ?? 0) >= BREAKING_URGENCY_THRESHOLD) return "breaking_news";
  if (cat === "sports" || RE.sports.test(text)) return "sports";
  if (RE.alert.test(text)) return "urgency";
  if (cat === "weather" || RE.weather.test(text)) return "weather";
  if (RE.serious.test(text)) return "serious_report";
  if (RE.human.test(text)) return "human_interest";
  if (RE.explainer.test(text)) return "explainer";
  return "standard_bulletin";
}

// ------------------------------------------------------------------ provider rendering

/** Gemini-TTS: plain text; paragraph breaks give natural pauses. */
export function renderForGemini(script: NewsScript): string {
  return script.text;
}

/**
 * Chirp 3 HD: markup input with explicit pause tags after the lead and between paragraphs
 * (pause tags are a Chirp 3 HD feature; sentence punctuation supplies the short pauses).
 */
export function renderForChirp(script: NewsScript): string {
  return script.paragraphs.map((p) => p.join(" ")).join(" [pause] ");
}
