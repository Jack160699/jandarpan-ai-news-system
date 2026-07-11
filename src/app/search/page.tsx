import type { Metadata } from "next";
import Link from "next/link";
import { PageShell } from "@/components/layout/PageShell";
import { SearchPanel } from "@/components/search/SearchPanel";
import { SearchResultsList } from "@/components/search/SearchResultsList";
import { SearchEmptyState } from "@/components/search/SearchEmptyState";
import { SearchTrendingChips } from "@/components/search/SearchTrendingChips";
import { Footer } from "@/sections/Footer";
import { executeSearch } from "@/lib/search/search";
import { getTrendingSearchesForLanguage } from "@/lib/i18n/trending-searches";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { getServerReaderLanguage } from "@/lib/i18n/server-language";
import { BRAND } from "@/lib/brand";
import { PRODUCTION_ROBOTS, SITE_URL } from "@/lib/seo";
import type { SearchDistrict, SearchTimeScope } from "@/lib/search/types";
import type { HomeSectionId } from "@/lib/homepage/types";

export const revalidate = 60;

type PageProps = {
  searchParams: Promise<{
    q?: string;
    district?: string;
    category?: string;
    time?: string;
  }>;
};

export async function generateMetadata({
  searchParams,
}: PageProps): Promise<Metadata> {
  const params = await searchParams;
  const q = params.q?.trim();

  if (!q) {
    return {
      title: `Search · ${BRAND.nameEn}`,
      description:
        "Search Chhattisgarh and Raipur news in Hindi and English — politics, crime, business, sports, and regional updates.",
      alternates: { canonical: `${SITE_URL}/search` },
      robots: PRODUCTION_ROBOTS,
    };
  }

  const canonical = `${SITE_URL}/search?q=${encodeURIComponent(q)}`;

  return {
    title: `${q} · Search · ${BRAND.nameEn}`,
    description: `Search results for "${q}" on ${BRAND.nameEn} — Chhattisgarh regional news.`,
    alternates: { canonical },
    robots: PRODUCTION_ROBOTS,
    openGraph: {
      title: `Search: ${q}`,
      description: `Find stories about ${q} from ${BRAND.nameEn}.`,
      url: canonical,
    },
  };
}

export default async function SearchPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const q = params.q?.trim() ?? "";
  const district = params.district as SearchDistrict | undefined;
  const category = params.category as HomeSectionId | undefined;
  const timeScope = params.time as SearchTimeScope | undefined;

  const displayLanguage = await getServerReaderLanguage();
  const t = getDictionary(displayLanguage);
  const trending = getTrendingSearchesForLanguage(displayLanguage, 10);

  const categoryShortcuts = [
    {
      label: t.home.categories.politics,
      href: "/search?category=india",
    },
    {
      label: t.home.categories.sports,
      href: "/search?category=sports",
    },
    {
      label: t.home.categories.business,
      href: "/search?category=business",
    },
    {
      label: t.home.categories.chhattisgarh,
      href: "/search?district=chhattisgarh",
    },
    {
      label: t.home.categories.raipur,
      href: "/search?district=raipur",
    },
  ];

  let serverResult = null;
  if (q || district || category) {
    serverResult = await executeSearch(
      q || "Chhattisgarh",
      {
        district: district ?? null,
        category: category ?? null,
        timeScope: timeScope ?? "all",
        limit: 20,
      },
      displayLanguage
    );
  }

  return (
    <PageShell variant="news">
      <main id="main-content" className="search-page-root" role="main">
        <div className="search-page">
          <Link href="/" className="search-page__back">
            {t.archive.backToEdition}
          </Link>
          <h1 className="search-page__title mt-4">{t.search.title}</h1>
          <p className="search-page__intro">{t.search.hint}</p>

          <SearchPanel
            initialQuery={q}
            initialDistrict={district ?? null}
            initialCategory={category ?? null}
            initialTime={timeScope ?? "all"}
            suppressResults={Boolean(serverResult && serverResult.hits.length > 0)}
          />

          {serverResult && serverResult.hits.length > 0 ? (
            <>
              <p className="search-meta search-meta--premium">
                <span className="search-meta__count">{serverResult.total}</span>{" "}
                stories · {serverResult.tookMs}ms
                {serverResult.parsed.district
                  ? ` · ${serverResult.parsed.district}`
                  : ""}
              </p>
              <SearchResultsList hits={serverResult.hits} />
            </>
          ) : serverResult && serverResult.hits.length === 0 ? (
            <SearchEmptyState
              trending={trending}
              categoryShortcuts={categoryShortcuts}
              title={t.search.noResults}
              body={q ? `${t.search.noResults}. ${t.search.hint}` : t.search.hint}
              trendingTitle={t.home.trending}
              trendingSubtitle={t.search.hint}
              shortcutsTitle={t.nav.categoriesTitle}
              backLabel={t.archive.backToEdition}
            />
          ) : null}

          {!q && !serverResult ? (
            <SearchTrendingChips
              items={trending}
              title={t.home.trending}
              subtitle={t.search.hint}
              className="search-trending--page"
            />
          ) : null}

          {serverResult && serverResult.hits.length > 0 && (
            <p className="search-meta sr-only" aria-live="polite">
              {serverResult.total} stories found for {q}
            </p>
          )}
        </div>
        <Footer />
      </main>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "WebSite",
            name: BRAND.nameEn,
            url: SITE_URL,
            potentialAction: {
              "@type": "SearchAction",
              target: `${SITE_URL}/search?q={search_term_string}`,
              "query-input": "required name=search_term_string",
            },
          }),
        }}
      />
    </PageShell>
  );
}
