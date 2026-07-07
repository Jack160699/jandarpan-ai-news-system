import type { GeneratedArticleRow, NewsEventRow } from "@/lib/types/newsroom";

export type EditorialCostTier = 1 | 2 | 3 | 4;

export type EditorialTierPlan = {
  tier: EditorialCostTier;
  generateArticle: boolean;
  generateImage: boolean;
  generateTranslation: boolean;
  generateEmbedding: boolean;
  generateShorts: boolean;
  reason: string;
  signals: {
    urgency: number;
    aiConfidence: number;
    verifiedSources: number;
    localRelevance: number;
    readerValueHint: number;
  };
};

function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(1, n));
}

export function countVerifiedSources(input: {
  event?: Pick<NewsEventRow, "source_count"> | null;
  article?: Pick<GeneratedArticleRow, "editorial_metadata"> | null;
  attributions?: Array<{ source: string | null | undefined }> | null;
  signalCount?: number | null;
}): number {
  const attr = input.attributions ?? (input.article?.editorial_metadata?.source_attribution as
    | Array<{ source?: string | null }>
    | undefined) ?? [];

  const unique = new Set(
    (attr ?? []).map((a) => (a.source ?? "").trim().toLowerCase()).filter(Boolean)
  ).size;

  const hinted =
    Number(input.event?.source_count ?? input.article?.editorial_metadata?.source_count ?? 0) || 0;

  const signals = Number(input.signalCount ?? 0) || 0;

  return Math.max(unique, hinted, signals);
}

export function resolveEditorialTierPlan(input: {
  event: Pick<NewsEventRow, "urgency_score" | "source_count">;
  quality: { ai_confidence?: number | null; quality_breakdown?: Record<string, unknown> | null };
  attributions?: Array<{ source: string | null | undefined }> | null;
  signalCount?: number;
  breakingOverride?: boolean;
}): EditorialTierPlan {
  const urgency = Number(input.event.urgency_score ?? 0);
  const aiConfidence = clamp01(Number(input.quality.ai_confidence ?? 0));

  const qb = (input.quality.quality_breakdown ?? {}) as {
    local_relevance?: number;
    readability?: number;
    seo_quality?: number;
    originality?: number;
    structure?: number;
    spam_score?: number;
    breaking_score?: number;
    trend_score?: number;
  };

  const localRelevance = clamp01(Number(qb.local_relevance ?? 0.45));

  // Lightweight reader value hint: reward substance + scannability (no clickbait).
  const readerValueHint = clamp01(
    (clamp01(Number(qb.readability ?? 0.45)) * 0.55 +
      clamp01(Number(qb.structure ?? 0.45)) * 0.25 +
      clamp01(Number(qb.seo_quality ?? 0.45)) * 0.2)
  );

  const verifiedSources = countVerifiedSources({
    event: input.event,
    attributions: input.attributions ?? null,
    signalCount: input.signalCount ?? 0,
  });

  // Tiering policy:
  // - Tier 1: "high confidence + verified multi-source" OR breaking override.
  // - Tier 2: "solid article" (enough confidence + some verification).
  // - Tier 3: "acceptable but keep costs minimal".
  // - Tier 4: reject to control cost & quality floor.
  if (input.breakingOverride) {
    return {
      tier: 1,
      generateArticle: true,
      generateImage: true,
      generateTranslation: true,
      generateEmbedding: true,
      generateShorts: true,
      reason: "breaking_override",
      signals: { urgency, aiConfidence, verifiedSources, localRelevance, readerValueHint },
    };
  }

  if (
    urgency >= 80 &&
    aiConfidence >= 0.85 &&
    verifiedSources >= 3 &&
    (localRelevance >= 0.55 || readerValueHint >= 0.6)
  ) {
    return {
      tier: 1,
      generateArticle: true,
      generateImage: true,
      generateTranslation: true,
      generateEmbedding: true,
      generateShorts: true,
      reason: "tier1_quality_verified",
      signals: { urgency, aiConfidence, verifiedSources, localRelevance, readerValueHint },
    };
  }

  if (aiConfidence >= 0.72 && verifiedSources >= 2) {
    return {
      tier: 2,
      generateArticle: true,
      generateImage: true,
      generateTranslation: false,
      generateEmbedding: false,
      generateShorts: false,
      reason: "tier2_article_image",
      signals: { urgency, aiConfidence, verifiedSources, localRelevance, readerValueHint },
    };
  }

  if (aiConfidence >= 0.58 && verifiedSources >= 1) {
    return {
      tier: 3,
      generateArticle: true,
      generateImage: false,
      generateTranslation: false,
      generateEmbedding: false,
      generateShorts: false,
      reason: "tier3_article_only",
      signals: { urgency, aiConfidence, verifiedSources, localRelevance, readerValueHint },
    };
  }

  return {
    tier: 4,
    generateArticle: false,
    generateImage: false,
    generateTranslation: false,
    generateEmbedding: false,
    generateShorts: false,
    reason: "tier4_reject",
    signals: { urgency, aiConfidence, verifiedSources, localRelevance, readerValueHint },
  };
}

