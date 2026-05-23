import type { HeadlineTrack } from "@/lib/listen/types";
import type { NewsShortCard } from "@/lib/news/shorts/types";

export function buildHeadlinePlaylist(shorts: NewsShortCard[]): HeadlineTrack[] {
  return shorts.map((s) => ({
    id: s.articleId,
    slug: s.slug,
    headline: s.headline,
    transcript: [s.anchorLine, s.summary60s].filter(Boolean).join(" "),
    durationSec: s.durationSec,
    voiceStreamPath: s.voiceStreamPath,
    language: s.language,
    categoryLabel: s.categoryLabel,
    subtitles: s.subtitles,
  }));
}
