import type { HomeArticle } from "@/lib/homepage/types";

export type HomeTrustSignal =
  | { kind: "human-reviewed" }
  | { kind: "verified" }
  | { kind: "ai-reviewed" }
  | { kind: "live" }
  | { kind: "source-count"; count: number }
  | { kind: "updated"; iso: string }
  | { kind: "district"; label: string };

const PRIORITY: HomeTrustSignal["kind"][] = [
  "human-reviewed",
  "verified",
  "ai-reviewed",
  "live",
  "source-count",
  "updated",
  "district",
];

const MAX_TRUST_ITEMS = 3;

export type DeriveHomeTrustOptions = {
  districtLabel?: string;
  suppressLive?: boolean;
};

function isHumanReviewed(article: HomeArticle): boolean {
  if (article.sourceCount >= 2 && article.aiConfidence >= 0.82) return true;
  return article.ranking?.reasons?.some((reason) =>
    /trusted|multi.?source|reviewed/i.test(reason)
  ) ?? false;
}

function isVerified(article: HomeArticle, humanReviewed: boolean): boolean {
  if (humanReviewed) return false;
  if (article.aiConfidence >= 0.75) return true;
  return article.sourceCount >= 3;
}

function isAiReviewed(article: HomeArticle, humanReviewed: boolean): boolean {
  if (humanReviewed) return false;
  return article.aiConfidence >= 0.55 && article.aiConfidence < 0.75;
}

function isLiveArticle(article: HomeArticle): boolean {
  return (
    article.isLive ||
    Boolean(article.ranking?.isBreaking) ||
    article.urgency === "high"
  );
}

function resolveDistrictLabel(
  article: HomeArticle,
  districtLabel?: string
): string | null {
  if (districtLabel?.trim()) return districtLabel.trim();
  if (article.section === "raipur" || article.section === "chhattisgarh") {
    return article.categoryLabel?.trim() || null;
  }
  return null;
}

function collectCandidates(
  article: HomeArticle,
  options?: DeriveHomeTrustOptions
): HomeTrustSignal[] {
  const candidates: HomeTrustSignal[] = [];
  const humanReviewed = isHumanReviewed(article);

  if (humanReviewed) candidates.push({ kind: "human-reviewed" });
  if (isVerified(article, humanReviewed)) candidates.push({ kind: "verified" });
  if (isAiReviewed(article, humanReviewed)) candidates.push({ kind: "ai-reviewed" });

  if (!options?.suppressLive && isLiveArticle(article)) {
    candidates.push({ kind: "live" });
  }

  if (article.sourceCount > 0) {
    candidates.push({ kind: "source-count", count: article.sourceCount });
  }

  if (article.publishedAt?.trim()) {
    candidates.push({ kind: "updated", iso: article.publishedAt });
  }

  const district = resolveDistrictLabel(article, options?.districtLabel);
  if (district) {
    candidates.push({ kind: "district", label: district });
  }

  return candidates;
}

/** Select up to three trust signals by editorial priority. */
export function deriveHomeTrustSignals(
  article: HomeArticle,
  options?: DeriveHomeTrustOptions
): HomeTrustSignal[] {
  const candidates = collectCandidates(article, options);
  const selected: HomeTrustSignal[] = [];
  const used = new Set<HomeTrustSignal["kind"]>();

  for (const kind of PRIORITY) {
    if (selected.length >= MAX_TRUST_ITEMS) break;
    const match = candidates.find((item) => item.kind === kind);
    if (!match || used.has(kind)) continue;
    used.add(kind);
    selected.push(match);
  }

  return selected;
}
