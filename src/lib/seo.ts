import type { Article } from "@/lib/articles";
import { BRAND } from "@/lib/brand";

/** Set NEXT_PUBLIC_SITE_URL in production deploys */
export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://cgbhaskar-concept.example";

export function organizationJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "NewsMediaOrganization",
    name: BRAND.nameEn,
    alternateName: BRAND.nameHi,
    description: BRAND.taglineEn,
    url: SITE_URL,
    foundingDate: String(BRAND.founded),
    areaServed: {
      "@type": "State",
      name: "Chhattisgarh",
      containedInPlace: { "@type": "Country", name: "India" },
    },
    publishingPrinciples: `${SITE_URL}/archive`,
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
    publisher: {
      "@type": "NewsMediaOrganization",
      name: BRAND.nameEn,
      url: SITE_URL,
    },
    articleSection: article.category,
    inLanguage: ["hi", "en"],
    mainEntityOfPage: { "@type": "WebPage", "@id": url },
    url,
    isAccessibleForFree: true,
  };
}

export function webPageJsonLd(title: string, description: string, path: string) {
  return {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: title,
    description,
    url: `${SITE_URL}${path}`,
    isPartOf: { "@type": "WebSite", name: BRAND.nameEn, url: SITE_URL },
  };
}
