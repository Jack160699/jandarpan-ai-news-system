import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { TopicHubView } from "@/components/newsroom-platform/TopicHubView";
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
  if (!(await getPlatformTopic(slug))) notFound();
  return <TopicHubView slug={slug} />;
}
