"use client";

import Image from "next/image";
import { useState } from "react";
import { buildResponsiveSizes } from "@/lib/news/images/responsive-sizes";
import { IMAGE_BLUR } from "@/lib/image-placeholder";

type ArticleHeroImageProps = {
  src: string;
  credit?: string;
  priority?: boolean;
  fallbackSrc?: string;
  sizes?: string;
};

export function ArticleHeroImage({
  src,
  credit,
  priority = true,
  fallbackSrc,
  sizes = buildResponsiveSizes(),
}: ArticleHeroImageProps) {
  const [failed, setFailed] = useState(false);
  const displaySrc =
    failed && fallbackSrc?.trim() ? fallbackSrc : src?.trim() ?? "";

  if (!displaySrc) return null;

  return (
    <figure className="article-figure">
      <div className="article-figure__media">
        <Image
          src={displaySrc}
          alt=""
          fill
          priority={priority}
          loading={priority ? undefined : "lazy"}
          placeholder="blur"
          blurDataURL={IMAGE_BLUR}
          sizes={sizes}
          className="image-ink object-cover"
          onError={() => setFailed(true)}
        />
      </div>
      {credit ? (
        <figcaption className="article-figure__caption">{credit}</figcaption>
      ) : null}
    </figure>
  );
}
