export {
  extractArticleImage,
  extractImagesFromHtml,
  extractImagesFromRssItem,
  normalizeImageUrl,
  pickBestImageCandidate,
  providerImageCandidates,
} from "@/lib/news/images/extract";

export {
  imageQualityScore,
  isDisplayableImage,
  isRejectedImageUrl,
  type ImageCandidate,
  type ImageCandidateSource,
} from "@/lib/news/images/validate";

export {
  getCategoryFallback,
  getSourceFallback,
  NEWSROOM_PLACEHOLDER,
  resolveFallbackImage,
} from "@/lib/news/images/fallbacks";

export {
  resolveCardImage,
  resolveDisplayImage,
  resolveMedia,
  optimizeImageUrlForNext,
  optimizeCdnUrl,
  optimizeCdnImageUrl,
  type ResolvedMedia,
  type ResolveMediaInput,
  type DisplayImageInput,
} from "@/lib/news/images/display";

export {
  normalizeMediaAspect,
  aspectClassName,
  type MediaAspect,
  type ThumbAspect,
} from "@/lib/news/images/aspects";

export { enrichArticleImages, type ImageEnrichmentAnalytics } from "@/lib/news/images/enrich";
