import { getCachedGeneratedHomepageFeed } from "@/lib/homepage/cached-feed";
import { getServerReaderLanguage } from "@/lib/i18n/server-language";
import { fetchShortsPool } from "@/lib/news/shorts/build-short";
import { tracksFromArticles, tracksFromShorts } from "./audio/tracksFromShorts";
import type { BriefingTrack } from "./audio/types";
import type { HomeArticle } from "@/lib/homepage/types";

function tracksFromHomepage(
  homepageFeed: Awaited<ReturnType<typeof getCachedGeneratedHomepageFeed>>
): BriefingTrack[] {
  const articles = [
    homepageFeed?.editorsPicks.lead,
    ...(homepageFeed?.trending ?? []),
    ...(homepageFeed?.breakingTicker ?? []),
    ...(homepageFeed?.shorts ?? []),
  ].filter(Boolean) as HomeArticle[];
  const seen = new Set<string>();
  const unique = articles.filter((a) => {
    const key = a.slug || a.id;
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  return tracksFromArticles(unique);
}

export async function loadListenTracks(): Promise<BriefingTrack[]> {
  const homepageFeed = await getCachedGeneratedHomepageFeed();
  try {
    const displayLanguage = await getServerReaderLanguage();
    const shorts = await fetchShortsPool(20, displayLanguage, {
      preferredArticleIds: homepageFeed?.listenArticleIds,
      maxHomepageOverlap: 2,
    });
    if (shorts.length > 0) return tracksFromShorts(shorts);
  } catch {
    // Local / Preview without Supabase — use homepage fallback headlines.
  }
  return tracksFromHomepage(homepageFeed);
}
