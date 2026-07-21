import type { HomeArticle } from "@/lib/homepage/types";
import type { GeneratedHomepageFeed } from "@/lib/homepage/types";

/** Flatten real feed slices for saved/history lookup — no invented stories. */
export function catalogFromFeed(
  feed: GeneratedHomepageFeed | null | undefined
): HomeArticle[] {
  if (!feed) return [];
  const all = [
    feed.editorsPicks.lead,
    ...feed.editorsPicks.supporting,
    ...feed.breakingTicker,
    ...feed.trending,
    ...feed.liveWire,
    ...feed.regionalHighlights,
    ...feed.shorts,
  ];
  const seen = new Set<string>();
  const out: HomeArticle[] = [];
  for (const a of all) {
    if (!a?.slug || seen.has(a.slug)) continue;
    seen.add(a.slug);
    out.push(a);
  }
  return out;
}
