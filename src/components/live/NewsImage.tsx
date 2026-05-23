"use client";

import { MediaImage } from "@/components/media/MediaImage";

type NewsImageProps = {
  src: string | null | undefined;
  alt: string;
  category?: string;
  source?: string | null;
  priority?: boolean;
  sizes?: string;
  className?: string;
  width?: number;
};

/**
 * Live news images — tiered fallback, skeleton, fixed crop
 */
export function NewsImage({
  src,
  alt,
  category = "world",
  source,
  priority = false,
  sizes = "100vw",
  className = "image-ink",
}: NewsImageProps) {
  return (
    <MediaImage
      src={src}
      alt={alt}
      sizes={sizes}
      category={category}
      source={source}
      aspect="16:9"
      priority={priority}
      fillParent
      cinematic
      imageClassName={className}
      className="h-full w-full"
    />
  );
}
