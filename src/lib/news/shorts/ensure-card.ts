/**
 * Fast short card materialization without LLM (pool + feed paths)
 */

import { normalizeArticleLanguage } from "@/lib/i18n/languages";
import { inferSection } from "@/lib/homepage/infer-section";
import { buildAnchorLine } from "@/lib/news/shorts/anchor";
import { bundleFromRow, shortCardFromRow } from "@/lib/news/shorts/build-short";
import { enrichShortCard } from "@/lib/news/shorts/enrich";
import { buildReelSlides } from "@/lib/news/shorts/reels";
import { getShortStyle } from "@/lib/news/shorts/styles";
import { generateSubtitlesFromScript } from "@/lib/news/shorts/subtitles";
import type { NewsShortCard } from "@/lib/news/shorts/types";
import { buildVoiceStreamPath } from "@/lib/news/shorts/voice";
import type { GeneratedArticleRow } from "@/lib/types/newsroom";

/** Bundle-ready card, minimal fallback, or null if no summary. */
export function ensureShortCard(row: GeneratedArticleRow): NewsShortCard | null {
  const fromBundle = shortCardFromRow(row);
  if (fromBundle) return enrichShortCard(fromBundle, row);

  if (bundleFromRow(row)) return null;

  return buildMinimalShortCard(row);
}

export function buildMinimalShortCard(
  row: GeneratedArticleRow
): NewsShortCard | null {
  const summary = row.summary?.trim();
  if (!summary) return null;

  const section = inferSection(row);
  const language = normalizeArticleLanguage(row.language);
  const style = getShortStyle(section);
  const script = `${row.headline}. ${summary}`.slice(0, 600);
  const subtitles = generateSubtitlesFromScript(script, 58);
  const imageUrl = row.hero_image_url ?? "";
  const highlights = script
    .split(/(?<=[.!?।])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 8)
    .slice(0, 3);

  const card: NewsShortCard = {
    articleId: row.id,
    slug: row.slug,
    headline: row.headline,
    summary60s: summary.slice(0, 280),
    anchorLine: buildAnchorLine(section, language, row.headline),
    imageUrl,
    videoUrl: null,
    section,
    styleId: style.id,
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
    categoryLabel: style.badgeHi,
    sourceLabel: "जन दर्पण डेस्क",
    sourceCount: 1,
    isLive: false,
  };

  return enrichShortCard(card, row);
}
