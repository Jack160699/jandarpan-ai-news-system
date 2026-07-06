/**
 * Build complete news short bundle from generated article
 */

import { createAdminServerClient } from "@/lib/supabase";
import { inferSection } from "@/lib/homepage/infer-section";
import { isArticleAvailableInLanguage } from "@/lib/i18n/article-language";
import { normalizeArticleLanguage, type NewsroomLanguage } from "@/lib/i18n/languages";
import { resolveLocalizedFieldsStrict } from "@/lib/i18n/resolve-article";
import { pickBilingualLabel } from "@/lib/i18n/pick-label";
import { buildAnchorLine } from "@/lib/news/shorts/anchor";
import { logShortsAnalytics } from "@/lib/news/shorts/analytics";
import { buildReelSlides } from "@/lib/news/shorts/reels";
import { generate60SecondSummary } from "@/lib/news/shorts/summarize";
import { getShortStyle } from "@/lib/news/shorts/styles";
import { generateSubtitlesFromScript } from "@/lib/news/shorts/subtitles";
import type { NewsShortBundle, NewsShortCard } from "@/lib/news/shorts/types";
import { enrichShortCard } from "@/lib/news/shorts/enrich";
import { ensureShortCard } from "@/lib/news/shorts/ensure-card";
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

  const style = getShortStyle(bundle.section);
  const rowLang = normalizeArticleLanguage(row.language);
  const bundleLang = normalizeArticleLanguage(bundle.language ?? row.language);
  const lang = rowLang;
  const useLocalizedCopy = rowLang !== bundleLang;
  const summary = row.summary?.trim() ?? "";
  const summary60s =
    useLocalizedCopy && summary ? summary.slice(0, 320) : bundle.summary60s;
  const highlights =
    useLocalizedCopy && summary
      ? summary
          .split(/(?<=[.!?।])\s+/)
          .map((s) => s.trim())
          .filter((s) => s.length > 8)
          .slice(0, 4)
      : bundle.highlights;
  const imageUrl = row.hero_image_url ?? "";
  const anchorLine = useLocalizedCopy
    ? buildAnchorLine(bundle.section, lang, row.headline)
    : bundle.anchorLine;
  const reelSlides =
    useLocalizedCopy && summary
      ? buildReelSlides({
          headline: row.headline,
          highlights: highlights.length ? highlights : [summary.slice(0, 80)],
          imageUrl,
          subtitles: bundle.subtitles,
          durationSec: bundle.durationSec,
        })
      : bundle.reel.slides;

  const base: NewsShortCard = {
    articleId: row.id,
    slug: row.slug,
    headline: row.headline,
    summary60s,
    anchorLine,
    imageUrl,
    videoUrl: null,
    section: bundle.section,
    styleId: bundle.styleId,
    durationSec: bundle.durationSec,
    highlights,
    hasVoice: bundle.voice.status === "ready",
    voiceStreamPath: bundle.voice.streamPath,
    publishedAt: row.published_at ?? row.created_at,
    language: lang,
    subtitles: bundle.subtitles,
    reelSlides,
    categoryLabel: pickBilingualLabel(lang, style.badge, style.badgeHi),
    sourceLabel: pickBilingualLabel(lang, "Jan Darpan Desk", "जन दर्पण डेस्क"),
    sourceCount: 1,
    isLive: false,
  };

  return enrichShortCard(base, row);
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

function localizeShortRow(
  row: GeneratedArticleRow,
  displayLanguage: NewsroomLanguage
): GeneratedArticleRow | null {
  if (!isArticleAvailableInLanguage(row, displayLanguage)) return null;
  const fields = resolveLocalizedFieldsStrict(row, displayLanguage);
  if (!fields?.headline?.trim()) return null;
  return {
    ...row,
    headline: fields.headline,
    summary: fields.summary,
    language: fields.language,
  };
}

export async function fetchShortsPool(
  limit = 40,
  displayLanguage?: NewsroomLanguage,
  options?: {
    preferredArticleIds?: string[];
    reservedIds?: Set<string>;
    maxHomepageOverlap?: number;
  }
): Promise<NewsShortCard[]> {
  const supabase = createAdminServerClient();
  const { data, error } = await supabase
    .from("generated_articles")
    .select(
      "id,slug,headline,summary,hero_image_url,language,tags,published_at,created_at,editorial_status,shorts_metadata,editorial_metadata"
    )
    .order("published_at", { ascending: false, nullsFirst: false })
    .limit(limit * 3);

  if (error || !data?.length) return [];

  const reserved = options?.reservedIds ?? new Set<string>();
  const maxOverlap = options?.maxHomepageOverlap ?? 2;
  const preferred = options?.preferredArticleIds ?? [];
  let overlap = 0;

  const byId = new Map(data.map((row) => [row.id, row]));
  const cards: NewsShortCard[] = [];

  const tryAdd = (row: (typeof data)[number]) => {
    const status = row.editorial_status ?? "approved";
    if (status === "rejected" || status === "pending") return;

    if (reserved.has(row.id)) {
      if (overlap >= maxOverlap) return;
      overlap++;
    }

    let full = row as unknown as GeneratedArticleRow;
    if (displayLanguage) {
      const localized = localizeShortRow(full, displayLanguage);
      if (!localized) return;
      full = localized;
    }

    const card = ensureShortCard(full);
    if (card) cards.push(card);
  };

  for (const id of preferred) {
    if (cards.length >= limit) break;
    const row = byId.get(id);
    if (row) tryAdd(row);
  }

  for (const row of data) {
    if (cards.length >= limit) break;
    if (cards.some((c) => c.articleId === row.id)) continue;
    tryAdd(row);
  }

  return cards.slice(0, limit);
}
