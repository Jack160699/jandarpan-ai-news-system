/**
 * Fast, consistent Next.js Metadata builders — canonical, OG, hreflang
 */

import type { Metadata } from "next";
import { BRAND } from "@/lib/brand";
import { JAN_DARPAN_BRAND_ASSETS } from "@/lib/brand/assets";
import {
  NOINDEX_FOLLOW_ROBOTS,
  PRODUCTION_ROBOTS,
  REGIONAL_KEYWORDS,
  SITE_NAME,
  SITE_URL,
} from "@/lib/seo/constants";

/** Default OG image for editorial hub pages */
export const DEFAULT_HUB_OG_IMAGE = JAN_DARPAN_BRAND_ASSETS.og;

export type PageMetadataInput = {
  title: string;
  description: string;
  path: string;
  keywords?: string[];
  locale?: string;
  alternateLocales?: string[];
  ogImage?: string | null;
  ogType?: "website" | "article";
  publishedTime?: string | null;
  modifiedTime?: string | null;
  section?: string;
  noindex?: boolean;
  /** Per-locale absolute or site-relative URLs — e.g. story pages with ?lang= */
  languageUrls?: Record<string, string>;
  /** Article-only — Google News discovery */
  newsKeywords?: string[];
};

function absoluteUrl(path: string): string {
  if (path.startsWith("http")) return path;
  return `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}

function buildOgImages(
  url: string | null | undefined,
  alt: string
): NonNullable<Metadata["openGraph"]>["images"] {
  if (!url?.trim()) return undefined;
  const abs = url.startsWith("http") ? url : absoluteUrl(url);
  return [{ url: abs, width: 1200, height: 630, alt }];
}

/**
 * Primary metadata factory — used by story, category, and static pages.
 */
export function buildPageMetadata(input: PageMetadataInput): Metadata {
  const canonicalPath = input.path.startsWith("/") ? input.path : `/${input.path}`;
  const url = absoluteUrl(canonicalPath);
  const locale = input.locale ?? "hi_IN";
  const altLocales = input.alternateLocales ?? ["hi_IN", "en_IN"];

  const languages: Record<string, string> = {};
  if (input.languageUrls && Object.keys(input.languageUrls).length > 0) {
    for (const [lang, langPath] of Object.entries(input.languageUrls)) {
      languages[lang] = absoluteUrl(langPath);
    }
    languages["x-default"] = url;
  } else {
    languages["x-default"] = url;
  }

  const metadata: Metadata = {
    title: input.title,
    description: input.description,
    keywords: [...new Set([...(input.keywords ?? []), ...REGIONAL_KEYWORDS.slice(0, 6)])],
    alternates: {
      canonical: url,
      languages,
    },
    robots: input.noindex ? { index: false, follow: false } : PRODUCTION_ROBOTS,
    openGraph: {
      title: input.title,
      description: input.description,
      type: input.ogType ?? "website",
      url,
      locale,
      alternateLocale: altLocales.filter((l) => l !== locale),
      siteName: SITE_NAME,
      publishedTime: input.publishedTime ?? undefined,
      modifiedTime: input.modifiedTime ?? undefined,
      section: input.section,
      images: buildOgImages(input.ogImage, input.title),
    },
    twitter: {
      card: "summary_large_image",
      title: input.title,
      description: input.description,
      images: input.ogImage ? [absoluteUrl(input.ogImage)] : undefined,
    },
    other: input.newsKeywords?.length
      ? { "news_keywords": input.newsKeywords.join(", ") }
      : undefined,
  };

  return metadata;
}

/**
 * Reader utility / auth pages — crawlable but not indexed (noindex,follow).
 * Canonical is always the clean path without transient query params.
 */
export function buildUtilityPageMetadata(input: {
  title: string;
  description: string;
  path: string;
}): Metadata {
  const canonicalPath = input.path.startsWith("/") ? input.path : `/${input.path}`;
  const url = absoluteUrl(canonicalPath);

  return {
    title: input.title,
    description: input.description,
    alternates: { canonical: url },
    robots: NOINDEX_FOLLOW_ROBOTS,
    openGraph: {
      title: input.title,
      description: input.description,
      type: "website",
      url,
      siteName: SITE_NAME,
    },
    twitter: {
      card: "summary",
      title: input.title,
      description: input.description,
    },
  };
}

export function buildHomeMetadata(): Metadata {
  return buildPageMetadata({
    title: `${BRAND.nameEn} — Chhattisgarh News`,
    description:
      "Premium regional news from Chhattisgarh — calm, fast, and trustworthy. AI-edited stories from Raipur, Bastar, Bilaspur, and across the state.",
    path: "/",
    keywords: REGIONAL_KEYWORDS,
    locale: "hi_IN",
    ogType: "website",
  });
}

export function buildCategoryMetadata(input: {
  titleEn: string;
  descriptionEn: string;
  path: string;
  keywords: string[];
  ogImage?: string;
}): Metadata {
  return buildHubPageMetadata({
    title: `${input.titleEn} · ${BRAND.nameEn}`,
    description: input.descriptionEn,
    path: input.path,
    keywords: input.keywords,
    locale: "hi_IN",
    ogImage: input.ogImage,
  });
}

/**
 * Editorial hub pages — canonical, OG/Twitter, x-default hreflang, default hub OG image.
 */
export function buildHubPageMetadata(
  input: Omit<PageMetadataInput, "noindex" | "ogType">
): Metadata {
  return buildPageMetadata({
    ...input,
    ogImage: input.ogImage ?? DEFAULT_HUB_OG_IMAGE,
    ogType: "website",
  });
}
