/**
 * Jan Darpan Anchor Script Engine
 *
 * Generates natural, broadcast-grade television news anchor narration
 * grounded strictly in actual article facts and metadata.
 *
 * Rules:
 * 1. Zero story numbering ("news number 9", "नंबर 8", etc. are strictly forbidden).
 * 2. Zero robotic repetition (no repeated "छत्तीसगढ़ की latest खबरें" or dynamic "ब्रेकिंग न्यूज़" filler).
 * 3. Natural anchor structure:
 *    [Headline spoken ONCE] -> [COMPLETE AI SUMMARY from beginning to end]
 * 4. Deduplication against the headline:
 *    If the AI summary begins with the headline or a near-identical sentence,
 *    it is intelligently removed from the spoken body so the headline is not repeated.
 * 5. Full summary coverage: NO artificial truncation to 2–4 sentences.
 * 6. Paced with natural punctuation (Devanagari danda '।' and commas ',') for speech synthesis.
 */

export type AnchorScriptInput = {
  headline: string;
  summary?: string | null;
  articleBody?: string | null;
  district?: string | null;
  section?: string | null;
  categoryLabel?: string | null;
  isBreaking?: boolean;
  language: "hi" | "en";
};

export type AnchorScriptResult = {
  script: string;
  durationSec: number;
  supportingSentences: string[];
  supportingCount: number;
  isEligibleForLiveBroadcast: boolean;
};

export function cleanText(t: string | null | undefined): string {
  if (!t) return "";
  return t
    .replace(/<[^>]*>/g, " ")
    .replace(/!\[.*?\]\(.*?\)/g, "")
    .replace(/^\[.*?\]\s*/, "")
    .replace(/^(?:ब्रेकिंग|breaking)(?:\s*न्यूज़|\s*news|\s*:)\s*/i, "")
    .replace(/[\r\n]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function normalizeKey(str: string): string {
  return str.replace(/[^\p{L}\p{M}\p{N}]/gu, "").toLowerCase();
}

export function tokenize(str: string): Set<string> {
  return new Set(
    str
      .toLowerCase()
      .replace(/[^\p{L}\p{M}\p{N}\s]/gu, " ")
      .split(/\s+/)
      .filter((w) => w.length >= 2)
  );
}

export function similarity(tokensA: Set<string>, tokensB: Set<string>): number {
  if (!tokensA.size || !tokensB.size) return 0;
  let matches = 0;
  for (const t of tokensA) {
    if (tokensB.has(t)) matches++;
  }
  return matches / Math.min(tokensA.size, tokensB.size);
}

/**
 * Extracts all distinct factual sentences comprising the complete AI summary.
 * Removes duplicate openings that repeat the headline, drops metadata boilerplate,
 * and preserves all remaining sentences in natural chronological order.
 */
export function extractCompleteSummarySentences(
  headline: string,
  summary: string | null | undefined,
  body: string | null | undefined,
  maxSentences?: number
): string[] {
  const cleanHl = cleanText(headline);
  const hlKey = normalizeKey(cleanHl);
  const hlTokens = tokenize(cleanHl);

  // Combine summary and body into unified story content
  const rawText = `${cleanText(summary)}\n\n${cleanText(body)}`;
  const rawSentences = rawText
    .split(/[।\.!\?\n\r]+/)
    .map((s) => cleanText(s))
    .filter((s) => s.length >= 15);

  const distinct: string[] = [];
  const seenKeys = new Set<string>([hlKey]);
  const seenTokens: Set<string>[] = [hlTokens];

  for (const sent of rawSentences) {
    // Skip if contains metadata/source boilerplate or promotional links
    if (
      /^(?:स्रोत|source|फोटो|photo|सौजन्य|क्रेडिट|credit|रिपोर्टर|ब्यूरो)\s*:/i.test(sent) ||
      /(?:जन दर्पण ब्यूरो द्वारा सत्यापित|jan darpan bureau|कॉपीराइट|copyright|read more|फॉलो करें|follow us|bhilai times|ibc24)/i.test(sent)
    ) {
      continue;
    }

    const key = normalizeKey(sent);
    if (!key || seenKeys.has(key)) continue;

    // Check token similarity against headline (skip duplicate opening) and previous sentences
    const sentTokens = tokenize(sent);
    let isDupe = false;
    for (const prev of seenTokens) {
      if (similarity(prev, sentTokens) > 0.65) {
        isDupe = true;
        break;
      }
    }

    if (!isDupe) {
      distinct.push(sent);
      seenKeys.add(key);
      seenTokens.push(sentTokens);
      if (maxSentences && distinct.length >= maxSentences) break;
    }
  }

  return distinct;
}

/** Backwards-compatible alias for callers requesting distinct supporting sentences */
export const extractDistinctSupportingSentences = extractCompleteSummarySentences;

export function generateAnchorSpokenScript(input: AnchorScriptInput): AnchorScriptResult {
  const { headline, summary, articleBody, language } = input;
  const cleanHeadline = cleanText(headline);

  // Complete AI summary without artificial truncation
  const supportingSentences = extractCompleteSummarySentences(
    cleanHeadline,
    summary,
    articleBody
  );

  const isEligibleForLiveBroadcast = supportingSentences.length >= 1;

  if (language === "hi") {
    // Clean Hindi broadcast script: Headline spoken ONCE + COMPLETE AI summary
    const script = supportingSentences.length > 0
      ? `${cleanHeadline}। ${supportingSentences.join("। ")}।`
      : `${cleanHeadline}।`;

    const normalizedScript = script
      .replace(/[\r\n]+/g, " ")
      .replace(/\s+/g, " ")
      .replace(/।+/g, "।")
      .trim();

    // Natural reading pace: ~11.5 characters per second at 0.94 rate
    const durationSec = Math.max(16, Math.ceil(normalizedScript.length / 11.5));
    return {
      script: normalizedScript,
      durationSec,
      supportingSentences,
      supportingCount: supportingSentences.length,
      isEligibleForLiveBroadcast,
    };
  } else {
    // English broadcast script
    const script = supportingSentences.length > 0
      ? `${cleanHeadline}. ${supportingSentences.join(". ")}.`
      : `${cleanHeadline}.`;

    const normalizedScript = script
      .replace(/[\r\n]+/g, " ")
      .replace(/\s+/g, " ")
      .replace(/\.+/g, ".")
      .trim();

    const durationSec = Math.max(16, Math.ceil(normalizedScript.length / 12.5));
    return {
      script: normalizedScript,
      durationSec,
      supportingSentences,
      supportingCount: supportingSentences.length,
      isEligibleForLiveBroadcast,
    };
  }
}
