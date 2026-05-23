/**
 * Homepage news shorts rail — build from article pool
 */

import { normalizeArticleLanguage } from "@/lib/i18n/languages";
import { inferSection } from "@/lib/homepage/infer-section";
import { buildAnchorLine } from "@/lib/news/shorts/anchor";
import { shortCardFromRow } from "@/lib/news/shorts/build-short";
import { buildReelSlides } from "@/lib/news/shorts/reels";
import { getShortStyle } from "@/lib/news/shorts/styles";
import { generateSubtitlesFromScript } from "@/lib/news/shorts/subtitles";
import type { NewsShortCard } from "@/lib/news/shorts/types";
import { buildVoiceStreamPath } from "@/lib/news/shorts/voice";
import type { GeneratedArticleRow } from "@/lib/types/newsroom";

export function buildNewsShortsFromPool(
  rows: GeneratedArticleRow[],
  limit = 6
): NewsShortCard[] {
  const candidates = [...rows]
    .filter((r) => (r.summary?.length ?? 0) > 40)
    .sort(
      (a, b) =>
        new Date(b.published_at ?? b.created_at).getTime() -
        new Date(a.published_at ?? a.created_at).getTime()
    )
    .slice(0, limit * 2);

  const cards: NewsShortCard[] = [];

  for (const row of candidates) {
    let card = shortCardFromRow(row);
    if (!card) card = buildMinimalShortCard(row);
    if (card) cards.push(card);
    if (cards.length >= limit) break;
  }

  return cards;
}

function buildMinimalShortCard(row: GeneratedArticleRow): NewsShortCard | null {
  const summary = row.summary?.trim();
  if (!summary) return null;

  const section = inferSection(row);
  const language = normalizeArticleLanguage(row.language);
  const script = `${row.headline}. ${summary}`.slice(0, 600);
  const subtitles = generateSubtitlesFromScript(script, 58);
  const imageUrl = row.hero_image_url ?? "";
  const highlights = script
    .split(/(?<=[.!?।])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 8)
    .slice(0, 3);

  return {
    articleId: row.id,
    slug: row.slug,
    headline: row.headline,
    summary60s: summary.slice(0, 280),
    anchorLine: buildAnchorLine(section, language, row.headline),
    imageUrl,
    section,
    styleId: getShortStyle(section).id,
    durationSec: 58,
    highlights,
    hasVoice: false,
    voiceStreamPath: buildVoiceStreamPath(row.slug),
    publishedAt: row.published_at ?? row.created_at,
    language,
    subtitles,
    reelSlides: buildReelSlides({
      headline: row.headline,
      highlights: highlights.length ? highlights : [summary.slice(0, 80)],
      imageUrl,
      subtitles,
      durationSec: 58,
    }),
  };
}
