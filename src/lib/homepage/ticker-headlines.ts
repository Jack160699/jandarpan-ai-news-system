import { isPlaceholderContent } from "@/lib/homepage/placeholder-content";
import type { GeneratedHomepageFeed, HomeArticle } from "./types";

const TICKER_HEADLINE_LIMIT = 12;

/** Breaking-only ticker — excludes hero and other reserved homepage slots */
export function buildTickerHeadlines(feed: GeneratedHomepageFeed): HomeArticle[] {
  const heroId = feed.editorsPicks?.lead?.id;
  const pool: HomeArticle[] = (feed.breakingTicker ?? []).filter(
    (a) => a?.id && a.id !== heroId
  );

  const seen = new Set<string>();
  const unique: HomeArticle[] = [];

  for (const article of pool) {
    if (!article?.id || seen.has(article.id)) continue;
    if (isPlaceholderContent(article.headline)) continue;
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
