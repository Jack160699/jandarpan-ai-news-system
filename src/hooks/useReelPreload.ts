"use client";

import { useEffect } from "react";
import type { NewsShortCard } from "@/lib/news/shorts/types";

const PRELOAD_WINDOW = 1;

/** Preload video/image for adjacent reels only */
export function useReelPreload(
  shorts: NewsShortCard[],
  activeIndex: number
): void {
  useEffect(() => {
    const links: HTMLLinkElement[] = [];

    for (let offset = -PRELOAD_WINDOW; offset <= PRELOAD_WINDOW; offset++) {
      const idx = activeIndex + offset;
      const short = shorts[idx];
      if (!short) continue;

      if (short.videoUrl?.trim()) {
        const link = document.createElement("link");
        link.rel = "preload";
        link.as = "video";
        link.href = short.videoUrl;
        document.head.appendChild(link);
        links.push(link);
      } else if (short.imageUrl && offset !== 0) {
        const img = new Image();
        img.src = short.imageUrl;
      }
    }

    return () => {
      for (const link of links) link.remove();
    };
  }, [shorts, activeIndex]);
}
