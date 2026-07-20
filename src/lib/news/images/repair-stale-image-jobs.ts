/**
 * Safely complete/fail stale editorial_image_queue jobs when the article
 * already has a valid hero image (avoids re-burning image generation quota).
 */

import { createAdminServerClient } from "@/lib/supabase";
import { validateImageUrlShape } from "@/lib/news/images/image-url-validation";
import { asJson } from "@/types/json";

export type StaleImageJobAction = "completed" | "failed" | "skipped";

export type StaleImageJobResult = {
  queueId: string;
  articleId: string | null;
  action: StaleImageJobAction;
  reason: string;
};

function hasValidHero(url: string | null | undefined): boolean {
  if (!url?.trim()) return false;
  return validateImageUrlShape(url).ok;
}

/**
 * For each queue job ID: if the linked article already has a valid hero,
 * mark the job completed (or failed if `preferFail` and hero is contextual-only).
 * Does not delete rows; never mutates articles that lack a hero.
 */
export async function repairStaleImageJobs(
  jobIds: string[],
  opts?: { preferFail?: boolean; dryRun?: boolean }
): Promise<StaleImageJobResult[]> {
  if (!jobIds.length) return [];

  const supabase = createAdminServerClient();
  const results: StaleImageJobResult[] = [];

  const { data: jobs, error } = await supabase
    .from("editorial_image_queue")
    .select("id, generated_article_id, status")
    .in("id", jobIds);

  if (error) {
    return jobIds.map((id) => ({
      queueId: id,
      articleId: null,
      action: "skipped" as const,
      reason: `query_error:${error.message}`,
    }));
  }

  const byId = new Map((jobs ?? []).map((j) => [String(j.id), j]));

  for (const queueId of jobIds) {
    const job = byId.get(queueId);
    if (!job) {
      results.push({
        queueId,
        articleId: null,
        action: "skipped",
        reason: "job_not_found",
      });
      continue;
    }

    const articleId = job.generated_article_id
      ? String(job.generated_article_id)
      : null;

    if (!articleId) {
      results.push({
        queueId,
        articleId: null,
        action: "skipped",
        reason: "missing_article_id",
      });
      continue;
    }

    if (job.status === "completed" || job.status === "failed") {
      results.push({
        queueId,
        articleId,
        action: "skipped",
        reason: `already_${job.status}`,
      });
      continue;
    }

    const { data: article } = await supabase
      .from("generated_articles")
      .select("hero_image_url, editorial_metadata")
      .eq("id", articleId)
      .maybeSingle();

    const hero = article?.hero_image_url as string | null | undefined;
    if (!hasValidHero(hero)) {
      results.push({
        queueId,
        articleId,
        action: "skipped",
        reason: "article_missing_valid_hero",
      });
      continue;
    }

    const action: StaleImageJobAction = opts?.preferFail ? "failed" : "completed";
    if (opts?.dryRun) {
      results.push({
        queueId,
        articleId,
        action,
        reason: `dry_run_would_${action}`,
      });
      continue;
    }

    const now = new Date().toISOString();
    if (action === "completed") {
      await supabase
        .from("editorial_image_queue")
        .update({
          status: "completed",
          hero_image_url: hero,
          processed_at: now,
          processing_started_at: null,
          error: null,
        })
        .eq("id", queueId);

      const meta = (article?.editorial_metadata ?? {}) as Record<string, unknown>;
      const imageMeta = (meta.image ?? {}) as Record<string, unknown>;
      await supabase
        .from("generated_articles")
        .update({
          editorial_metadata: asJson({
            ...meta,
            image: {
              ...imageMeta,
              status: "completed",
              hero_url: hero,
              repaired_stale_job: true,
              repaired_at: now,
            },
          }),
        })
        .eq("id", articleId);
    } else {
      await supabase
        .from("editorial_image_queue")
        .update({
          status: "failed",
          error: "stale_job_article_already_has_hero",
          processed_at: now,
          processing_started_at: null,
        })
        .eq("id", queueId);
    }

    results.push({
      queueId,
      articleId,
      action,
      reason: "article_already_has_valid_hero",
    });
  }

  return results;
}
