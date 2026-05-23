"use client";

import Image from "next/image";
import { useState } from "react";
import { IMAGE_BLUR } from "@/lib/image-placeholder";

type HomeArticleImageProps = {
  src: string;
  alt: string;
  priority?: boolean;
  sizes: string;
  fallbackSrc?: string;
  className?: string;
  aspectClassName?: string;
};

export function HomeArticleImage({
  src,
  alt,
  priority = false,
  sizes,
  fallbackSrc,
  className = "object-cover",
  aspectClassName,
}: HomeArticleImageProps) {
  const [failed, setFailed] = useState(false);
  const displaySrc =
    failed && fallbackSrc?.trim() ? fallbackSrc : src?.trim() ?? "";
  const hasSrc = Boolean(displaySrc) && !(failed && !fallbackSrc?.trim());

  return (
    <div
      className={
        aspectClassName ??
        "relative h-full w-full nr-card__image-wrap"
      }
      data-image-state={hasSrc ? (failed ? "fallback" : "loaded") : "empty"}
    >
      {hasSrc ? (
        <Image
          src={displaySrc}
          alt={alt}
          fill
          priority={priority}
          loading={priority ? undefined : "lazy"}
          placeholder="blur"
          blurDataURL={IMAGE_BLUR}
          sizes={sizes}
          className={className}
          onError={() => setFailed(true)}
        />
      ) : (
        <div className="nr-card__image-fallback" aria-hidden>
          <span className="nr-card__image-fallback-mark" />
        </div>
      )}
    </div>
  );
}
