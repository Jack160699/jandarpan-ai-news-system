export const revalidate = 60;

import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { PageShell } from "@/components/layout/PageShell";
import { JsonLdScript } from "@/components/seo/JsonLdScript";
import { InternalSeoLinks } from "@/components/seo/InternalSeoLinks";
import { TrendingKeywordsBar } from "@/components/seo/TrendingKeywordsBar";
import { StoryCard } from "@/components/homepage/StoryCard";
import { isReaderDesignSystemEnabled } from "@/features/reader-ds/config";
import { CategoryPageView } from "@/features/reader-ds/pages";
import { getCachedCategoryHubData } from "@/lib/category/get-category-hub";
import {
  buildCategoryMetadata,
  buildCategoryArticleLinks,
  breadcrumbListJsonLd,
  categoryHubJsonLd,
  getAllCategorySlugs,
  getCategoryHubLinks,
  getCategorySeo,
} from "@/lib/seo";
import { buildHomeBreadcrumb } from "@/lib/seo/breadcrumbs";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export function generateStaticParams() {
  return getAllCategorySlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const config = getCategorySeo(slug);
  if (!config) return { title: "Category not found" };

  return buildCategoryMetadata({
    titleEn: config.titleEn,
    descriptionEn: config.descriptionEn,
    path: config.path,
    keywords: config.keywords,
  });
}

export default async function CategoryPage({ params }: PageProps) {
  const { slug } = await params;
  const config = getCategorySeo(slug);
  if (!config) notFound();

  const hub = await getCachedCategoryHubData(slug);
  if (!hub) notFound();

  const { homeArticles, localizedHeadlines, trending } = hub;

  const breadcrumbs = [
    buildHomeBreadcrumb(),
    { name: config.titleEn, href: config.path },
  ];

  const jsonLd = [
    categoryHubJsonLd(
      config,
      localizedHeadlines.map((r) => ({ slug: r.slug, headline: r.headline }))
    ),
    breadcrumbListJsonLd(breadcrumbs),
  ];

  if (isReaderDesignSystemEnabled()) {
    return (
      <>
        <JsonLdScript data={jsonLd} />
        <CategoryPageView
          titleHi={config.titleHi}
          titleEn={config.titleEn}
          slug={slug}
          articles={homeArticles}
        />
      </>
    );
  }

  return (
    <PageShell variant="news">
      <JsonLdScript data={jsonLd} />
      <main id="main-content" className="category-hub" role="main">
        <header className="category-hub__header">
          <nav className="story-breadcrumbs" aria-label="Breadcrumb">
            <ol className="story-breadcrumbs__list">
              <li>
                <Link href="/">Home</Link>
                <span aria-hidden> / </span>
              </li>
              <li aria-current="page">{config.titleEn}</li>
            </ol>
          </nav>
          <h1 className="category-hub__title">{config.titleEn}</h1>
          <p className="category-hub__title-hi">{config.titleHi}</p>
          <p className="category-hub__deck">{config.descriptionEn}</p>
          <TrendingKeywordsBar keywords={trending} />
        </header>

        <section className="category-hub__grid" aria-label="Latest stories">
          {homeArticles.length === 0 ? (
            <p className="category-hub__empty">
              Stories in this section will appear as our desk files fresh coverage.
            </p>
          ) : (
            <ul className="category-hub__list">
              {homeArticles.map((article) => (
                <li key={article.id}>
                  <StoryCard article={article} variant="editorial" />
                </li>
              ))}
            </ul>
          )}
        </section>

        <InternalSeoLinks
          title="Explore more"
          links={[
            ...getCategoryHubLinks(8).filter((l) => l.href !== config.path),
            ...buildCategoryArticleLinks(
              localizedHeadlines.map((r) => ({
                slug: r.slug,
                headline: r.headline,
              })),
              8
            ),
          ]}
        />
      </main>
    </PageShell>
  );
}
