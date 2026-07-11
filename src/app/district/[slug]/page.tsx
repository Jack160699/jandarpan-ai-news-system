import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { PageShell } from "@/components/layout/PageShell";
import { JsonLdScript } from "@/components/seo/JsonLdScript";
import { StoryCard } from "@/components/homepage/StoryCard";
import { toHomeArticle } from "@/lib/homepage/generated-feed";
import { filterPoolByLanguage } from "@/lib/i18n/article-language";
import { getServerReaderLanguage } from "@/lib/i18n/server-language";
import { fetchGeneratedArticlePool } from "@/lib/newsroom/generated/read";
import {
  buildRegionalRankingPersonalization,
  filterRowsForDistrict,
  getAllDistrictSlugs,
  getDistrict,
} from "@/lib/regional";
import { rankArticlesForHomepage } from "@/lib/news/ai/ranking";
import {
  breadcrumbListJsonLd,
  buildFacetedVariantMetadata,
  buildHubPageMetadata,
  collectionPageJsonLd,
} from "@/lib/seo";
import { buildHomeBreadcrumb } from "@/lib/seo/breadcrumbs";

export const revalidate = 60;

type PageProps = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ section?: string }>;
};

export function generateStaticParams() {
  return getAllDistrictSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
  searchParams,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const { section } = await searchParams;
  const district = getDistrict(slug);
  if (!district) return { title: "District not found" };

  const basePath = `/district/${slug}`;
  const baseTitle = `${district.name} News | Chhattisgarh Hyperlocal`;
  const description = `Latest AI-curated news from ${district.name}, Chhattisgarh.`;

  if (section?.trim()) {
    return buildFacetedVariantMetadata({
      baseTitle,
      description,
      basePath,
    });
  }

  return buildHubPageMetadata({
    title: baseTitle,
    description,
    path: basePath,
    keywords: [district.name, district.nameHi, "Chhattisgarh", "hyperlocal news"],
    locale: "hi_IN",
  });
}

export default async function DistrictPage({ params }: PageProps) {
  const { slug } = await params;
  const district = getDistrict(slug);
  if (!district) notFound();

  const displayLanguage = await getServerReaderLanguage();
  const pool = await fetchGeneratedArticlePool(120);
  const langPool = filterPoolByLanguage(pool, displayLanguage);
  const filtered = filterRowsForDistrict(langPool, slug);
  const personalization = buildRegionalRankingPersonalization({
    homeDistrict: slug,
    regionBoostMultiplier: 1.3,
  });
  const ranked = rankArticlesForHomepage(filtered, { personalization });

  const articles = ranked
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

  const path = `/district/${slug}`;
  const jsonLd = [
    collectionPageJsonLd({
      name: `${district.name} News`,
      description: `Latest AI-curated news from ${district.name}, Chhattisgarh.`,
      path,
      items: articles.slice(0, 20).map((article) => ({
        url: `/story/${article.slug}`,
        name: article.headline,
      })),
    }),
    breadcrumbListJsonLd([
      buildHomeBreadcrumb(),
      { name: district.name, href: path },
    ]),
  ];

  return (
    <PageShell>
      <JsonLdScript data={jsonLd} />
      <header className="mb-8 border-b border-neutral-200 pb-6">
        <p className="text-sm uppercase tracking-wide text-neutral-500">
          Hyperlocal · छत्तीसगढ़
        </p>
        <h1 className="mt-2 text-3xl font-serif font-bold text-neutral-900">
          {district.name}
        </h1>
        <p className="mt-1 text-lg text-neutral-600">{district.nameHi}</p>
        <p className="mt-3 text-sm text-neutral-500">
          District-prioritized feed · Tier {district.priority} routing
        </p>
        <Link
          href="/"
          className="mt-4 inline-block text-sm text-red-700 hover:underline"
        >
          ← Statewide homepage
        </Link>
      </header>

      {articles.length === 0 ? (
        <p className="text-neutral-600">
          No stories tagged for {district.name} yet. Check back after the next
          ingest cycle.
        </p>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {articles.map((article) => (
            <StoryCard key={article.id} article={article} variant="compact" />
          ))}
        </div>
      )}
    </PageShell>
  );
}
