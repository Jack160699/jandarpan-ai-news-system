/**
 * Evolving coverage headlines — "Election Crisis Live Updates"
 */

import { slugifyTitle } from "@/lib/news/slug";

const LIVE_SUFFIX_EN = "Live Updates";
const LIVE_SUFFIX_HI = "लाइव अपडेट";

export function buildCoverageHeadline(
  canonicalTitle: string,
  language?: string | null
): string {
  const base = canonicalTitle.trim().replace(/\s+/g, " ");
  if (!base) return language === "hi" ? `खबर ${LIVE_SUFFIX_HI}` : `Story ${LIVE_SUFFIX_EN}`;

  const lower = base.toLowerCase();
  if (lower.includes("live update") || lower.includes("लाइव")) {
    return base;
  }

  const suffix = language === "hi" ? LIVE_SUFFIX_HI : LIVE_SUFFIX_EN;
  return `${base} · ${suffix}`;
}

export function buildCoverageSlug(
  canonicalTitle: string,
  eventId: string
): string {
  const base = slugifyTitle(canonicalTitle);
  const suffix = eventId.replace(/-/g, "").slice(0, 8);
  return `${base}-live-${suffix}`.replace(/-+/g, "-").slice(0, 96);
}

export function shouldEnableLiveCoverage(input: {
  sourceCount: number;
  urgencyScore: number;
  clusterConfidence: number;
  isBreaking?: boolean;
}): boolean {
  if (input.isBreaking) return true;
  if (input.sourceCount >= 2 && input.clusterConfidence >= 0.45) return true;
  if (input.sourceCount >= 3) return true;
  if (input.urgencyScore >= 70 && input.sourceCount >= 2) return true;
  return false;
}
