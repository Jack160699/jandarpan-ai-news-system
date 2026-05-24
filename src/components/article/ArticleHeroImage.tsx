"use client";

import { MediaImage } from "@/components/media/MediaImage";
import { buildResponsiveSizes } from "@/lib/news/images/responsive-sizes";

type ArticleHeroImageProps = {
  src: string;
  credit?: string;
  priority?: boolean;
  fallbackSrc?: string;
  sizes?: string;
  category?: string;
};

export function ArticleHeroImage({
  src,
  credit,
  priority = true,
  fallbackSrc,
  sizes = buildResponsiveSizes(),
  category = "national",
}: ArticleHeroImageProps) {
  const displaySrc = src?.trim() || fallbackSrc?.trim() || "";
  if (!displaySrc) return null;

  return (
    <figure className="article-figure">
      <div className="article-figure__media">
        <MediaImage
          src={displaySrc}
          alt=""
          sizes={sizes}
          aspect="16:9"
          category={category}
          priority={priority}
          cinematic
          hoverZoom
          className="h-full w-full"
          imageClassName="image-ink"
        />
      </div>
      {credit ? (
        <figcaption className="article-figure__caption">{credit}</figcaption>
      ) : null}
    </figure>
  );
}
