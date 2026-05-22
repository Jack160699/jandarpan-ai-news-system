import type { Metadata } from "next";
import type { Article } from "@/lib/articles";
import { BRAND } from "@/lib/brand";

/** Production deploy — override via NEXT_PUBLIC_SITE_URL */
export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://newspaper-motion.vercel.app";

/** Regional + brand keywords for layout defaults */
export const REGIONAL_KEYWORDS = [
  BRAND.nameEn,
  "Chhattisgarh news",
  "Raipur news",
  "Bastar news",
  "Bilaspur news",
  "Durg news",
  "CG news Hindi",
  "छत्तीसगढ़ समाचार",
  "regional news India",
  "live news Chhattisgarh",
];

/** Default robots for public pages (homepage, archive, live stories) */
export const PRODUCTION_ROBOTS: NonNullable<Metadata["robots"]> = {
  index: true,
  follow: true,
  googleBot: {
    index: true,
    follow: true,
    "max-video-preview": -1,
    "max-image-preview": "large",
    "max-snippet": -1,
  },
};

/** Admin, API, legacy redirects, concept-only editorial */
export const NOINDEX_ROBOTS: NonNullable<Metadata["robots"]> = {
  index: false,
  follow: false,
  googleBot: { index: false, follow: false },
};

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

export function websiteJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: BRAND.nameEn,
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
      name: BRAND.nameEn,
      url: SITE_URL,
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
    isPartOf: { "@type": "WebSite", name: BRAND.nameEn, url: SITE_URL },
  };
}
