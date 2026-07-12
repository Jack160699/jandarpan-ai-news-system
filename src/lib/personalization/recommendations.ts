import type { GeneratedHomepageFeed, HomeArticle } from "@/lib/homepage/types";
import { sectionsFromFeedInterests } from "@/lib/super-menu/interest-sections";
import type {
  PersonalizationSignals,
  RecommendedArticle,
} from "@/lib/personalization/types";

function collectCandidates(feed: GeneratedHomepageFeed): HomeArticle[] {
  const seen = new Set<string>();
  const out: HomeArticle[] = [];
  const push = (list: HomeArticle[] | undefined) => {
    for (const a of list ?? []) {
      if (!a?.id || seen.has(a.id)) continue;
      seen.add(a.id);
      out.push(a);
    }
  };
  push(feed.trending);
  push(feed.regionalHighlights);
  push(feed.liveWire);
  push(feed.editorsPicks.supporting);
  for (const stream of feed.categoryStreams ?? []) {
    push(stream.articles);
  }
  return out;
}

function scoreArticle(
  article: HomeArticle,
  signals: PersonalizationSignals,
  preferredSections: ReturnType<typeof sectionsFromFeedInterests>
): { score: number; reason: string } {
  let score = article.ranking?.priorityScore ?? article.priorityScore ?? 0;
  let reason = "Trending on Jan Darpan";

  if (preferredSections.includes(article.section)) {
    score += 12;
    reason = `Matches your interests`;
  }

  if (signals.bookmarkSlugs.includes(article.slug)) {
    score += 20;
    reason = "From your saved stories";
  }

  if (signals.recentReadSlugs.includes(article.slug)) {
    score -= 50;
  }

  const district = signals.homeDistrict;
  if (
    district &&
    (article.tags.some((t) => t.toLowerCase().includes(district)) ||
      article.section === "raipur" ||
      article.section === "chhattisgarh")
  ) {
    score += 8;
    reason = `Relevant to ${district}`;
  }

  for (const followed of signals.followedDistricts) {
    if (article.tags.some((t) => t.toLowerCase().includes(followed))) {
      score += 6;
      reason = `Local — ${followed}`;
      break;
    }
  }

  if (article.ranking?.isTrending) score += 4;

  return { score, reason };
}

/** Rule-based picks — no ML, derived from feed + local signals */
export function buildRecommendedArticles(
  feed: GeneratedHomepageFeed,
  signals: PersonalizationSignals,
  limit = 6
): RecommendedArticle[] {
  const preferredSections = sectionsFromFeedInterests(signals.interestIds);
  const heroId = feed.editorsPicks.lead?.id;

  return collectCandidates(feed)
    .filter((a) => a.id !== heroId)
    .map((article) => {
      const { score, reason } = scoreArticle(
        article,
        signals,
        preferredSections
      );
      return { article, score, reason };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(({ article, reason }) => ({ ...article, reason }));
}
