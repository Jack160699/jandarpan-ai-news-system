import type { Metadata } from "next";
import Link from "next/link";
import { PageShell } from "@/components/layout/PageShell";
import { SearchPanel } from "@/components/search/SearchPanel";
import { SearchResultsList } from "@/components/search/SearchResultsList";
import { SearchEmptyState } from "@/components/search/SearchEmptyState";
import { Footer } from "@/sections/Footer";
import { executeSearch } from "@/lib/search/search";
import { getTrendingSearchesForLanguage } from "@/lib/i18n/trending-searches";
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
  const trending = getTrendingSearchesForLanguage(displayLanguage, 10);

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
          <Link
            href="/"
            className="font-[family-name:var(--font-ui)] text-sm text-[var(--ink-muted)]"
          >
            ← Back to edition
          </Link>
          <h1 className="search-page__title mt-4">Search the edition</h1>
          <p className="mt-2 text-[var(--ink-muted)]">
            Hindi + English · typo tolerant · Raipur, Bastar, CG politics, and
            more.
          </p>

          <SearchPanel
            initialQuery={q}
            initialDistrict={district ?? null}
            initialCategory={category ?? null}
            initialTime={timeScope ?? "all"}
            suppressResults={Boolean(serverResult && serverResult.hits.length > 0)}
          />

          {serverResult && serverResult.hits.length > 0 ? (
            <>
              <p className="search-meta mt-8">
                {serverResult.total} stories · {serverResult.tookMs}ms
                {serverResult.parsed.district
                  ? ` · ${serverResult.parsed.district}`
                  : ""}
              </p>
              <SearchResultsList hits={serverResult.hits} />
            </>
          ) : serverResult && serverResult.hits.length === 0 ? (
            <SearchEmptyState query={q || undefined} />
          ) : null}

          {!q && (
            <div className="search-trending">
              <p className="search-trending__label">Trending searches</p>
              <ul className="search-trending__list">
                {trending.map((t) => (
                  <li key={t}>
                    <Link
                      href={`/search?q=${encodeURIComponent(t)}`}
                      className="search-trending__link"
                    >
                      {t}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}

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
