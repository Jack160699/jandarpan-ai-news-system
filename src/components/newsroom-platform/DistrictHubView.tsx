import Link from "next/link";
import { notFound } from "next/navigation";
import { PageShell } from "@/components/layout/PageShell";
import { platformArticlesToHomeArticles } from "@/lib/newsroom-platform/content/adapters";
import { fetchDistrictFeed } from "@/lib/newsroom-platform/feeds/district";
import { getPlatformDistrict, isPlatformDistrictSlug } from "@/lib/newsroom-platform/config/districts";
import { StoryCard } from "@/components/homepage/StoryCard";

type DistrictHubViewProps = {
  district: string;
};

export async function DistrictHubView({ district }: DistrictHubViewProps) {
  if (!isPlatformDistrictSlug(district)) notFound();
  const meta = getPlatformDistrict(district)!;
  const feed = await fetchDistrictFeed({ district, pageSize: 12, useMock: true });
  const articles = platformArticlesToHomeArticles(feed.items);

  return (
    <PageShell>
      <article className="nr-district-hub pl-container py-6 pb-24">
        <p className="nr-district-hub__kicker">District Wire</p>
        <h1 className="nr-district-hub__title">{meta.nameEn} News</h1>
        <p className="nr-district-hub__meta">
          LIVE: {meta.nameEn} · {feed.total} stories · {feed.liveCount} live
        </p>
        <nav className="nr-district-hub__sections" aria-label="District sections">
          {meta.sections.map((s) => (
            <Link
              key={s}
              href={`/districts/${district}?section=${s}`}
              className="nr-district-hub__section-chip tap-target"
            >
              {s}
            </Link>
          ))}
        </nav>
        <ul className="nr-district-hub__grid">
          {articles.map((article) => (
            <li key={article.id}>
              <StoryCard article={article} variant="wire" />
            </li>
          ))}
        </ul>
        {articles.length === 0 ? (
          <p className="text-sm text-stone-500">
            No stories for this district right now.
          </p>
        ) : null}
        <p className="mt-6">
          <Link href="/" className="text-sm font-bold text-[#a01830]">
            ← Back to home
          </Link>
        </p>
      </article>
    </PageShell>
  );
}
