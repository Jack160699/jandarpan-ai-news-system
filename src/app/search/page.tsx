import type { Metadata } from "next";
import Link from "next/link";
import { PageShell } from "@/components/layout/PageShell";
import { SearchPanel } from "@/components/search/SearchPanel";
import { SearchResultsList } from "@/components/search/SearchResultsList";
import { SearchEmptyState } from "@/components/search/SearchEmptyState";
import { SearchTrendingChips } from "@/components/search/SearchTrendingChips";
import {
  SearchExperienceV3,
  SearchResults,
  isSearchV3Enabled,
} from "@/features/search-v3";
import { Footer } from "@/sections/Footer";
import { executeSearch } from "@/lib/search/search";
import { getTrendingSearchesForLanguage } from "@/lib/i18n/trending-searches";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { getServerReaderLanguage } from "@/lib/i18n/server-language";
import { BRAND } from "@/lib/brand";
import {
  NOINDEX_FOLLOW_ROBOTS,
  PRODUCTION_ROBOTS,
  SEARCH_PAGE_CANONICAL,
} from "@/lib/seo";
import type { SearchDistrict, SearchTimeScope } from "@/lib/search/types";
import type { HomeSectionId } from "@/lib/homepage/types";

export const revalidate = 60;

type SearchParams = {
  q?: string;
  district?: string;
  category?: string;
  time?: string;
  page?: string;
};

type PageProps = {
  searchParams: Promise<SearchParams>;
};

const BASE_SEARCH_TITLE = `Search · ${BRAND.nameEn}`;
const BASE_SEARCH_DESCRIPTION =
  "Search Chhattisgarh and Raipur news in Hindi and English — politics, crime, business, sports, and regional updates.";

function hasSearchFilters(params: SearchParams): boolean {
  return Boolean(
    params.q?.trim() ||
      params.district?.trim() ||
      params.category?.trim() ||
      (params.time && params.time !== "all") ||
      (params.page?.trim() && params.page !== "1")
  );
}

export async function generateMetadata({
  searchParams,
}: PageProps): Promise<Metadata> {
  const params = await searchParams;
  const q = params.q?.trim();
  const filtered = hasSearchFilters(params);
  const canonical = SEARCH_PAGE_CANONICAL;

  if (!filtered) {
    return {
      title: BASE_SEARCH_TITLE,
      description: BASE_SEARCH_DESCRIPTION,
      alternates: { canonical },
      robots: PRODUCTION_ROBOTS,
      openGraph: {
        title: BASE_SEARCH_TITLE,
        description: BASE_SEARCH_DESCRIPTION,
        url: canonical,
        type: "website",
      },
      twitter: {
        card: "summary",
        title: BASE_SEARCH_TITLE,
        description: BASE_SEARCH_DESCRIPTION,
      },
    };
  }

  const title = q
    ? `${q} · Search · ${BRAND.nameEn}`
    : BASE_SEARCH_TITLE;
  const description = q
    ? `Search results for "${q}" on ${BRAND.nameEn} — Chhattisgarh regional news.`
    : BASE_SEARCH_DESCRIPTION;

  return {
    title,
    description,
    alternates: { canonical },
    robots: NOINDEX_FOLLOW_ROBOTS,
    openGraph: {
      title: q ? `Search: ${q}` : BASE_SEARCH_TITLE,
      description,
      url: canonical,
      type: "website",
    },
    twitter: {
      card: "summary",
      title: q ? `Search: ${q}` : BASE_SEARCH_TITLE,
      description,
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
  const searchV3 = isSearchV3Enabled();

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
        <div className={searchV3 ? "search-v3-page" : "search-page"}>
          <Link href="/" className="search-page__back">
            {t.archive.backToEdition}
          </Link>
          <h1 className={searchV3 ? "search-v3-page__title mt-4" : "search-page__title mt-4"}>
            {t.search.title}
          </h1>
          <p className={searchV3 ? "search-v3-page__intro" : "search-page__intro"}>
            {t.search.hint}
          </p>

          {searchV3 ? (
            <SearchExperienceV3
              initialQuery={q}
              initialDistrict={district ?? null}
              initialCategory={category ?? null}
              initialTime={timeScope ?? "all"}
              suppressResults={Boolean(serverResult && serverResult.hits.length > 0)}
            />
          ) : (
            <SearchPanel
              initialQuery={q}
              initialDistrict={district ?? null}
              initialCategory={category ?? null}
              initialTime={timeScope ?? "all"}
              suppressResults={Boolean(serverResult && serverResult.hits.length > 0)}
            />
          )}

          {serverResult && serverResult.hits.length > 0 ? (
            searchV3 ? (
              <SearchResults
                hits={serverResult.hits}
                total={serverResult.total}
                tookMs={serverResult.tookMs}
                districtLabel={serverResult.parsed.district}
                listId="search-v3-server-results"
              />
            ) : (
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
            )
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

          {!q && !serverResult && !searchV3 ? (
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
    </PageShell>
  );
}
