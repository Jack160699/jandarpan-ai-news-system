/**
 * Publish AI editorials from news_events → generated_articles
 * Only finalized articles (quality-passed) are stored
 */

import { generateEditorialsFromEvents } from "@/lib/news/ai/generate-article";
import { logNewsroom } from "@/lib/newsroom/logger";
import { EDITORIAL_LIMITS } from "@/lib/newsroom/editorial-capacity";

export type GenerateArticlesResult = {
  published: number;
  rejected: number;
  skipped: boolean;
  errors: string[];
};

export function isGeneratedArticlesHomepageEnabled(): boolean {
  return process.env.USE_GENERATED_ARTICLES === "true";
}

/**
 * Generate original editorials for clustered events (requires OPENAI_API_KEY).
 * Gated by NEWSROOM_GENERATE_ARTICLES=true — does not auto-enable homepage cutover.
 */
export async function publishGeneratedFromEvents(
  limit = EDITORIAL_LIMITS.legacyPublishFromEventsDefaultLimit
): Promise<GenerateArticlesResult> {
  if (process.env.NEWSROOM_GENERATE_ARTICLES !== "true") {
    logNewsroom("generated", "generation_disabled", {
      hint: "Set NEWSROOM_GENERATE_ARTICLES=true to enable",
    });
    return { published: 0, rejected: 0, skipped: true, errors: [] };
  }

  const batch = await generateEditorialsFromEvents({ limit });

  logNewsroom("generated", "publish_batch_complete", {
    published: batch.generated,
    rejected: batch.rejected,
    skipped: batch.skipped,
  });

  return {
    published: batch.generated,
    rejected: batch.rejected,
    skipped: batch.skipped > 0 && batch.generated === 0,
    errors: batch.errors,
  };
}
