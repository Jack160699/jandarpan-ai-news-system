"use client";

import Image from "next/image";
import { useState } from "react";
import { IMAGE_BLUR } from "@/lib/image-placeholder";
import { NEWSROOM_PLACEHOLDER } from "@/lib/news/images/fallbacks";
import { optimizeImageUrlForNext } from "@/lib/news/images/display";

type NewsImageProps = {
  /** Pre-resolved URL from liveArticleToCard, or raw URL with fallbacks */
  src: string | null | undefined;
  alt: string;
  fill?: boolean;
  priority?: boolean;
  sizes?: string;
  className?: string;
  /** Card width hint for Unsplash/CDN optimization */
  width?: number;
};

/**
 * Live news images — always renders a valid editorial visual.
 * Uses unoptimized remote URLs + tiered fallback on load error.
 */
export function NewsImage({
  src,
  alt,
  fill = true,
  priority = false,
  sizes = "100vw",
  className = "image-ink object-cover",
  width = 640,
}: NewsImageProps) {
  const [failed, setFailed] = useState(false);
  const primary = src
    ? optimizeImageUrlForNext(src, width)
    : NEWSROOM_PLACEHOLDER;
  const resolved = failed ? NEWSROOM_PLACEHOLDER : primary;

  return (
    <Image
      src={resolved}
      alt={alt}
      fill={fill}
      priority={priority}
      sizes={sizes}
      unoptimized
      placeholder="blur"
      blurDataURL={IMAGE_BLUR}
      className={className}
      onError={() => setFailed(true)}
    />
  );
}
