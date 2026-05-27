export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { PageShell } from "@/components/layout/PageShell";
import { JsonLdScript } from "@/components/seo/JsonLdScript";
import { InternalSeoLinks } from "@/components/seo/InternalSeoLinks";
import { TrendingKeywordsBar } from "@/components/seo/TrendingKeywordsBar";
import { StoryCard } from "@/components/homepage/StoryCard";
import { generatedToNewsArticle } from "@/lib/homepage/generated-adapter";
import { toHomeArticle } from "@/lib/homepage/generated-feed";
import { fetchGeneratedArticlePool } from "@/lib/newsroom/generated/read";
import {
  buildCategoryMetadata,
  buildCategoryArticleLinks,
  breadcrumbListJsonLd,
  buildTrendingKeywords,
  categoryHubJsonLd,
  getCategorySeo,
  getCategoryHubLinks,
  matchesCategoryArticle,
} from "@/lib/seo";
import { buildHomeBreadcrumb } from "@/lib/seo/breadcrumbs";
import type { GeneratedArticleRow } from "@/lib/types/newsroom";

type PageProps = {
  params: Promise<{ slug: string }>;
};

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

function filterArticlesForCategory(
  rows: GeneratedArticleRow[],
  slug: string
): GeneratedArticleRow[] {
  const config = getCategorySeo(slug);
  if (!config) return [];

  return rows.filter((row) => {
    const article = generatedToNewsArticle(row);
    return matchesCategoryArticle(config, {
      category: article.category,
      tags: row.tags,
      headline: row.headline,
      summary: row.summary ?? undefined,
    });
  });
}

export default async function CategoryPage({ params }: PageProps) {
  const { slug } = await params;
  const config = getCategorySeo(slug);
  if (!config) notFound();

  const pool = await fetchGeneratedArticlePool(120);
  const matched = filterArticlesForCategory(pool, slug).slice(0, 24);
  const homeArticles = matched
    .map((row) => toHomeArticle(row))
    .filter((a): a is NonNullable<typeof a> => a !== null);
  const trending = buildTrendingKeywords({
    generatedRows: matched,
    limit: 10,
  });

  const breadcrumbs = [
    buildHomeBreadcrumb(),
    { name: config.titleEn, href: config.path },
  ];

  const jsonLd = [
    categoryHubJsonLd(
      config,
      matched.map((r) => ({ slug: r.slug, headline: r.headline }))
    ),
    breadcrumbListJsonLd(breadcrumbs),
  ];

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
              matched.map((r) => ({ slug: r.slug, headline: r.headline })),
              8
            ),
          ]}
        />
      </main>
    </PageShell>
  );
}
