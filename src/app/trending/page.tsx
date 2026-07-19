import type { Metadata } from "next";
import { PageShell } from "@/components/layout/PageShell";
import { JsonLdScript } from "@/components/seo/JsonLdScript";
import { isReaderDesignSystemEnabled } from "@/features/reader-ds/config";
import { TrendingPageView } from "@/features/reader-ds/pages";
import { getCachedGeneratedHomepageFeed } from "@/lib/homepage/cached-feed";
import {
  breadcrumbListJsonLd,
  buildHubPageMetadata,
  buildTrendingKeywords,
  collectionPageJsonLd,
} from "@/lib/seo";
import { buildHomeBreadcrumb } from "@/lib/seo/breadcrumbs";
import { Footer } from "@/sections/Footer";
import { HomepageEmpty } from "@/sections/homepage";

export const revalidate = 60;

const PATH = "/trending";

export const metadata: Metadata = buildHubPageMetadata({
  title: "Trending · Jan Darpan",
  description: "Most-read Chhattisgarh stories in the last 24 hours — ट्रेंडिंग.",
  path: PATH,
  keywords: ["trending news", "ट्रेंडिंग", "Chhattisgarh"],
  locale: "hi_IN",
});

export default async function TrendingPage() {
  const feed = await getCachedGeneratedHomepageFeed();
  const articles = feed?.trending?.length
    ? feed.trending
    : [...(feed?.liveWire ?? []), ...(feed?.editorsPicks?.supporting ?? [])].slice(0, 20);

  const topicChips = buildTrendingKeywords({ limit: 8 });

  const jsonLd = [
    collectionPageJsonLd({
      name: "Trending",
      description: "Most-read Chhattisgarh stories.",
      path: PATH,
      items: (articles ?? []).slice(0, 20).map((article) => ({
        url: `/story/${article.slug}`,
        name: article.headline,
      })),
    }),
    breadcrumbListJsonLd([buildHomeBreadcrumb(), { name: "Trending", href: PATH }]),
  ];

  if (!feed) {
    return (
      <PageShell variant="news">
        <HomepageEmpty />
        <Footer />
      </PageShell>
    );
  }

  if (isReaderDesignSystemEnabled()) {
    return (
      <>
        <JsonLdScript data={jsonLd} />
        <TrendingPageView articles={articles ?? []} topicChips={topicChips} />
      </>
    );
  }

  return (
    <PageShell variant="news">
      <JsonLdScript data={jsonLd} />
      <main id="main-content" role="main" className="pl-container py-6">
        <h1 className="text-2xl font-serif font-bold">Trending</h1>
        <ul className="mt-4 space-y-3">
          {(articles ?? []).map((a) => (
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
