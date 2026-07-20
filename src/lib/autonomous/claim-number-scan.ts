/**
 * Lightweight claim scan — numbers in draft that are absent from sources.
 */

const NUMBER_RE =
  /(?:₹|Rs\.?\s*|INR\s*)?\d{1,3}(?:,\d{2,3})+(?:\.\d+)?|\b\d+(?:\.\d+)?%|\b\d{2,}(?:\.\d+)?\b/g;

function normalizeNumberToken(raw: string): string {
  return raw.replace(/[₹,\s]|Rs\.?|INR/gi, "").toLowerCase();
}

export function extractSignificantNumbers(text: string): string[] {
  const matches = text.match(NUMBER_RE) ?? [];
  const out: string[] = [];
  const seen = new Set<string>();
  for (const m of matches) {
    const n = normalizeNumberToken(m);
    // Skip tiny / year-like noise lightly: keep years and percentages
    if (!n || n.length < 2) continue;
    if (seen.has(n)) continue;
    seen.add(n);
    out.push(n);
  }
  return out;
}

export type UnsupportedNumberClaim = {
  claimId: string;
  claimText: string;
  supported: boolean;
};

/**
 * Returns numbers present in draft but not found in any source blob.
 */
export function scanUnsupportedNumbers(input: {
  draftText: string;
  sourceTexts: string[];
}): UnsupportedNumberClaim[] {
  const draftNums = extractSignificantNumbers(input.draftText);
  const sourceBlob = input.sourceTexts.join("\n").toLowerCase();
  const sourceNorm = normalizeNumberToken(sourceBlob);

  const unsupported: UnsupportedNumberClaim[] = [];
  for (let i = 0; i < draftNums.length; i++) {
    const n = draftNums[i];
    const present =
      sourceBlob.includes(n) ||
      sourceNorm.includes(n) ||
      sourceBlob.includes(n.replace(/\./g, ""));
    if (!present) {
      unsupported.push({
        claimId: `num_${i}_${n}`,
        claimText: n,
        supported: false,
      });
    }
  }
  return unsupported;
}

export function factualPenaltyForUnsupportedNumbers(count: number): number {
  if (count <= 0) return 0;
  // Each unsupported number knocks factual grounding; capped
  return Math.min(0.55, count * 0.12);
}
