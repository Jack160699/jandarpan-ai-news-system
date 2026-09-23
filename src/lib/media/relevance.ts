/**
 * Deterministic Semantic Relevance & Quality Gate for News Media.
 * Rejects logos, tracking pixels, ads, and obviously mismatched media.
 */

const AD_OR_DECORATIVE_PATTERNS = [
  /logo/i,
  /advert/i,
  /banner/i,
  /sponsor/i,
  /tracker/i,
  /pixel/i,
  /spacer/i,
  /icon/i,
  /avatar/i,
  /button/i,
  /placeholder/i,
  /watermark/i,
  /share[_-]?button/i,
  /header[_-]?bg/i,
  /footer[_-]?bg/i,
];

export type MediaRelevanceInput = {
  mediaUrl: string;
  altText?: string | null;
  caption?: string | null;
  width?: number | null;
  height?: number | null;
  category?: string | null;
  headline?: string | null;
  tags?: string[] | null;
};

export type MediaRelevanceResult = {
  eligible: boolean;
  score: number;
  reason?: string;
};

/**
 * Deterministic relevance and quality check for article media candidates.
 */
export function evaluateMediaRelevance(input: MediaRelevanceInput): MediaRelevanceResult {
  const { mediaUrl, altText, caption, width, height, category, headline, tags } = input;
  if (!mediaUrl || typeof mediaUrl !== "string") {
    return { eligible: false, score: 0, reason: "missing_url" };
  }

  // 1. URL pattern check for decorative / ad assets
  for (const pattern of AD_OR_DECORATIVE_PATTERNS) {
    if (pattern.test(mediaUrl)) {
      return { eligible: false, score: 0, reason: `decorative_url_pattern:${pattern.source}` };
    }
  }

  // 2. Alt text / caption check
  const textContext = `${altText ?? ""} ${caption ?? ""}`.trim();
  for (const pattern of AD_OR_DECORATIVE_PATTERNS) {
    if (pattern.test(textContext)) {
      return { eligible: false, score: 0, reason: `decorative_text_pattern:${pattern.source}` };
    }
  }

  // 3. Dimension checks: reject banner/tracking/ad ratios if dimensions are provided
  if (width && height) {
    if (width < 200 || height < 120) {
      return { eligible: false, score: 0, reason: `too_small:${width}x${height}` };
    }
    const ratio = width / height;
    // Standard ads: 728x90 (ratio ~8.1), 300x50 (ratio 6.0)
    if (ratio > 3.8 || ratio < 0.4) {
      return { eligible: false, score: 0, reason: `abnormal_aspect_ratio:${ratio.toFixed(2)}` };
    }
  }

  let score = 50;

  // 4. Boost score if story keywords or category match the media context
  const fullStoryText = `${headline ?? ""} ${category ?? ""} ${(tags ?? []).join(" ")}`.toLowerCase();
  if (altText) {
    const altTokens = altText.toLowerCase().split(/\s+/).filter((t) => t.length > 3);
    for (const token of altTokens) {
      if (fullStoryText.includes(token)) {
        score += 15;
      }
    }
  }

  // 5. Semantic mismatch checks
  // If story is about sports/cricket, reject stock office/laptop
  if (/cricket|ipl|match|sports|football|hockey|दौड़|खेल/i.test(fullStoryText)) {
    if (/laptop|office|desk|skyscraper|corporate/i.test(textContext) || /office|desk/i.test(mediaUrl)) {
      return { eligible: false, score: 0, reason: "semantic_mismatch_sports" };
    }
  }

  // If story is about farming/agriculture, reject city skyscrapers
  if (/farmer|kisan|agriculture|crops|धान|किसान|फसल/i.test(fullStoryText)) {
    if (/skyscraper|metro|traffic|corporate/i.test(textContext) || /skyscraper|traffic/i.test(mediaUrl)) {
      return { eligible: false, score: 0, reason: "semantic_mismatch_agriculture" };
    }
  }

  return { eligible: true, score: Math.min(100, score) };
}
