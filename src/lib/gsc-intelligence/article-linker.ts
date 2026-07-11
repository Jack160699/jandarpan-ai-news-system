/**
 * Article linker — read-only mapping from GSC URLs/queries to generated articles
 */

import { createAdminServerClient, isSupabaseConfigured } from "@/lib/supabase";
import { PUBLIC_EDITORIAL_STATUSES } from "@/lib/newsroom/publish-state";
import { SITE_URL } from "@/lib/seo/constants";
import { detectDistrictInText } from "@/lib/seo-intelligence/text-utils";
import type { ArticleLinkHint } from "@/lib/gsc-intelligence/types";

const CATEGORY_KEYWORDS: Record<string, string[]> = {
  politics: ["politics", "rajneeti", "राजनीति", "चुनाव", "election"],
  crime: ["crime", "अपराध", "पुलिस", "murder", "हत्या"],
  weather: ["weather", "मौसम", "बारिश", "rain"],
  sports: ["sports", "खेल", "cricket", "क्रिकेट"],
  business: ["business", "व्यापार", "economy", "अर्थव्यवस्था"],
  education: ["education", "शिक्षा", "exam", "परीक्षा"],
  jobs: ["jobs", "नौकरी", "vacancy", "भर्ती"],
  entertainment: ["bollywood", "entertainment", "बॉलीवुड", "फिल्म"],
};

export function extractSlugFromPageUrl(pageUrl: string): string | null {
  try {
    const url = new URL(pageUrl);
    const parts = url.pathname.split("/").filter(Boolean);
    if (parts.length === 0) return null;
    return parts[parts.length - 1] ?? null;
  } catch {
    const match = pageUrl.match(/\/([a-z0-9-]+)\/?$/i);
    return match?.[1] ?? null;
  }
}

export function detectCategoryInText(text: string): string | null {
  const lower = text.toLowerCase();
  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    if (keywords.some((k) => lower.includes(k.toLowerCase()))) return category;
  }
  return null;
}

export async function loadArticleLinkHints(): Promise<ArticleLinkHint[]> {
  if (!isSupabaseConfigured()) return [];

  const { data, error } = await createAdminServerClient()
    .from("generated_articles")
    .select("id, slug, headline, tags, geo_metadata, published_at")
    .in("editorial_status", PUBLIC_EDITORIAL_STATUSES)
    .not("published_at", "is", null)
    .order("published_at", { ascending: false })
    .limit(1000);

  if (error || !data) return [];

  return data.map((row) => {
    const r = row as Record<string, unknown>;
    const geo = (r.geo_metadata as Record<string, unknown> | null) ?? {};
    const tags = Array.isArray(r.tags) ? (r.tags as string[]) : [];
    const slug = String(r.slug);
    const district =
      (geo.primary_district as string | undefined) ??
      detectDistrictInText(String(r.headline ?? ""));

    return {
      id: String(r.id),
      slug,
      headline: String(r.headline),
      tags,
      district: district ?? null,
      url: `${SITE_URL}/news/${slug}`,
    };
  });
}

export function linkQueryToArticle(
  query: string,
  articles: ArticleLinkHint[]
): Partial<ArticleLinkHint> & { topic: string | null; category: string | null; district: string | null } {
  const district = detectDistrictInText(query);
  const category = detectCategoryInText(query);
  const topic = query.trim().slice(0, 120);

  const lowerQuery = query.toLowerCase();
  const matched = articles.find((a) => {
    const headline = a.headline.toLowerCase();
    return (
      lowerQuery.split(/\s+/).filter((w) => w.length > 3).some((w) => headline.includes(w)) ||
      (district && a.district === district)
    );
  });

  return {
    topic,
    category: category ?? matched?.tags[0] ?? null,
    district,
    id: matched?.id,
    slug: matched?.slug,
    url: matched?.url,
  };
}

export function linkPageToArticle(
  pageUrl: string,
  articles: ArticleLinkHint[]
): Partial<ArticleLinkHint> {
  const slug = extractSlugFromPageUrl(pageUrl);
  if (!slug) return {};

  const exact = articles.find((a) => a.slug === slug);
  if (exact) return exact;

  const partial = articles.find((a) => pageUrl.includes(a.slug));
  return partial ?? {};
}
