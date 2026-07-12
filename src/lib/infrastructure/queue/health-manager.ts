import { createAdminClient } from "@/lib/supabase";
import { countPendingAiQueue } from "@/lib/news/ai/queue";
import { countPendingEditorialImages } from "@/lib/news/ai/generate-editorial-image";
import { countPendingJobs } from "@/lib/infrastructure/jobs/queue";

export type QueueHealthSnapshot = {
  aiQueuePending: number;
  imageQueuePending: number;
  translationQueuePending: number;
  publishingQueuePending: number;
  limits: {
    ai: number;
    images: number;
    translation: number;
    publishing: number;
  };
  pauseIngestion: boolean;
  oldestFirst: boolean;
  reasons: string[];
  checkedAt: string;
};

function envInt(name: string, fallback: number): number {
  const raw = process.env[name];
  const n = Number(raw);
  return Number.isFinite(n) && n >= 0 ? n : fallback;
}

export function getQueueHealthLimits() {
  return {
    ai: envInt("QUEUE_LIMIT_AI_PENDING", 500),
    images: envInt("QUEUE_LIMIT_IMAGES_PENDING", 250),
    translation: envInt("QUEUE_LIMIT_TRANSLATION_PENDING", 400),
    publishing: envInt("QUEUE_LIMIT_PUBLISHING_PENDING", 200),
  } as const;
}

async function countPublishingQueuePending(): Promise<number> {
  const supabase = createAdminClient();
  const { count } = await supabase
    .from("generated_articles")
    .select("id", { count: "exact", head: true })
    .eq("workflow_status", "scheduled")
    .is("published_at", null);
  return count ?? 0;
}

export async function buildQueueHealthSnapshot(): Promise<QueueHealthSnapshot> {
  const limits = getQueueHealthLimits();

  const [aiQueuePending, imageQueuePending, publishingQueuePending] =
    await Promise.all([
      countPendingAiQueue().catch(() => 0),
      countPendingEditorialImages().catch(() => 0),
      countPublishingQueuePending().catch(() => 0),
    ]);

  const translationQueuePending =
    (await countPendingJobs("translate_article").catch(() => 0)) +
    (await countPendingJobs("translation_batch").catch(() => 0));

  const reasons: string[] = [];
  if (aiQueuePending > limits.ai) reasons.push(`ai_queue:${aiQueuePending}>${limits.ai}`);
  if (imageQueuePending > limits.images)
    reasons.push(`image_queue:${imageQueuePending}>${limits.images}`);
  if (translationQueuePending > limits.translation)
    reasons.push(`translation_queue:${translationQueuePending}>${limits.translation}`);
  if (publishingQueuePending > limits.publishing)
    reasons.push(`publishing_queue:${publishingQueuePending}>${limits.publishing}`);

  const pauseIngestion = reasons.length > 0;
  // When any queue is over limit, drain oldest work first to unblock.
  const oldestFirst = pauseIngestion;

  return {
    aiQueuePending,
    imageQueuePending,
    translationQueuePending,
    publishingQueuePending,
    limits,
    pauseIngestion,
    oldestFirst,
    reasons,
    checkedAt: new Date().toISOString(),
  };
}

