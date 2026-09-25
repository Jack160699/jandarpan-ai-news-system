import type { HomeArticle } from "@/lib/homepage/types";
import { resolveCanonicalStoryDistrict } from "@/lib/regional/canonical-district";
import { hasVerifiedRealMedia, extractVerifiedRealMediaUrl } from "@/lib/news/images/validate";

export type ReaderStory = {
  slug: string;
  headline: string;
  kicker?: string;
  summary?: string;
  imageUrl?: string | null;
  publishedAt?: string;
  timeLabel?: string;
  isLive?: boolean;
  viewCountLabel?: string;
  growthLabel?: string;
  category?: string | null;
  section?: string | null;
  tags?: string[];
};

export function toReaderStory(a: HomeArticle, kicker?: string): ReaderStory {
  const canonical = resolveCanonicalStoryDistrict({
    explicitDistrict: a.districtSlug || a.district,
    tags: a.tags,
    headline: a.headline,
    summary: a.summary,
    section: a.section,
    categoryLabel: a.categoryLabel,
  });

  const resolvedKicker =
    kicker ??
    (canonical.nameHi ||
      (canonical.isStatewide
        ? "राज्य डेस्क"
        : (a.categoryLabel || "राज्य डेस्क")));

  const candidateImg = extractVerifiedRealMediaUrl(a) || a.imageUrl || a.ogImageUrl || null;
  const safeImageUrl = hasVerifiedRealMedia(candidateImg) ? candidateImg : null;

  return {
    slug: a.slug,
    headline: a.headline,
    kicker: resolvedKicker,
    summary: a.summary,
    imageUrl: safeImageUrl,
    publishedAt: a.publishedAt,
    isLive: a.isLive,
    category: (a as { category?: string }).category || a.categoryLabel || null,
    section: a.section || null,
    tags: a.tags || [],
  };
}

/** Hindi relative time ("12 मिनट पहले" / "3 घंटे पहले" / "2 दिन पहले"). */
export function hindiRelativeTime(iso?: string): string {
  if (!iso) return "";
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "";
  const diffMs = Date.now() - then;
  const min = Math.round(diffMs / 60000);
  if (min < 1) return "अभी";
  if (min < 60) return `${min} मिनट पहले`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr} घंटे पहले`;
  const day = Math.round(hr / 24);
  if (day < 30) return `${day} दिन पहले`;
  const mon = Math.round(day / 30);
  return `${mon} माह पहले`;
}

/** Localized relative time for stories in Hindi and English */
export function formatStoryTime(iso?: string, locale: string = "hi"): string {
  if (!iso) return "";
  if (locale !== "en") return hindiRelativeTime(iso);
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "";
  const diffMs = Date.now() - then;
  const min = Math.round(diffMs / 60000);
  if (min < 1) return "Just now";
  if (min < 60) return `${min}m ago`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.round(hr / 24);
  if (day < 30) return `${day}d ago`;
  const mon = Math.round(day / 30);
  return `${mon}mo ago`;
}

/** Build a canonical story href. */
export function storyHref(slug: string): string {
  return `/story/${slug}`;
}

/** Compact Hindi view-count label from a numeric score (not fake live stats). */
export function formatViewLabel(score?: number): string | undefined {
  if (!score || score <= 0) return undefined;
  if (score >= 100000) return `${(score / 100000).toFixed(1).replace(/\.0$/, "")}L`;
  if (score >= 1000) return `${Math.round(score / 1000)}K`;
  return String(Math.round(score));
}
