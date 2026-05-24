/**
 * Enrich news short cards from generated_articles row metadata
 */

import { inferSection, REGIONAL_SECTIONS } from "@/lib/homepage/infer-section";
import { normalizeArticleLanguage } from "@/lib/i18n/languages";
import { pickBilingualLabel } from "@/lib/i18n/pick-label";
import { getShortStyle } from "@/lib/news/shorts/styles";
import type { NewsShortCard } from "@/lib/news/shorts/types";
import type { GeneratedArticleRow } from "@/lib/types/newsroom";

const LIVE_WINDOW_HOURS = 6;

function hoursSince(iso: string | null): number {
  if (!iso) return 999;
  return (Date.now() - new Date(iso).getTime()) / (1000 * 60 * 60);
}

function extractVideoUrl(row: GeneratedArticleRow): string | null {
  const meta = row.editorial_metadata as Record<string, unknown> | undefined;
  const candidates = [
    meta?.video_url,
    meta?.hero_video_url,
    meta?.short_video_url,
    (row.shorts_metadata as { videoUrl?: string } | undefined)?.videoUrl,
  ];
  for (const c of candidates) {
    if (typeof c === "string" && c.trim().length > 4) return c.trim();
  }
  return null;
}

function extractSourceLabel(row: GeneratedArticleRow): string {
  const meta = row.editorial_metadata ?? {};
  const attribution = meta.source_attribution;
  if (Array.isArray(attribution) && attribution[0]?.source) {
    return String(attribution[0].source).slice(0, 48);
  }
  const extra = meta as Record<string, unknown>;
  const provider = extra.provider;
  if (typeof provider === "string" && provider) {
    return provider.replace(/_/g, " ");
  }
  return "जन दर्पण डेस्क";
}

function detectLive(row: GeneratedArticleRow): boolean {
  const published = row.published_at ?? row.created_at;
  if (hoursSince(published) > LIVE_WINDOW_HOURS) return false;
  const tags = (row.tags ?? []).join(" ");
  if (/\blive\b|breaking|ताज़ा|लाइव/i.test(tags)) return true;
  const meta = row.editorial_metadata as Record<string, unknown> | undefined;
  if (meta?.desk === "breaking" || meta?.is_live === true) return true;
  return false;
}

/** Apply row-level fields used by reel UI (category, source, live, video). */
export function enrichShortCard(
  card: NewsShortCard,
  row: GeneratedArticleRow
): NewsShortCard {
  const section = card.section ?? inferSection(row);
  const sectionDef = REGIONAL_SECTIONS.find((s) => s.id === section);
  const style = getShortStyle(section);
  const lang = normalizeArticleLanguage(card.language ?? row.language);
  const categoryLabel = sectionDef
    ? pickBilingualLabel(lang, sectionDef.label, sectionDef.labelHi)
    : pickBilingualLabel(lang, style.badge, style.badgeHi);

  return {
    ...card,
    section,
    categoryLabel,
    sourceLabel: extractSourceLabel(row),
    isLive: detectLive(row),
    videoUrl: extractVideoUrl(row),
    sourceCount: Math.max(
      1,
      row.editorial_metadata?.source_count ??
        row.editorial_metadata?.source_attribution?.length ??
        1
    ),
  };
}
