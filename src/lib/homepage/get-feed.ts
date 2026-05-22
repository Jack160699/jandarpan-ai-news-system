/**
 * Server homepage data — generated_articles only
 */

import { fetchGeneratedArticlePool } from "@/lib/newsroom/generated/read";
import { buildGeneratedHomepageFeed } from "@/lib/homepage/generated-feed";
import type { GeneratedHomepageFeed } from "@/lib/homepage/types";

export async function getGeneratedHomepageFeed(): Promise<GeneratedHomepageFeed | null> {
  const pool = await fetchGeneratedArticlePool(120);
  return buildGeneratedHomepageFeed(pool);
}
