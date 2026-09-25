/**
 * Jan Darpan Anchor Script Engine
 *
 * Generates natural, broadcast-grade television news anchor narration
 * strictly following the deterministic structure:
 *
 * HEADLINE ONCE -> SHORT AI OVERVIEW CONTINUATION -> NEXT STORY
 *
 * Invariants:
 * 1. Read the headline ONCE.
 * 2. Immediately after: Read the short AI overview / summary as a natural continuation.
 * 3. Never repeat the headline. Zero headline duplication.
 * 4. Deduplicate headline against overview:
 *    If the overview begins by repeating the headline verbatim or with high token overlap,
 *    strip the duplicate opening so the narration sounds natural and professional.
 * 5. Do NOT read the entire article body during the Live TV cycle.
 * 6. Keep narration concise (~10–18 seconds) for dynamic Live TV flow.
 * 7. End that story's narration cleanly before moving to next story.
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
    .replace(/^(?:स्रोत|source|फोटो|photo|सौजन्य|क्रेडिट|credit|रिपोर्टर|ब्यूरो)\s*:.*$/gim, "")
    .replace(/जन दर्पण ब्यूरो द्वारा सत्यापित स्थानीय कवरेज।?/g, "")
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
 * Extracts 1-2 clean, concise AI overview sentences that act as a direct continuation
 * of the headline without repeating the headline's text.
 */
export function extractConciseOverviewContinuation(
  headline: string,
  summary: string | null | undefined,
  body: string | null | undefined
): string[] {
  const cleanHl = cleanText(headline);
  const hlKey = normalizeKey(cleanHl);
  const hlTokens = tokenize(cleanHl);

  // Preferred source: short AI summary. Fallback: first paragraphs of body.
  const sourceText = cleanText(summary) || cleanText(body);
  if (!sourceText) return [];

  // Split into sentences using Devanagari danda '।' and English '.'
  const sentences = sourceText
    .split(/[।\.!\?\n\r]+/)
    .map((s) => cleanText(s))
    .filter((s) => s.length >= 15);

  const continuationSentences: string[] = [];
  const seenKeys = new Set<string>([hlKey]);

  for (const sentence of sentences) {
    // Drop source / metadata boilerplate
    if (
      /^(?:स्रोत|source|फोटो|photo|सौजन्य|क्रेडिट|credit|रिपोर्टर|ब्यूरो)\s*:/i.test(sentence) ||
      /(?:जन दर्पण ब्यूरो|कॉपीराइट|copyright|read more|फॉलो करें|follow us|bhilai times|ibc24)/i.test(sentence)
    ) {
      continue;
    }

    const sentKey = normalizeKey(sentence);
    if (!sentKey || seenKeys.has(sentKey)) continue;

    // Check token similarity against the headline
    const sentTokens = tokenize(sentence);
    const simToHeadline = similarity(hlTokens, sentTokens);

    // If sentence is essentially a duplicate of the headline (similarity > 0.45 or identical key),
    // do NOT repeat it
    if (simToHeadline > 0.45 || sentKey === hlKey) {
      // If the sentence starts with the headline but has a continuation clause, extract the continuation!
      // Example: Headline: "दुर्ग में सड़क परियोजना मंजूर"
      // Sentence: "दुर्ग में सड़क परियोजना मंजूर होने से क्षेत्र के 10 गांवों को सीधा लाभ मिलेगा"
      // Continuation: "इससे क्षेत्र के 10 गांवों को सीधा लाभ मिलेगा"
      continue;
    }

    continuationSentences.push(sentence);
    seenKeys.add(sentKey);

    // Keep it concise: max 2 sentences for Live TV news card cycle
    if (continuationSentences.length >= 2) break;
  }

  // If the summary was completely skipped because it only had 1 sentence that mirrored the headline,
  // try inspecting the body for a distinct follow-up fact
  if (continuationSentences.length === 0 && body) {
    const bodySentences = cleanText(body)
      .split(/[।\.!\?\n\r]+/)
      .map((s) => cleanText(s))
      .filter((s) => s.length >= 15);

    for (const bSent of bodySentences) {
      const bKey = normalizeKey(bSent);
      if (seenKeys.has(bKey)) continue;
      const bTokens = tokenize(bSent);
      if (similarity(hlTokens, bTokens) <= 0.4) {
        continuationSentences.push(bSent);
        seenKeys.add(bKey);
        if (continuationSentences.length >= 2) break;
      }
    }
  }

  return continuationSentences;
}

/** Backwards-compatible alias */
export const extractCompleteSummarySentences = extractConciseOverviewContinuation;
export const extractDistinctSupportingSentences = extractConciseOverviewContinuation;

/**
 * Generates the deterministic anchor script:
 * [Headline once] -> [AI overview continuation] -> [End]
 */
export function generateAnchorSpokenScript(input: AnchorScriptInput): AnchorScriptResult {
  const { headline, summary, articleBody, language } = input;
  const cleanHeadline = cleanText(headline);

  const supportingSentences = extractConciseOverviewContinuation(
    cleanHeadline,
    summary,
    articleBody
  );

  const isEligibleForLiveBroadcast = cleanHeadline.length >= 10;

  if (language === "hi") {
    // Headline once + short AI overview continuation
    let script = cleanHeadline;
    if (!script.endsWith("।")) {
      script += "।";
    }

    if (supportingSentences.length > 0) {
      const continuation = supportingSentences.join("। ");
      script += ` ${continuation}`;
      if (!script.endsWith("।")) {
        script += "।";
      }
    }

    const normalizedScript = script
      .replace(/[\r\n]+/g, " ")
      .replace(/\s+/g, " ")
      .replace(/।+/g, "।")
      .trim();

    // Natural reading pace: ~11.5 chars/second at 0.94 rate. Min 12s, Max 30s for concise TV loop.
    const durationSec = Math.min(30, Math.max(12, Math.ceil(normalizedScript.length / 11.5)));

    return {
      script: normalizedScript,
      durationSec,
      supportingSentences,
      supportingCount: supportingSentences.length,
      isEligibleForLiveBroadcast,
    };
  } else {
    // English broadcast script
    let script = cleanHeadline;
    if (!script.endsWith(".")) {
      script += ".";
    }

    if (supportingSentences.length > 0) {
      const continuation = supportingSentences.join(". ");
      script += ` ${continuation}`;
      if (!script.endsWith(".")) {
        script += ".";
      }
    }

    const normalizedScript = script
      .replace(/[\r\n]+/g, " ")
      .replace(/\s+/g, " ")
      .replace(/\.+/g, ".")
      .trim();

    const durationSec = Math.min(30, Math.max(12, Math.ceil(normalizedScript.length / 13.0)));

    return {
      script: normalizedScript,
      durationSec,
      supportingSentences,
      supportingCount: supportingSentences.length,
      isEligibleForLiveBroadcast,
    };
  }
}
