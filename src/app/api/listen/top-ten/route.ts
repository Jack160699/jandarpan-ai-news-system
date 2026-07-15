import { NextResponse } from "next/server";
import { getCachedGeneratedHomepageFeed } from "@/lib/homepage/cached-feed";
import { getServerReaderLanguage } from "@/lib/i18n/server-language";
import { buildHeadlinePlaylist } from "@/lib/listen/build-playlist";
import { selectDiverseTopTen } from "@/lib/listen/top-ten";
import { fetchShortsPool } from "@/lib/news/shorts/build-short";

export const dynamic = "force-dynamic";

export async function GET() {
  const language = await getServerReaderLanguage();
  const feed = await getCachedGeneratedHomepageFeed();
  const ranked = await fetchShortsPool(30, language, {
    preferredArticleIds: feed?.listenArticleIds,
    maxHomepageOverlap: 10,
  });
  const tracks = buildHeadlinePlaylist(selectDiverseTopTen(ranked, 10));

  return NextResponse.json(
    {
      tracks,
      count: tracks.length,
      totalDurationSec: tracks.reduce((total, track) => total + track.durationSec, 0),
      fetchedAt: new Date().toISOString(),
    },
    {
      headers: {
        "Cache-Control": "private, no-cache",
        Vary: "Cookie",
      },
    }
  );
}
