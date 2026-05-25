import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { TopicHubView } from "@/components/newsroom-platform/TopicHubView";
import { getPlatformTopic, PLATFORM_TOPIC_SLUGS } from "@/lib/newsroom-platform/config/topics";
/** Topic hub ISR — keep in sync with `ISR.topicHub` in config/isr.ts */
export const revalidate = 300;

type PageProps = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return PLATFORM_TOPIC_SLUGS.map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const topic = getPlatformTopic(slug);
  if (!topic) return { title: "Topic" };
  return {
    title: `${topic.titleEn} | Jan Darpan`,
    description: topic.descriptionEn,
    keywords: topic.keywords,
  };
}

export default async function TopicPage({ params }: PageProps) {
  const { slug } = await params;
  if (!getPlatformTopic(slug)) notFound();
  return <TopicHubView slug={slug} />;
}
