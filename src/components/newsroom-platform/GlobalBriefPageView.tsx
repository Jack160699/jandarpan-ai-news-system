import Link from "next/link";
import { JsonLdScript } from "@/components/seo/JsonLdScript";
import { isSupabaseConfigured } from "@/lib/supabase";
import { PageShell } from "@/components/layout/PageShell";
import type { GlobalBriefSegment } from "@/lib/newsroom-platform/content/types";
import { platformArticlesToHomeArticles } from "@/lib/newsroom-platform/content/adapters";
import { fetchGlobalBriefFeed } from "@/lib/newsroom-platform/feeds/global-brief";
import { NationalNewsCard } from "@/components/home/NationalNewsCard";
import { homeArticleToQuickUpdate } from "@/lib/homepage/quick-update";
import { breadcrumbListJsonLd, collectionPageJsonLd } from "@/lib/seo";
import { buildHomeBreadcrumb } from "@/lib/seo/breadcrumbs";

type GlobalBriefPageViewProps = {
  segment: GlobalBriefSegment;
};

const HUB_COPY: Record<
  GlobalBriefSegment,
  { title: string; description: string; path: string; breadcrumb: string }
> = {
  national: {
    title: "National News",
    description:
      "India national headlines, policy updates, and developing stories from the Jan Darpan national desk.",
    path: "/news/national",
    breadcrumb: "National News",
  },
  international: {
    title: "International News",
    description:
      "World news, global affairs, and international coverage curated for Chhattisgarh readers.",
    path: "/news/international",
    breadcrumb: "International News",
  },
};

export async function GlobalBriefPageView({ segment }: GlobalBriefPageViewProps) {
  const feed = await fetchGlobalBriefFeed({
    segment,
    pageSize: 10,
    useMock: !isSupabaseConfigured(),
  });
  const articles = platformArticlesToHomeArticles(feed.items);
  const hub = HUB_COPY[segment];
  const title = hub.title;
  const other = segment === "national" ? "international" : "national";

  const jsonLd = [
    collectionPageJsonLd({
      name: hub.title,
      description: hub.description,
      path: hub.path,
      items: articles.slice(0, 20).map((article) => ({
        url: `/story/${article.slug}`,
        name: article.headline,
      })),
    }),
    breadcrumbListJsonLd([
      buildHomeBreadcrumb(),
      { name: hub.breadcrumb, href: hub.path },
    ]),
  ];

  return (
    <PageShell>
      <JsonLdScript data={jsonLd} />
      <article className="nr-global-page pl-container py-6 pb-24">
        <p className="nr-global-page__kicker">Global Brief</p>
        <h1 className="nr-global-page__title">{title}</h1>
        <p className="nr-global-page__meta">
          LIVE: {title} · {feed.total} stories
        </p>
        <div className="nr-global-page__tabs">
          <Link
            href="/news/national"
            className={`nr-global-page__tab tap-target${segment === "national" ? " is-active" : ""}`}
          >
            National
          </Link>
          <Link
            href="/news/international"
            className={`nr-global-page__tab tap-target${segment === "international" ? " is-active" : ""}`}
          >
            International
          </Link>
        </div>
        <div className="nr-global-page__feed divide-y divide-stone-200/60 dark:divide-stone-700/50">
          {articles.map((article, index) => (
            <NationalNewsCard
              key={article.id}
              {...homeArticleToQuickUpdate(article, "en")}
              index={index}
            />
          ))}
        </div>
        {articles.length === 0 ? (
          <p className="text-sm text-stone-500">No stories in this feed right now.</p>
        ) : null}
        <p className="mt-4 text-sm">
          <Link href={`/news/${other}`} className="font-bold text-[#a01830]">
            View {other} news →
          </Link>
        </p>
      </article>
    </PageShell>
  );
}
