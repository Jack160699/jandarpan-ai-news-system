/**
 * Image quality score (0–100) for hero / display selection.
 */

export type ImageQualityInput = {
  /** Has a concrete https image URL */
  hasUrl: boolean;
  /** Passed shape / mime validation */
  urlValid: boolean;
  /** Source is article hero / OG vs contextual fallback */
  isPrimarySource: boolean;
  /** Has meaningful alt text */
  hasAlt: boolean;
  /** Estimated width if known */
  width?: number | null;
  /** Estimated height if known */
  height?: number | null;
};

export type ImageQualityResult = {
  score: number;
  breakdown: {
    presence: number;
    validity: number;
    primacy: number;
    alt: number;
    dimensions: number;
  };
  acceptable: boolean;
};

export const IMAGE_QUALITY_ACCEPT_THRESHOLD = 50;

export function scoreImageQuality(input: ImageQualityInput): ImageQualityResult {
  const presence = input.hasUrl ? 25 : 0;
  const validity = input.urlValid ? 30 : 0;
  const primacy = input.isPrimarySource ? 20 : 8;
  const alt = input.hasAlt ? 10 : 0;

  let dimensions = 0;
  const w = input.width ?? 0;
  const h = input.height ?? 0;
  if (w >= 1200 && h >= 630) dimensions = 15;
  else if (w >= 800 && h >= 450) dimensions = 10;
  else if (w > 0 && h > 0) dimensions = 5;
  else if (input.hasUrl && input.urlValid) dimensions = 5; // unknown dims, soft credit

  const score = presence + validity + primacy + alt + dimensions;
  return {
    score,
    breakdown: { presence, validity, primacy, alt, dimensions },
    acceptable: score >= IMAGE_QUALITY_ACCEPT_THRESHOLD,
  };
}
