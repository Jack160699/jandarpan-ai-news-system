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
 *    [Headline spoken ONCE] -> [2 to 4 distinct supporting factual sentences]
 * 4. Deduplication against the headline (token similarity check).
 * 5. Minimum 2 supporting factual sentences required for Live TV broadcast eligibility.
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

function cleanText(t: string | null | undefined): string {
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

function tokenize(str: string): Set<string> {
  return new Set(
    str
      .toLowerCase()
      .replace(/[^\p{L}\p{N}\s]/gu, " ")
      .split(/\s+/)
      .filter((w) => w.length > 2)
  );
}

function similarity(tokensA: Set<string>, tokensB: Set<string>): number {
  if (!tokensA.size || !tokensB.size) return 0;
  let matches = 0;
  for (const t of tokensA) {
    if (tokensB.has(t)) matches++;
  }
  return matches / Math.min(tokensA.size, tokensB.size);
}

export function extractDistinctSupportingSentences(
  headline: string,
  summary: string | null | undefined,
  body: string | null | undefined,
  maxSentences = 4
): string[] {
  const cleanHl = cleanText(headline);
  const hlTokens = tokenize(cleanHl);

  const rawText = `${cleanText(summary)} ${cleanText(body)}`;
  const rawSentences = rawText
    .split(/[।\.!\?\n\r]+/)
    .map((s) => cleanText(s))
    .filter((s) => s.length >= 18);

  const distinct: string[] = [];
  const seenTokens: Set<string>[] = [hlTokens];

  for (const sent of rawSentences) {
    // Skip if contains metadata/source boilerplate or promotional links
    if (
      /स्रोत\s*:|source\s*:|फोटो\s*:|photo\s*:|ब्यूरो द्वारा|कॉपीराइट|copyright|read more|फॉलो करें|follow us|bhilai times|ibc24/i.test(
        sent
      )
    ) {
      continue;
    }

    const sentTokens = tokenize(sent);
    let isDupe = false;
    for (const prev of seenTokens) {
      if (similarity(prev, sentTokens) > 0.50) {
        isDupe = true;
        break;
      }
    }

    if (!isDupe) {
      distinct.push(sent);
      seenTokens.push(sentTokens);
      if (distinct.length >= maxSentences) break;
    }
  }

  return distinct;
}

export function generateAnchorSpokenScript(input: AnchorScriptInput): AnchorScriptResult {
  const { headline, summary, articleBody, language } = input;
  const cleanHeadline = cleanText(headline);

  const supportingSentences = extractDistinctSupportingSentences(
    cleanHeadline,
    summary,
    articleBody,
    4
  );

  const isEligibleForLiveBroadcast = supportingSentences.length >= 2;

  if (language === "hi") {
    // Clean Hindi broadcast script: Headline spoken ONCE + 2 to 4 distinct factual sentences
    const script = supportingSentences.length > 0
      ? `${cleanHeadline}। ${supportingSentences.join("। ")}।`
      : `${cleanHeadline}।`;

    const normalizedScript = script
      .replace(/[\r\n]+/g, " ")
      .replace(/\s+/g, " ")
      .replace(/।+/g, "।")
      .trim();

    const durationSec = Math.max(14, Math.ceil(normalizedScript.length / 13));
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

    const durationSec = Math.max(14, Math.ceil(normalizedScript.length / 14));
    return {
      script: normalizedScript,
      durationSec,
      supportingSentences,
      supportingCount: supportingSentences.length,
      isEligibleForLiveBroadcast,
    };
  }
}
