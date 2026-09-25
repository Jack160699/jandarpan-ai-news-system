/**
 * Thin adapter over canonical-image-resolver for article display surfaces.
 */

import {
  resolveCanonicalImage,
  type CanonicalImageInput,
  type CanonicalImageResult,
} from "@/lib/news/images/canonical-image-resolver";

export type ArticleDisplayImageInput = CanonicalImageInput & {
  hero_image_url?: string | null;
  image_url?: string | null;
  editorial_metadata?: {
    image?: { hero_url?: string | null; og_url?: string | null; sourceUrl?: string | null } | null;
    media_source_url?: string | null;
    hero_media?: { media_url?: string | null; source_url?: string | null; thumbnail_url?: string | null } | null;
    source_attribution?: Array<{ image_url?: string | null; source_image?: string | null; article_url?: string | null }> | null;
    embedded_video?: Array<{ thumbnailUrl?: string | null; thumbnail_url?: string | null }> | null;
  } | null;
  tags?: string[] | null;
  headline?: string | null;
};

import { extractVerifiedRealMediaUrl } from "@/lib/news/images/validate";

function pickBestRealMediaUrl(article: ArticleDisplayImageInput): string | null {
  return extractVerifiedRealMediaUrl(article);
}

/**
 * Resolve display / OG / mobile URLs for a generated or feed article row.
 */
export function resolveArticleDisplayImage(
  article: ArticleDisplayImageInput
): CanonicalImageResult {
  const bestUrl = pickBestRealMediaUrl(article);
  const metaImage = article.editorial_metadata?.image;

  return resolveCanonicalImage({
    heroUrl: bestUrl,
    ogUrl: article.ogUrl ?? metaImage?.og_url ?? null,
    bodyImageUrl: article.bodyImageUrl ?? null,
    title: article.title ?? article.headline ?? null,
    category: article.category ?? article.tags?.[0] ?? null,
    region: article.region ?? null,
    source: article.source ?? null,
    alt: article.alt ?? null,
  });
}
