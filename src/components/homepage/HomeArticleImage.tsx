"use client";

import { JdsCardImage } from "@/design-system/components/JdsCardImage/JdsCardImage";

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

/**
 * @deprecated Legacy homepage image wrapper — delegates to design-system JdsCardImage.
 */
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
  const cropAspect = aspect === "fill" ? "16:9" : aspect;

  return (
    <div
      className={
        aspectClassName ??
        "relative h-full w-full nr-card__image-wrap"
      }
    >
      <JdsCardImage
        src={src || undefined}
        alt={alt}
        sizes={sizes}
        priority={priority}
        category={category}
        source={source}
        cropAspect={cropAspect}
        className={className}
      />
    </div>
  );
}
