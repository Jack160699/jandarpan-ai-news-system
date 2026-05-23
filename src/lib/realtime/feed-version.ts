import type { HomeArticle } from "@/lib/homepage/types";

/** Stable hash for feed change detection */
export function computeFeedVersion(
  sections: {
    breakingTicker: HomeArticle[];
    liveWire: HomeArticle[];
    trending: HomeArticle[];
  }
): string {
  const parts = [
    ...sections.breakingTicker.map(signature),
    ...sections.liveWire.map(signature),
    ...sections.trending.slice(0, 12).map(signature),
  ];
  return hashString(parts.join("|"));
}

function signature(a: HomeArticle): string {
  return `${a.id}:${a.publishedAt}`;
}

function hashString(input: string): string {
  let h = 0;
  for (let i = 0; i < input.length; i++) {
    h = (Math.imul(31, h) + input.charCodeAt(i)) | 0;
  }
  return (h >>> 0).toString(36);
}
