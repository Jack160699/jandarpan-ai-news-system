import type { Metadata } from "next";
import { PageShell } from "@/components/layout/PageShell";
import { JsonLdScript } from "@/components/seo/JsonLdScript";
import { isReaderDesignSystemEnabled } from "@/features/reader-ds/config";
import { LatestPageView } from "@/features/reader-ds/pages";
import { getCachedGeneratedHomepageFeed } from "@/lib/homepage/cached-feed";
import { toHomeArticle } from "@/lib/homepage/generated-feed";
import { filterPoolByLanguage } from "@/lib/i18n/article-language";
import { getServerReaderLanguage } from "@/lib/i18n/server-language";
import { fetchGeneratedArticlePool } from "@/lib/newsroom/generated/read";
import { rankArticlesForHomepage } from "@/lib/news/ai/ranking";
import {
  breadcrumbListJsonLd,
  buildHubPageMetadata,
  collectionPageJsonLd,
} from "@/lib/seo";
import { buildHomeBreadcrumb } from "@/lib/seo/breadcrumbs";
import { Footer } from "@/sections/Footer";

export const revalidate = 60;

const PATH = "/latest";

export const metadata: Metadata = buildHubPageMetadata({
  title: "Latest News · Jan Darpan",
  description: "Chronological latest news from Chhattisgarh — ताज़ा ख़बरें.",
  path: PATH,
  keywords: ["latest news", "ताज़ा ख़बरें", "Chhattisgarh"],
  locale: "hi_IN",
});

export default async function LatestPage() {
  const displayLanguage = await getServerReaderLanguage();
  const pool = await fetchGeneratedArticlePool(80);
  const langPool = filterPoolByLanguage(pool, displayLanguage);
  const ranked = rankArticlesForHomepage(langPool);
  const fromPool = ranked
    .map((r) =>
      toHomeArticle(
        r.row,
        {
          priorityScore: r.ranking.priorityScore,
          reasons: r.ranking.reasons,
          isTrending: r.ranking.isTrending,
          isBreaking: r.ranking.isBreaking,
          duplicateClusterId: r.ranking.duplicateClusterId,
          section: r.section,
        },
        displayLanguage
      )
    )
    .filter((a): a is NonNullable<typeof a> => a !== null);

  const feed = await getCachedGeneratedHomepageFeed();
  const feedWire = feed
    ? [
        ...(feed.liveWire ?? []),
        ...(feed.trending ?? []),
        ...(feed.regionalHighlights ?? []),
        ...(feed.editorsPicks?.supporting ?? []),
        ...(feed.editorsPicks?.lead ? [feed.editorsPicks.lead] : []),
        ...(feed.breakingTicker ?? []),
      ]
    : [];
  const bySlug = new Map<string, (typeof fromPool)[number]>();
  // Prefer live feed slices first (pool can be empty in some local/dev caches).
  for (const a of [...feedWire, ...fromPool]) {
    if (a?.slug && !bySlug.has(a.slug)) bySlug.set(a.slug, a);
  }
  const articles = [...bySlug.values()]
    .sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime())
    .slice(0, 40);

  const jsonLd = [
    collectionPageJsonLd({
      name: "Latest News",
      description: "Chronological latest news from Chhattisgarh.",
      path: PATH,
      items: articles.slice(0, 20).map((article) => ({
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
      <Footer />
    </PageShell>
  );
}
