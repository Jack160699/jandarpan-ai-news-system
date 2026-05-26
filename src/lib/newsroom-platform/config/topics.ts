import type { TopicHubMeta } from "../content/types";
import {
  getPlatformTopicHub,
  getPlatformTopicSlugs,
  listAdminTopics,
  loadPlatformTopicsHub,
  contentTypesForTopicSlug,
} from "@/lib/platform-admin/topics";

export type PlatformTopicSlug = string;

/** @deprecated Loaded from Supabase */
export const PLATFORM_TOPIC_SLUGS: readonly string[] = [];

/** @deprecated Loaded from Supabase */
export const PLATFORM_TOPICS: TopicHubMeta[] = [];

export async function loadPlatformTopics(): Promise<TopicHubMeta[]> {
  return loadPlatformTopicsHub();
}

export async function getPlatformTopic(slug: string): Promise<TopicHubMeta | null> {
  return getPlatformTopicHub(slug);
}

export async function isPlatformTopicSlug(slug: string): Promise<boolean> {
  const slugs = await getPlatformTopicSlugs();
  return slugs.includes(slug);
}

export async function contentTypesForTopic(slug: string): Promise<string[]> {
  const topics = await loadPlatformTopicsHub();
  const records = await listAdminTopics();
  return contentTypesForTopicSlug(slug, topics, records);
}
