import Link from "next/link";
import { PageShell } from "@/components/layout/PageShell";
import type { GlobalBriefSegment } from "@/lib/newsroom-platform/content/types";
import { platformArticlesToHomeArticles } from "@/lib/newsroom-platform/content/adapters";
import { fetchGlobalBriefFeed } from "@/lib/newsroom-platform/feeds/global-brief";
import { NationalNewsCard } from "@/components/home/NationalNewsCard";
import { homeArticleToQuickUpdate } from "@/lib/homepage/quick-update";

type GlobalBriefPageViewProps = {
  segment: GlobalBriefSegment;
};

export async function GlobalBriefPageView({ segment }: GlobalBriefPageViewProps) {
  const feed = await fetchGlobalBriefFeed({ segment, pageSize: 10, useMock: true });
  const articles = platformArticlesToHomeArticles(feed.items);
  const title = segment === "national" ? "National News" : "International News";
  const other = segment === "national" ? "international" : "national";

  return (
    <PageShell>
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
