/**
 * Build complete news short bundle from generated article
 */

import { createAdminServerClient } from "@/lib/supabase";
import { inferSection } from "@/lib/homepage/infer-section";
import { normalizeArticleLanguage } from "@/lib/i18n/languages";
import { buildAnchorLine } from "@/lib/news/shorts/anchor";
import { logShortsAnalytics } from "@/lib/news/shorts/analytics";
import { buildReelSlides } from "@/lib/news/shorts/reels";
import { generate60SecondSummary } from "@/lib/news/shorts/summarize";
import { getShortStyle } from "@/lib/news/shorts/styles";
import { generateSubtitlesFromScript } from "@/lib/news/shorts/subtitles";
import type { NewsShortBundle, NewsShortCard } from "@/lib/news/shorts/types";
import { buildVoiceMeta } from "@/lib/news/shorts/voice";
import type { GeneratedArticleRow } from "@/lib/types/newsroom";

export function bundleFromRow(row: GeneratedArticleRow): NewsShortBundle | null {
  const raw = row.shorts_metadata as NewsShortBundle | undefined;
  if (raw?.version === 1 && raw.status === "ready") return raw;
  const meta = row.editorial_metadata?.shorts as NewsShortBundle | undefined;
  if (meta?.version === 1 && meta.status === "ready") return meta;
  return null;
}

export function shortCardFromRow(row: GeneratedArticleRow): NewsShortCard | null {
  const bundle = bundleFromRow(row);
  if (!bundle) return null;

  return {
    articleId: row.id,
    slug: row.slug,
    headline: row.headline,
    summary60s: bundle.summary60s,
    anchorLine: bundle.anchorLine,
    imageUrl: row.hero_image_url ?? "",
    section: bundle.section,
    styleId: bundle.styleId,
    durationSec: bundle.durationSec,
    highlights: bundle.highlights,
    hasVoice: bundle.voice.status === "ready",
    voiceStreamPath: bundle.voice.streamPath,
    publishedAt: row.published_at ?? row.created_at,
    language: bundle.language,
    subtitles: bundle.subtitles,
    reelSlides: bundle.reel.slides,
  };
}

export async function buildNewsShortForArticle(
  row: GeneratedArticleRow,
  options?: { skipLlm?: boolean }
): Promise<NewsShortBundle> {
  const section = inferSection(row);
  const language = normalizeArticleLanguage(row.language);
  const style = getShortStyle(section);

  const summaryResult = options?.skipLlm
    ? null
    : await generate60SecondSummary({
        headline: row.headline,
        summary: row.summary ?? "",
        articleBody: row.article_body,
        section,
        language,
      });

  const fallbackSummary = row.summary?.trim() || row.headline;
  const summary60s = summaryResult?.summary60s ?? fallbackSummary.slice(0, 320);
  const script =
    summaryResult?.script ??
    `${row.headline}. ${fallbackSummary}`.slice(0, 700);
  const durationSec = summaryResult?.durationSec ?? 58;
  const highlights =
    summaryResult?.highlights ??
    script
      .split(/(?<=[.!?।])\s+/)
      .map((s) => s.trim())
      .filter((s) => s.length > 8)
      .slice(0, 4);

  const anchorLine = buildAnchorLine(section, language, row.headline);
  const subtitles = generateSubtitlesFromScript(script, durationSec);
  const imageUrl = row.hero_image_url ?? "";
  const reelSlides = buildReelSlides({
    headline: row.headline,
    highlights,
    imageUrl,
    subtitles,
    durationSec,
  });

  const bundle: NewsShortBundle = {
    version: 1,
    status: "ready",
    durationSec,
    summary60s,
    anchorLine,
    script,
    highlights,
    subtitles,
    reel: { aspect: "9:16", slides: reelSlides },
    voice: buildVoiceMeta(row.slug, language, durationSec, "pending"),
    styleId: style.id,
    section,
    language,
    generatedAt: new Date().toISOString(),
    model: process.env.NEWSROOM_SHORTS_MODEL?.trim() || "gpt-4o-mini",
  };

  await persistShortBundle(row.id, bundle, row.editorial_metadata);

  logShortsAnalytics({
    event: "short_built",
    articleId: row.id,
    slug: row.slug,
    section,
    language,
    durationSec,
    subtitleCount: subtitles.length,
    slideCount: reelSlides.length,
  });

  return bundle;
}

async function persistShortBundle(
  articleId: string,
  bundle: NewsShortBundle,
  editorial_metadata: GeneratedArticleRow["editorial_metadata"]
): Promise<void> {
  const supabase = createAdminServerClient();
  await supabase
    .from("generated_articles")
    .update({
      shorts_metadata: bundle,
      editorial_metadata: {
        ...editorial_metadata,
        shorts: bundle,
      },
    })
    .eq("id", articleId);
}

export async function fetchShortsPool(limit = 40): Promise<NewsShortCard[]> {
  const supabase = createAdminServerClient();
  const { data, error } = await supabase
    .from("generated_articles")
    .select(
      "id,slug,headline,summary,hero_image_url,language,tags,published_at,created_at,editorial_status,shorts_metadata,editorial_metadata"
    )
    .order("published_at", { ascending: false, nullsFirst: false })
    .limit(limit * 3);

  if (error || !data?.length) return [];

  const cards: NewsShortCard[] = [];
  for (const row of data) {
    const status = row.editorial_status ?? "approved";
    if (status === "rejected" || status === "pending") continue;
    if (!row.published_at && !row.summary) continue;

    const full = row as GeneratedArticleRow;
    let card = shortCardFromRow(full);
    if (!card && full.summary) {
      const bundle = await buildNewsShortForArticle(full, {
        skipLlm: !process.env.OPENAI_API_KEY?.trim(),
      });
      full.shorts_metadata = bundle;
      card = shortCardFromRow(full);
    }
    if (card) cards.push(card);
    if (cards.length >= limit) break;
  }

  return cards;
}
