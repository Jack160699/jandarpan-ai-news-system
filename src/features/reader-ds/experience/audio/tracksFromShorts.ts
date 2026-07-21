import type { NewsShortCard } from "@/lib/news/shorts/types";
import type { HomeArticle } from "@/lib/homepage/types";
import {
  estimateDurationSec,
  formatDuration,
  type BriefingTrack,
} from "./types";

export function tracksFromShorts(shorts: NewsShortCard[]): BriefingTrack[] {
  return shorts.slice(0, 10).map((s) => {
    const durationSec =
      s.durationSec > 0
        ? s.durationSec
        : estimateDurationSec(s.headline, s.summary60s);
    return {
      id: s.articleId || s.slug,
      slug: s.slug,
      headline: s.headline,
      durationSec,
      durationLabel: formatDuration(durationSec),
      imageUrl: s.imageUrl,
      streamPath: s.hasVoice ? s.voiceStreamPath : null,
    };
  });
}

export function tracksFromArticles(articles: HomeArticle[]): BriefingTrack[] {
  return articles.slice(0, 10).map((a) => {
    const durationSec = estimateDurationSec(a.headline, a.summary);
    return {
      id: a.id || a.slug,
      slug: a.slug,
      headline: a.headline,
      durationSec,
      durationLabel: formatDuration(durationSec),
      imageUrl: a.imageUrl,
      streamPath: null,
    };
  });
}

export function briefingMeta(tracks: BriefingTrack[]) {
  const totalSec = tracks.reduce((n, t) => n + t.durationSec, 0);
  const mins = Math.max(1, Math.round(totalSec / 60));
  return {
    count: tracks.length,
    totalLabel: `${tracks.length} ख़बरें · ${mins} मिनट`,
    totalSec,
  };
}
