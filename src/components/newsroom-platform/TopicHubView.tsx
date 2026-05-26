import Link from "next/link";
import { PageShell } from "@/components/layout/PageShell";
import { isSupabaseConfigured } from "@/lib/supabase";
import { platformArticlesToHomeArticles } from "@/lib/newsroom-platform/content/adapters";
import { fetchTopicFeed } from "@/lib/newsroom-platform/feeds/topics";
import { getPlatformTopic } from "@/lib/newsroom-platform/config/topics";
import { QuickUpdateFeed } from "@/components/quick-update/QuickUpdateFeed";
import { homeArticleToQuickUpdate } from "@/lib/homepage/quick-update";
import { notFound } from "next/navigation";

type TopicHubViewProps = {
  slug: string;
  language?: "en" | "hi";
};

export async function TopicHubView({ slug, language = "en" }: TopicHubViewProps) {
  const meta = await getPlatformTopic(slug);
  if (!meta) notFound();

  const feed = await fetchTopicFeed({
    slug,
    pageSize: 12,
    useMock: !isSupabaseConfigured(),
  });
  const homeArticles = platformArticlesToHomeArticles(feed.items);
  const title = language === "hi" ? meta.titleHi : meta.titleEn;
  const desc = language === "hi" ? meta.descriptionHi : meta.descriptionEn;

  return (
    <PageShell>
      <article className="nr-topic-hub pl-container py-6 pb-24">
        <p className="nr-topic-hub__kicker">Topic hub</p>
        <h1 className="nr-topic-hub__title">{title}</h1>
        <p className="nr-topic-hub__desc">{desc}</p>
        <div className="nr-topic-hub__chips">
          {meta.keywords.map((kw) => (
            <Link
              key={kw}
              href={`/search?q=${encodeURIComponent(kw)}`}
              className="nr-topic-hub__chip tap-target"
            >
              {kw}
            </Link>
          ))}
        </div>
        <div className="nr-topic-hub__feed">
          {homeArticles.length === 0 ? (
            <p className="text-sm text-stone-500">No stories in this topic yet.</p>
          ) : (
            <QuickUpdateFeed
              items={homeArticles.map((a) => homeArticleToQuickUpdate(a, language))}
              variant="feed"
            />
          )}
        </div>
      </article>
    </PageShell>
  );
}
