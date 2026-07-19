import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { TopicHubView } from "@/components/newsroom-platform/TopicHubView";
import { isReaderDesignSystemEnabled } from "@/features/reader-ds/config";
import { TopicPageView } from "@/features/reader-ds/pages";
import { isSupabaseConfigured } from "@/lib/supabase";
import { platformArticlesToHomeArticles } from "@/lib/newsroom-platform/content/adapters";
import { fetchTopicFeed } from "@/lib/newsroom-platform/feeds/topics";
import {
  getPlatformTopic,
  loadPlatformTopics,
} from "@/lib/newsroom-platform/config/topics";
import { buildHubPageMetadata } from "@/lib/seo";

export const revalidate = 300;

type PageProps = { params: Promise<{ slug: string }> };

export async function generateStaticParams() {
  const topics = await loadPlatformTopics();
  return topics.map((t) => ({ slug: t.slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const topic = await getPlatformTopic(slug);
  if (!topic) return { title: "Topic" };
  return buildHubPageMetadata({
    title: `${topic.titleEn} · Jan Darpan Chhattisgarh`,
    description: topic.descriptionEn,
    path: `/topics/${slug}`,
    keywords: topic.keywords,
    locale: "hi_IN",
  });
}

export default async function TopicPage({ params }: PageProps) {
  const { slug } = await params;
  const topic = await getPlatformTopic(slug);
  if (!topic) notFound();

  if (isReaderDesignSystemEnabled()) {
    const feed = await fetchTopicFeed({
      slug,
      pageSize: 12,
      useMock: !isSupabaseConfigured(),
    });
    const articles = platformArticlesToHomeArticles(feed.items);
    return (
      <TopicPageView
        title={topic.titleHi || topic.titleEn}
        description={topic.descriptionHi || topic.descriptionEn}
        categoryLabel="टॉपिक"
        articleCount={articles.length}
        articles={articles}
      />
    );
  }

  return <TopicHubView slug={slug} />;
}
