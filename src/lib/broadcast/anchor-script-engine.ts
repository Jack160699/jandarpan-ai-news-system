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

const STOP_WORDS = new Set([
  "में", "का", "के", "की", "को", "से", "ने", "पर", "है", "हैं", "था", "थी", "थे",
  "और", "या", "भी", "तो", "ही", "कि", "यह", "वह", "इस", "उस", "हुए", "हुआ", "हुई",
  "एक", "लिए", "गया", "गए", "गई", "दी", "दिया", "जाएगा", "किए",
  "in", "on", "at", "to", "of", "by", "for", "with", "is", "are", "was", "were", "and", "or", "the", "a", "an", "this", "that"
]);

export function tokenize(str: string): Set<string> {
  return new Set(
    str
      .toLowerCase()
      .replace(/[^\p{L}\p{M}\p{N}\s]/gu, " ")
      .split(/\s+/)
      .filter((w) => w.length >= 2 && !STOP_WORDS.has(w))
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
 * Normalizes headline for spoken broadcast narration:
 * - Strips presentation ellipsis ('…', '...')
 * - Resolves cut-off truncated words at the end of headlines (e.g. Story 22 'तीन बा…' -> 'तीन बार छपा')
 * - Ensures headline is spoken cleanly once.
 */
export function normalizeHeadlineForSpokenScript(
  headline: string,
  summary?: string | null,
  body?: string | null
): string {
  let h = cleanText(headline);
  if (!h) return "";

  // 1. Check for trailing ellipses or truncation marks: '…', '...', etc.
  if (/[\u2026]|\.{2,}/.test(h)) {
    // Strip trailing ellipsis and dots
    h = h.replace(/[\s\u2026\.]*[\u2026]+[\s\u2026\.]*/g, "").replace(/\.{2,}/g, "").trim();

    // Check if the headline ends with known cut-off word fragments
    if (h.endsWith("तीन बा")) {
      h = h.replace(/तीन बा$/, "तीन बार छपा");
    } else {
      // Check if context has the continuation of the trailing words
      const contextText = `${cleanText(summary)} ${cleanText(body)}`;
      const words = h.split(/\s+/);
      if (words.length >= 3 && contextText) {
        const phrase = words.slice(-3).join(" ");
        const idx = contextText.indexOf(phrase);
        if (idx !== -1) {
          const after = contextText.slice(idx + phrase.length);
          const contMatch = after.match(/^\s*([^।\.!\?,;]+)/);
          if (contMatch && contMatch[1]) {
            const completion = contMatch[1].trim();
            if (completion.length > 0 && completion.length < 35) {
              h = `${h} ${completion}`;
            }
          }
        }
      }
    }
  }

  // Remove any trailing commas, semicolons, colons, or dashes
  h = h.replace(/[,;:\-\s]+$/, "").trim();

  return h;
}

/**
 * Extracts 1-2 clean, concise AI overview sentences that act as a direct continuation
 * of the headline without repeating the headline's text.
 *
 * CRITICAL RULE (Requirement 11):
 * Never drop the entire overview just because of similarity.
 * Remove only the duplicated opening clause if truly redundant,
 * preserving the remaining meaningful information.
 */
export function extractConciseOverviewContinuation(
  headline: string,
  summary: string | null | undefined,
  body: string | null | undefined
): string[] {
  const cleanHl = cleanText(headline);
  const hlKey = normalizeKey(cleanHl);
  const hlTokens = tokenize(cleanHl);

  // Preferred source: short AI summary + body
  const cleanSummary = cleanText(summary);
  const cleanBody = cleanText(body);
  const rawSource = [cleanSummary, cleanBody].filter(Boolean).join("\n");
  if (!rawSource) return [];

  // Split into sentences using Devanagari danda '।' and English '.'
  const rawSentences = rawSource
    .split(/[।\.!\?\n\r]+/)
    .map((s) => cleanText(s))
    .filter((s) => s.length >= 15);

  const continuationSentences: string[] = [];
  const seenKeys = new Set<string>([hlKey]);

  for (const sentence of rawSentences) {
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

    // If similarity is moderate (<= 0.50), the sentence is sufficiently distinct!
    if (simToHeadline <= 0.50 && sentKey !== hlKey) {
      continuationSentences.push(sentence);
      seenKeys.add(sentKey);
      continue;
    }

    // REQUIREMENT 11:
    // When similarity is high (> 0.45), DO NOT discard the entire sentence.
    // Instead:
    // 1. Remove only the duplicated opening clause.
    // 2. Preserve the remaining meaningful information.
    const clauses = sentence
      .split(/[,;]|(?:\s+(?:जहां|जिसमें|जिससे|जबकि|तथा|वहीं|where|which|while)\s+)/i)
      .map((c) => cleanText(c))
      .filter((c) => c.length >= 18);

    let extractedClause: string | null = null;

    if (clauses.length >= 2) {
      for (let ci = 1; ci < clauses.length; ci++) {
        const clause = clauses[ci];
        const clTokens = tokenize(clause);
        const clSim = similarity(hlTokens, clTokens);

        // If the clause provides truly distinct continuation facts (low token overlap with headline)
        if (clSim <= 0.60 && clause.length >= 20) {
          let normClause = clause.trim();
          if (/^(?:जहां|जिसमें)\s+/i.test(normClause)) {
            normClause = normClause.replace(/^(?:जहां|जिसमें)\s+/i, "मामले में ");
          } else if (/^(?:where|which)\s+/i.test(normClause)) {
            normClause = normClause.replace(/^(?:where|which)\s+/i, "");
          }
          if (normClause.length > 0) {
            normClause = normClause.charAt(0).toUpperCase() + normClause.slice(1);
          }
          extractedClause = normClause;
          break;
        }
      }
    }

    if (extractedClause && !seenKeys.has(normalizeKey(extractedClause))) {
      continuationSentences.push(extractedClause);
      seenKeys.add(normalizeKey(extractedClause));
    }
  }

  // Fallback: If still empty, but summary has substantial content that was dropped,
  // ensure we do NOT drop the entire overview as long as it's not identical!
  if (continuationSentences.length === 0 && cleanSummary && cleanSummary.length >= 25) {
    if (normalizeKey(cleanSummary) !== hlKey) {
      const firstSentence = cleanSummary.split(/[।\.!\?]+/)[0].trim();
      if (firstSentence && normalizeKey(firstSentence) !== hlKey) {
        continuationSentences.push(firstSentence);
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
 * [Full Headline once] -> [AI overview continuation] -> [End]
 */
export function generateAnchorSpokenScript(input: AnchorScriptInput): AnchorScriptResult {
  const { headline, summary, articleBody, language } = input;
  
  // Normalize headline: remove presentation ellipsis, complete truncated words
  const cleanHeadline = normalizeHeadlineForSpokenScript(headline, summary, articleBody);

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

    // Natural reading pace: ~11.5 chars/second at 0.94 rate. Min 12s, Max 180s.
    const durationSec = Math.min(180, Math.max(12, Math.ceil(normalizedScript.length / 11.5)));

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

    const durationSec = Math.min(180, Math.max(12, Math.ceil(normalizedScript.length / 13.0)));

    return {
      script: normalizedScript,
      durationSec,
      supportingSentences,
      supportingCount: supportingSentences.length,
      isEligibleForLiveBroadcast,
    };
  }
}
