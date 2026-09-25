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

function pickBestRealMediaUrl(article: ArticleDisplayImageInput): string | null {
  const meta = article.editorial_metadata as any;
  const metaImage = meta?.image;

  const isStock = (u?: string | null) => {
    if (!u) return true;
    const l = u.toLowerCase();
    return (
      l.includes("images.unsplash.com") ||
      l.includes("plus.unsplash.com") ||
      l.includes("pexels.com") ||
      l.includes("pixabay.com") ||
      l.includes("googleusercontent.com/j6_cofbogxh")
    );
  };

  // Candidates in priority order: genuine source article media first
  const candidates: Array<string | null | undefined> = [
    article.heroUrl,
    meta?.media_source_url,
    meta?.hero_media?.media_url,
    meta?.hero_media?.source_url,
    meta?.hero_media?.thumbnail_url,
    meta?.source_attribution?.[0]?.image_url,
    meta?.source_attribution?.[0]?.source_image,
    meta?.embedded_video?.[0]?.thumbnailUrl,
    meta?.embedded_video?.[0]?.thumbnail_url,
    (article as any).media_records?.[0]?.media_url,
    (article as any).media_records?.[0]?.source_url,
    (article as any).media_records?.[0]?.thumbnail_url,
    (article as any).source_image,
    (article as any).thumbnail_url,
    article.hero_image_url,
    metaImage?.hero_url,
    metaImage?.sourceUrl,
    article.image_url,
  ];

  // 1. Try first candidate that is a genuine non-stock real news photo
  for (const c of candidates) {
    if (c && typeof c === "string" && c.trim() && !isStock(c)) {
      return c.trim();
    }
  }

  // 2. Fall back to stock / contextual only if no genuine real image exists
  for (const c of candidates) {
    if (c && typeof c === "string" && c.trim()) {
      return c.trim();
    }
  }

  return null;
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
