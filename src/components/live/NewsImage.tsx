"use client";

import Image from "next/image";
import { useState } from "react";
import { IMAGE_BLUR } from "@/lib/image-placeholder";
import { EDITORIAL_IMAGES } from "@/lib/editorial-images";

const FALLBACK_SRC = EDITORIAL_IMAGES.newsroomDesk;

type NewsImageProps = {
  src: string | null | undefined;
  alt: string;
  fill?: boolean;
  priority?: boolean;
  sizes?: string;
  className?: string;
};

/**
 * Live news images come from arbitrary publisher domains.
 * Uses unoptimized loading + fallback to editorial placeholder on error.
 */
export function NewsImage({
  src,
  alt,
  fill = true,
  priority = false,
  sizes = "100vw",
  className = "image-ink object-cover",
}: NewsImageProps) {
  const [failed, setFailed] = useState(false);
  const resolved = failed || !src ? FALLBACK_SRC : src;

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
