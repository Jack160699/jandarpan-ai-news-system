"use client";

import { MediaImage } from "@/components/media/MediaImage";

type HomeArticleImageProps = {
  src: string;
  alt: string;
  priority?: boolean;
  sizes: string;
  category?: string;
  source?: string | null;
  fallbackSrc?: string;
  className?: string;
  aspectClassName?: string;
  aspect?: "16:9" | "4:5" | "fill";
};

export function HomeArticleImage({
  src,
  alt,
  priority = false,
  sizes,
  category,
  source,
  className = "pcard-thumb__img",
  aspectClassName,
  aspect = "fill",
}: HomeArticleImageProps) {
  return (
    <div
      className={
        aspectClassName ??
        "relative h-full w-full nr-card__image-wrap"
      }
    >
      <MediaImage
        src={src || undefined}
        alt={alt}
        sizes={sizes}
        priority={priority}
        category={category}
        source={source}
        aspect={aspect}
        fillParent
        cinematic={false}
        imageClassName={className}
        className="h-full w-full"
      />
    </div>
  );
}
