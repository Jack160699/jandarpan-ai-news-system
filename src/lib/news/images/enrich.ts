/**
 * Batch image enrichment during ingestion
 */

import {
  getCategoryFallback,
  getSourceFallback,
} from "@/lib/news/images/fallbacks";
import {
  extractArticleImage,
  normalizeImageUrl,
  pickBestImageCandidate,
  providerImageCandidates,
} from "@/lib/news/images/extract";
import { isDisplayableImage } from "@/lib/news/images/validate";
import type { NormalizedArticle } from "@/lib/news/types";

const MAX_PAGE_FETCHES = 30;
const PARALLEL = 6;

export type ImageEnrichmentAnalytics = {
  total: number;
  hadProviderImage: number;
  keptProviderImage: number;
  extractedFromPage: number;
  usedCategoryFallback: number;
  usedSourceFallback: number;
  rejected: number;
  duplicateImagesSkipped: number;
  avgQualityScore: number;
};

export async function enrichArticleImages(
  articles: NormalizedArticle[]
): Promise<{
  articles: NormalizedArticle[];
  analytics: ImageEnrichmentAnalytics;
}> {
  const usedUrls = new Set<string>();
  let pageFetches = 0;
  let scoreSum = 0;
  let scored = 0;

  const analytics: ImageEnrichmentAnalytics = {
    total: articles.length,
    hadProviderImage: 0,
    keptProviderImage: 0,
    extractedFromPage: 0,
    usedCategoryFallback: 0,
    usedSourceFallback: 0,
    rejected: 0,
    duplicateImagesSkipped: 0,
    avgQualityScore: 0,
  };

  const enriched: NormalizedArticle[] = [];

  for (let i = 0; i < articles.length; i += PARALLEL) {
    const batch = articles.slice(i, i + PARALLEL);
    const results = await Promise.all(
      batch.map(async (article) => {
        if (article.image_url) analytics.hadProviderImage++;

        const providerOk =
          article.image_url && isDisplayableImage(article.image_url);

        if (providerOk) {
          const picked = pickBestImageCandidate(
            providerImageCandidates(article.image_url),
            usedUrls
          );
          if (picked) {
            analytics.keptProviderImage++;
            scoreSum += picked.score;
            scored++;
            return {
              ...article,
              image_url: picked.url,
            };
          }
        }

        if (!providerOk && pageFetches < MAX_PAGE_FETCHES) {
          pageFetches++;
          const extracted = await extractArticleImage({
            articleUrl: article.article_url,
            providerImage: article.image_url,
            htmlContent: article.content,
            usedUrls,
          });

          if (extracted.url && extracted.score >= 35) {
            if (extracted.source === "og" || extracted.source === "twitter") {
              analytics.extractedFromPage++;
            }
            scoreSum += extracted.score;
            scored++;
            return { ...article, image_url: extracted.url };
          }
        }

        if (article.image_url && isDisplayableImage(article.image_url)) {
          const url = normalizeImageUrl(article.image_url, article.article_url);
          if (!usedUrls.has(url.toLowerCase())) {
            usedUrls.add(url.toLowerCase());
            analytics.keptProviderImage++;
            return { ...article, image_url: url };
          }
          analytics.duplicateImagesSkipped++;
        } else if (article.image_url) {
          analytics.rejected++;
        }

        const sourceFb = getSourceFallback(article.source);
        const fallbackUrl =
          sourceFb ?? getCategoryFallback(article.category);

        if (sourceFb) analytics.usedSourceFallback++;
        else analytics.usedCategoryFallback++;
        if (usedUrls.has(fallbackUrl.toLowerCase())) {
          analytics.duplicateImagesSkipped++;
        } else {
          usedUrls.add(fallbackUrl.toLowerCase());
        }

        scoreSum += 25;
        scored++;

        return { ...article, image_url: fallbackUrl };
      })
    );

    enriched.push(...results);
  }

  analytics.avgQualityScore = scored ? Math.round(scoreSum / scored) : 0;

  console.log(
    `[images] Enriched ${analytics.total}: provider=${analytics.keptProviderImage} page=${analytics.extractedFromPage} fallback=${analytics.usedCategoryFallback + analytics.usedSourceFallback} avgScore=${analytics.avgQualityScore}`
  );

  return { articles: enriched, analytics };
}
