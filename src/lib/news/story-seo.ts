/**
 * Live story SEO — metadata + JSON-LD
 */

import type { Metadata } from "next";
import { isArticleLive } from "@/lib/news/home-ranking";
import { estimateReadTime } from "@/lib/news/story-utils";
import { resolveStorySlug } from "@/lib/news/related-stories";
import { resolveCardImage } from "@/lib/news/images/display";
import { BRAND } from "@/lib/brand";
import { PRODUCTION_ROBOTS, SITE_URL } from "@/lib/seo";
import type { NewsArticleRow } from "@/lib/types/news-article";

const CG_KEYWORDS = [
  "Chhattisgarh news",
  "Raipur news",
  "CG news Hindi",
  "छत्तीसगढ़ समाचार",
  "regional news India",
  "Bastar",
  "Bilaspur",
  "Durg",
];

export function liveStoryMetadata(article: NewsArticleRow): Metadata {
  const slug = resolveStorySlug(article);
  const url = `${SITE_URL}/story/${slug}`;
  const title = article.ai_headline?.trim() || article.title;
  const description =
    article.ai_summary?.trim() ||
    article.description?.trim() ||
    article.content?.slice(0, 160)?.trim() ||
    `${title} — ${BRAND.nameEn} live regional desk.`;

  const image = resolveCardImage(
    {
      imageUrl: article.image_url,
      category: article.category,
      source: article.source,
      articleUrl: article.article_url,
    },
    1200
  );

  const keywords = [
    article.category,
    article.region ?? "chhattisgarh",
    article.source ?? BRAND.nameEn,
    ...CG_KEYWORDS,
  ].filter(Boolean);

  return {
    title,
    description,
    keywords,
    alternates: { canonical: `/story/${slug}` },
    robots: PRODUCTION_ROBOTS,
    openGraph: {
      title,
      description,
      type: "article",
      url,
      locale: article.language === "hi" ? "hi_IN" : "en_IN",
      siteName: BRAND.nameEn,
      publishedTime: article.published_at ?? undefined,
      modifiedTime: article.updated_at,
      section: article.category,
      images: [
        {
          url: image,
          width: 1200,
          height: 630,
          alt: title,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [image],
    },
  };
}

export function liveStoryJsonLd(article: NewsArticleRow) {
  const slug = resolveStorySlug(article);
  const url = `${SITE_URL}/story/${slug}`;
  const image = resolveCardImage(
    {
      imageUrl: article.image_url,
      category: article.category,
      source: article.source,
      articleUrl: article.article_url,
    },
    1200
  );

  return {
    "@context": "https://schema.org",
    "@type": "NewsArticle",
    headline: article.title,
    alternativeHeadline: article.ai_headline ?? undefined,
    description: article.description ?? article.ai_summary ?? undefined,
    image: [image],
    datePublished: article.published_at ?? article.created_at,
    dateModified: article.updated_at,
    author: article.author
      ? { "@type": "Person", name: article.author }
      : { "@type": "Organization", name: article.source ?? BRAND.nameEn },
    publisher: {
      "@type": "NewsMediaOrganization",
      name: BRAND.nameEn,
      url: SITE_URL,
    },
    articleSection: article.category,
    inLanguage: article.language ?? "hi",
    mainEntityOfPage: { "@type": "WebPage", "@id": url },
    url,
    isAccessibleForFree: true,
    speakable: {
      "@type": "SpeakableSpecification",
      cssSelector: [".story-headline", ".story-deck"],
    },
    ...(isArticleLive(article.published_at)
      ? { genre: "LiveBreakingNews" }
      : {}),
  };
}
