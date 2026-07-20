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
    image?: { hero_url?: string | null; og_url?: string | null } | null;
  } | null;
  tags?: string[] | null;
  headline?: string | null;
};

/**
 * Resolve display / OG / mobile URLs for a generated or feed article row.
 */
export function resolveArticleDisplayImage(
  article: ArticleDisplayImageInput
): CanonicalImageResult {
  const metaImage = article.editorial_metadata?.image;
  return resolveCanonicalImage({
    heroUrl:
      article.heroUrl ??
      article.hero_image_url ??
      metaImage?.hero_url ??
      article.image_url ??
      null,
    ogUrl: article.ogUrl ?? metaImage?.og_url ?? null,
    bodyImageUrl: article.bodyImageUrl ?? null,
    title: article.title ?? article.headline ?? null,
    category: article.category ?? article.tags?.[0] ?? null,
    region: article.region ?? null,
    source: article.source ?? null,
    alt: article.alt ?? null,
  });
}
