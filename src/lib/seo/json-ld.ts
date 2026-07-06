/**
 * schema.org JSON-LD — NewsArticle, CollectionPage, Google News fields
 */

import type { Article } from "@/lib/articles";
import { BRAND } from "@/lib/brand";
import { breadcrumbListJsonLd, type BreadcrumbItem } from "@/lib/seo/breadcrumbs";
import { resolveNewsArticleModifiedAt } from "@/lib/seo/article-dates";
import {
  PUBLISHER_LOGO_URL,
  SITE_NAME,
  SITE_URL,
} from "@/lib/seo/constants";
import type { CategorySeoConfig } from "@/lib/seo/categories";
import type { NewsArticleRow } from "@/lib/types/news-article";

export function organizationJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "NewsMediaOrganization",
    name: SITE_NAME,
    alternateName: BRAND.nameHi,
    description: BRAND.taglineEn,
    url: SITE_URL,
    logo: {
      "@type": "ImageObject",
      url: PUBLISHER_LOGO_URL,
    },
    foundingDate: String(BRAND.founded),
    areaServed: {
      "@type": "State",
      name: "Chhattisgarh",
      containedInPlace: { "@type": "Country", name: "India" },
    },
    publishingPrinciples: `${SITE_URL}/archive`,
    sameAs: [SITE_URL],
  };
}

export function websiteJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE_NAME,
    alternateName: BRAND.nameHi,
    url: SITE_URL,
    description: BRAND.taglineEn,
    inLanguage: ["hi-IN", "en-IN"],
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${SITE_URL}/search?q={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
    publisher: {
      "@type": "NewsMediaOrganization",
      name: SITE_NAME,
      url: SITE_URL,
      logo: PUBLISHER_LOGO_URL,
    },
  };
}

export function webPageJsonLd(title: string, description: string, path: string) {
  return {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: title,
    description,
    url: `${SITE_URL}${path}`,
    isPartOf: { "@type": "WebSite", name: SITE_NAME, url: SITE_URL },
  };
}

export function collectionPageJsonLd(input: {
  name: string;
  description: string;
  path: string;
  items: Array<{ url: string; name: string }>;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: input.name,
    description: input.description,
    url: `${SITE_URL}${input.path}`,
    isPartOf: { "@type": "WebSite", name: SITE_NAME, url: SITE_URL },
    mainEntity: {
      "@type": "ItemList",
      itemListElement: input.items.slice(0, 20).map((item, i) => ({
        "@type": "ListItem",
        position: i + 1,
        url: item.url.startsWith("http") ? item.url : `${SITE_URL}${item.url}`,
        name: item.name,
      })),
    },
  };
}

export function categoryHubJsonLd(
  config: CategorySeoConfig,
  articles: Array<{ slug: string; headline: string }>
) {
  return collectionPageJsonLd({
    name: config.titleEn,
    description: config.descriptionEn,
    path: config.path,
    items: articles.map((a) => ({
      url: `/story/${a.slug}`,
      name: a.headline,
    })),
  });
}

export function homepageJsonLd(input: {
  storyCount: number;
  trendingKeywords: string[];
}) {
  return {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: `${SITE_NAME} — Chhattisgarh News`,
    description: BRAND.taglineEn,
    url: SITE_URL,
    inLanguage: ["hi-IN", "en-IN"],
    keywords: input.trendingKeywords.join(", "),
    numberOfItems: input.storyCount,
    publisher: {
      "@type": "NewsMediaOrganization",
      name: SITE_NAME,
      url: SITE_URL,
    },
  };
}

export function articleJsonLd(article: Article) {
  const url = `${SITE_URL}/story/${article.slug}`;
  return {
    "@context": "https://schema.org",
    "@type": "NewsArticle",
    headline: article.title,
    alternativeHeadline: article.titleHi,
    description: article.deck,
    image: article.image,
    datePublished: new Date().toISOString(),
    author: {
      "@type": "Person",
      name: article.author,
      jobTitle: article.role,
    },
    publisher: publisherBlock(),
    articleSection: article.category,
    inLanguage: ["hi", "en"],
    mainEntityOfPage: { "@type": "WebPage", "@id": url },
    url,
    isAccessibleForFree: true,
  };
}

function publisherBlock() {
  return {
    "@type": "NewsMediaOrganization",
    name: SITE_NAME,
    url: SITE_URL,
    logo: {
      "@type": "ImageObject",
      url: PUBLISHER_LOGO_URL,
      width: 512,
      height: 512,
    },
  };
}

export type LiveNewsArticleJsonLdInput = {
  article: NewsArticleRow;
  url: string;
  headline: string;
  description: string | null;
  image: string;
  breadcrumbs: BreadcrumbItem[];
  keywords: string[];
  isLive: boolean;
  wordCount?: number;
};

export function liveNewsArticleJsonLd(input: LiveNewsArticleJsonLdInput) {
  const { article } = input;
  const langMap: Record<string, string> = {
    en: "en-IN",
    hi: "hi-IN",
    cg: "hi-IN",
    mr: "mr-IN",
    bn: "bn-IN",
    ta: "ta-IN",
  };
  const lang = langMap[article.language ?? "hi"] ?? "hi-IN";

  const newsArticle = {
    "@context": "https://schema.org",
    "@type": "NewsArticle",
    "@id": input.url,
    headline: input.headline,
    alternativeHeadline:
      article.ai_headline && article.ai_headline !== input.headline
        ? article.title
        : undefined,
    description: input.description ?? undefined,
    image: {
      "@type": "ImageObject",
      url: input.image,
      width: 1200,
      height: 630,
    },
    thumbnailUrl: input.image,
    datePublished: article.published_at ?? article.created_at,
    dateModified: resolveNewsArticleModifiedAt(article) ?? undefined,
    author: {
      "@type": "Organization",
      name: article.author?.trim() || SITE_NAME,
    },
    publisher: publisherBlock(),
    articleSection: article.category,
    keywords: input.keywords.join(", "),
    inLanguage: lang,
    mainEntityOfPage: { "@type": "WebPage", "@id": input.url },
    url: input.url,
    isAccessibleForFree: true,
    ...(input.wordCount && input.wordCount > 80
      ? { wordCount: input.wordCount }
      : {}),
    speakable: {
      "@type": "SpeakableSpecification",
      cssSelector: [
        ".story-headline",
        ".immersive-story__headline",
        ".immersive-summary__text",
      ],
    },
    ...(input.isLive ? { genre: "LiveBreakingNews" } : {}),
  };

  return [newsArticle, breadcrumbListJsonLd(input.breadcrumbs)];
}

export function jsonLdScriptPayload(data: unknown | unknown[]): string {
  return JSON.stringify(Array.isArray(data) ? data : data);
}
