import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { TopicHubView } from "@/components/newsroom-platform/TopicHubView";
import {
  getPlatformTopic,
  loadPlatformTopics,
} from "@/lib/newsroom-platform/config/topics";

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
  return {
    title: `${topic.titleEn} | Jan Darpan`,
    description: topic.descriptionEn,
    keywords: topic.keywords,
  };
}

export default async function TopicPage({ params }: PageProps) {
  const { slug } = await params;
  if (!(await getPlatformTopic(slug))) notFound();
  return <TopicHubView slug={slug} />;
}
