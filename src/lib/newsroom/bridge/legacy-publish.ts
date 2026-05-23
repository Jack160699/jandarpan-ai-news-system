/**
 * Legacy bridge — sync validated articles → news_articles for current homepage
 * Disable with NEWSROOM_LEGACY_BRIDGE=false when homepage reads generated_articles only
 */

import { createAdminServerClient } from "@/lib/supabase";
import { enqueueArticlesForAi, isAiQueueEnabled } from "@/lib/news/ai/queue";
import { titleHash, urlHash } from "@/lib/news/normalize";
import { assignSlugsToRows } from "@/lib/news/slug";
import { logNewsroom, logNewsroomError } from "@/lib/newsroom/logger";
import type { NormalizedArticle } from "@/lib/news/types";
import type { NewsArticleInsert } from "@/lib/types/news-article";

const BATCH_SIZE = 40;

export type LegacyPublishResult = {
  inserted: number;
  skippedDuplicates: number;
  articleIds: string[];
  queuedForAI: number;
};

export function isLegacyBridgeEnabled(): boolean {
  const flag = process.env.NEWSROOM_LEGACY_BRIDGE?.trim().toLowerCase();
  if (flag === "false" || flag === "0") return false;
  return true;
}

function toLegacyRow(
  article: NormalizedArticle & { slug?: string }
): NewsArticleInsert {
  return {
    title: article.title,
    description: article.description,
    content: article.content,
    image_url: article.image_url,
    source: article.source ?? article.provider ?? null,
    author: article.author,
    category: article.category,
    article_url: article.article_url,
    published_at: article.published_at,
    language: article.language,
    region: article.region,
    title_hash: titleHash(article.title),
    url_hash: urlHash(article.article_url),
    slug: article.slug,
  };
}

export async function publishToLegacyArticles(
  articles: NormalizedArticle[]
): Promise<LegacyPublishResult> {
  const result: LegacyPublishResult = {
    inserted: 0,
    skippedDuplicates: 0,
    articleIds: [],
    queuedForAI: 0,
  };

  if (!isLegacyBridgeEnabled() || !articles.length) {
    logNewsroom("bridge", "legacy_bridge_skipped", {
      enabled: isLegacyBridgeEnabled(),
      count: articles.length,
    });
    return result;
  }

  const slugged = assignSlugsToRows(
    articles.map((a) => ({ title: a.title, article_url: a.article_url }))
  );

  const rows = articles.map((article, i) =>
    toLegacyRow({ ...article, slug: slugged[i].slug })
  );

  const supabase = createAdminServerClient();

  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);
    const { data, error } = await supabase
      .from("news_articles")
      .upsert(batch, {
        onConflict: "article_url",
        ignoreDuplicates: true,
      })
      .select("id");

    if (error) {
      logNewsroomError("bridge", "legacy_upsert_failed", error, {
        batchSize: batch.length,
      });
      continue;
    }

    const batchInserted = data?.length ?? 0;
    result.inserted += batchInserted;
    result.skippedDuplicates += batch.length - batchInserted;
    for (const row of data ?? []) {
      if (row.id != null) result.articleIds.push(String(row.id));
    }
  }

  if (isAiQueueEnabled() && result.articleIds.length) {
    result.queuedForAI = await enqueueArticlesForAi(result.articleIds);
  }

  logNewsroom("bridge", "legacy_publish_complete", {
    inserted: result.inserted,
    skippedDuplicates: result.skippedDuplicates,
    queuedForAI: result.queuedForAI,
  });

  return result;
}
