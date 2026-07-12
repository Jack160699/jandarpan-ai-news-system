import type { HomeArticle } from "@/lib/homepage/types";

export type EditorialFeedLayout = "lead" | "standard" | "compact" | "live";

export type EditorialFeedItem = {
  article: HomeArticle;
  layout: EditorialFeedLayout;
  updateCount?: number;
};

const RHYTHM_CYCLE: EditorialFeedLayout[] = [
  "lead",
  "standard",
  "standard",
  "compact",
  "live",
  "standard",
  "compact",
  "lead",
];

const FALLBACK_LAYOUTS: EditorialFeedLayout[] = [
  "standard",
  "compact",
  "lead",
  "live",
];

function dedupeArticles(articles: HomeArticle[]): HomeArticle[] {
  const seen = new Set<string>();
  return articles.filter((article) => {
    if (!article?.id || seen.has(article.id)) return false;
    seen.add(article.id);
    return Boolean(article.headline?.trim());
  });
}

function canUseLiveLayout(article: HomeArticle, liveIds: Set<string>): boolean {
  return article.isLive || liveIds.has(article.id) || article.urgency === "high";
}

function resolveLayout(
  preferred: EditorialFeedLayout,
  article: HomeArticle,
  liveIds: Set<string>
): EditorialFeedLayout {
  if (preferred === "live") {
    return canUseLiveLayout(article, liveIds) ? "live" : "standard";
  }
  return preferred;
}

function avoidTripleRepeat(
  layout: EditorialFeedLayout,
  recent: EditorialFeedLayout[]
): EditorialFeedLayout {
  if (recent.length < 2) return layout;
  const [a, b] = recent;
  if (a === layout && b === layout) {
    return FALLBACK_LAYOUTS.find((candidate) => candidate !== layout) ?? "compact";
  }
  return layout;
}

export function mergeEditorialSources(
  storyFeed: HomeArticle[],
  districtNews: HomeArticle[],
  recommended: HomeArticle[],
  liveUpdates: HomeArticle[]
): { articles: HomeArticle[]; liveIds: Set<string> } {
  const liveIds = new Set(liveUpdates.map((item) => item.id));
  const seen = new Set<string>();
  const merged: HomeArticle[] = [];

  const push = (article: HomeArticle) => {
    if (!article?.id || seen.has(article.id)) return;
    seen.add(article.id);
    merged.push(article);
  };

  const maxLen = Math.max(
    storyFeed.length,
    districtNews.length,
    recommended.length,
    1
  );

  for (let i = 0; i < maxLen; i += 1) {
    if (storyFeed[i]) push(storyFeed[i]);
    if (districtNews[i]) push(districtNews[i]);
    if (recommended[i]) push(recommended[i]);
  }

  for (const item of liveUpdates) {
    push(item);
  }

  return { articles: merged, liveIds };
}

export function buildEditorialFeedItems(
  storyFeed: HomeArticle[],
  districtNews: HomeArticle[],
  recommended: HomeArticle[],
  liveUpdates: HomeArticle[],
  limit = 28
): EditorialFeedItem[] {
  const { articles, liveIds } = mergeEditorialSources(
    dedupeArticles(storyFeed),
    dedupeArticles(districtNews),
    dedupeArticles(recommended),
    dedupeArticles(liveUpdates)
  );

  const items: EditorialFeedItem[] = [];
  const recentLayouts: EditorialFeedLayout[] = [];
  let cycleIndex = 0;

  for (const article of articles.slice(0, limit)) {
    const preferred = RHYTHM_CYCLE[cycleIndex % RHYTHM_CYCLE.length];
    cycleIndex += 1;

    let layout = resolveLayout(preferred, article, liveIds);
    layout = avoidTripleRepeat(layout, recentLayouts);

    recentLayouts.push(layout);
    if (recentLayouts.length > 2) {
      recentLayouts.shift();
    }

    items.push({
      article,
      layout,
      updateCount:
        layout === "live"
          ? Math.max(1, article.sourceCount || 1)
          : undefined,
    });
  }

  return items;
}
