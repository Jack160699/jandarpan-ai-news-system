import type { GeneratedHomepageFeed, HomeArticle } from "./types";

const TICKER_HEADLINE_LIMIT = 12;

/** Latest headlines from the active homepage feed — newest first, deduped */
export function buildTickerHeadlines(feed: GeneratedHomepageFeed): HomeArticle[] {
  const pool: HomeArticle[] = [
    ...feed.breakingTicker,
    ...feed.liveWire,
    ...feed.trending,
    feed.editorsPicks.lead,
    ...feed.editorsPicks.supporting,
  ];

  const seen = new Set<string>();
  const unique: HomeArticle[] = [];

  for (const article of pool) {
    if (!article?.id || seen.has(article.id)) continue;
    seen.add(article.id);
    unique.push(article);
  }

  return unique
    .sort(
      (a, b) =>
        new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
    )
    .slice(0, TICKER_HEADLINE_LIMIT);
}
