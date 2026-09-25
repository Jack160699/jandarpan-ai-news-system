import type { Metadata } from "next";
import { PageShell } from "@/components/layout/PageShell";
import { JsonLdScript } from "@/components/seo/JsonLdScript";
import { isReaderDesignSystemEnabled } from "@/features/reader-ds/config";
import { LatestPageView } from "@/features/reader-ds/pages";
import { toHomeArticle } from "@/lib/homepage/generated-feed";
import { filterPoolByLanguage } from "@/lib/i18n/article-language";
import { getServerReaderLanguage } from "@/lib/i18n/server-language";
import { fetchGeneratedArticlePool } from "@/lib/newsroom/generated/read";
import {
  breadcrumbListJsonLd,
  buildHubPageMetadata,
  collectionPageJsonLd,
} from "@/lib/seo";
import { buildHomeBreadcrumb } from "@/lib/seo/breadcrumbs";
import { hasVerifiedRealMedia } from "@/lib/news/images/validate";

export const revalidate = 60;

const PATH = "/latest";

export const metadata: Metadata = buildHubPageMetadata({
  title: "Latest News · Jan Darpan",
  description: "Chronological latest news from India — ताज़ा ख़बरें.",
  path: PATH,
  keywords: ["latest news", "ताज़ा ख़बरें", "India", "भारत", "Jan Darpan"],
  locale: "hi_IN",
});

export default async function LatestPage() {
  const displayLanguage = await getServerReaderLanguage();
  const pool = await fetchGeneratedArticlePool(160, { select: "homepage" });
  const langPool = filterPoolByLanguage(pool, displayLanguage);

  const bySlug = new Map<string, (typeof langPool)[number]>();
  for (const r of langPool) {
    if (r?.slug && !bySlug.has(r.slug)) {
      bySlug.set(r.slug, r);
    }
  }

  // Authoritative publication timestamp: newest published article first
  const baseArticles = [...bySlug.values()]
    .map((r) => toHomeArticle(r, undefined, displayLanguage))
    .filter((a): a is NonNullable<typeof a> => a !== null && hasVerifiedRealMedia(a.imageUrl));

  const { getStaticFallbackArticlePool } = await import("@/lib/news/fallback/wire-articles");
  const fallback = getStaticFallbackArticlePool()
    .map((r) => toHomeArticle(r, undefined, displayLanguage))
    .filter((a): a is NonNullable<typeof a> => a !== null && hasVerifiedRealMedia(a.imageUrl));

  const seenSlugs = new Set(baseArticles.map((a) => a.slug));
  for (const a of fallback) {
    if (!seenSlugs.has(a.slug)) {
      seenSlugs.add(a.slug);
      baseArticles.push(a);
    }
  }

  const articles = baseArticles
    .sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime())
    .slice(0, 100);

  const jsonLd = [
    collectionPageJsonLd({
      name: "Latest News",
      description: "Chronological latest news from India.",
      path: PATH,
      items: articles.slice(0, 30).map((article) => ({
        url: `/story/${article.slug}`,
        name: article.headline,
      })),
    }),
    breadcrumbListJsonLd([buildHomeBreadcrumb(), { name: "Latest", href: PATH }]),
  ];

  if (isReaderDesignSystemEnabled()) {
    return (
      <>
        <JsonLdScript data={jsonLd} />
        <LatestPageView articles={articles} />
      </>
    );
  }

  return (
    <PageShell variant="news">
      <JsonLdScript data={jsonLd} />
      <main id="main-content" role="main" className="pl-container py-6">
        <h1 className="text-2xl font-serif font-bold">Latest News</h1>
        <ul className="mt-4 space-y-3">
          {articles.map((a) => (
            <li key={a.slug}>
              <a href={`/story/${a.slug}`} className="text-red-800 hover:underline">
                {a.headline}
              </a>
            </li>
          ))}
        </ul>
      </main>
    </PageShell>
  );
}
