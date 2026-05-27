/**
 * Validate AI processing lifecycle end-to-end:
 * news_ai_queue -> ai_enrich worker -> editorial_generate -> editorial_images
 */

import { createExecutionDeadline } from "@/lib/serverless/deadline";
import { runQueueWorker } from "@/lib/infrastructure/workers/registry";
import { createAdminServerClient } from "@/lib/supabase";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

type QueueCounts = {
  pending: number;
  processing: number;
  completed: number;
  failed: number;
};

async function getQueueCounts() {
  const supabase = createAdminServerClient();
  const { data } = await supabase.from("news_ai_queue").select("status");
  const counts: QueueCounts = {
    pending: 0,
    processing: 0,
    completed: 0,
    failed: 0,
  };
  for (const row of data ?? []) {
    const key = row.status as keyof QueueCounts;
    if (key in counts) counts[key] += 1;
  }
  return counts;
}

function loadEnvFile(name: string) {
  const path = resolve(process.cwd(), name);
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    if (
      (val.startsWith("\"") && val.endsWith("\"")) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = val;
  }
}

async function getGeneratedStats() {
  const supabase = createAdminServerClient();
  const { count } = await supabase
    .from("generated_articles")
    .select("id", { count: "exact", head: true });
  const { data: sample } = await supabase
    .from("generated_articles")
    .select("id, headline, created_at")
    .order("created_at", { ascending: false })
    .limit(5);
  return {
    count: count ?? 0,
    sample: sample ?? [],
  };
}

async function main() {
  loadEnvFile(".env.local");
  loadEnvFile(".env");

  const beforeQueue = await getQueueCounts();
  const beforeGenerated = await getGeneratedStats();

  const aiResult = await runQueueWorker("ai_enrich", {
    deadline: createExecutionDeadline(55_000),
    requestUrl: "http://localhost/api/debug/run-ai-pipeline-validate",
  });

  const editorialResult = await runQueueWorker("editorial_generate", {
    deadline: createExecutionDeadline(55_000),
    requestUrl: "http://localhost/api/debug/run-ai-pipeline-validate",
  });

  const imageResult = await runQueueWorker("editorial_images", {
    deadline: createExecutionDeadline(55_000),
    requestUrl: "http://localhost/api/debug/run-ai-pipeline-validate",
  });

  const afterQueue = await getQueueCounts();
  const afterGenerated = await getGeneratedStats();

  console.log(
    JSON.stringify(
      {
        tag: "[AI_PIPELINE_VALIDATE]",
        before: {
          queue: beforeQueue,
          generatedArticles: beforeGenerated.count,
          sampleGenerated: beforeGenerated.sample,
        },
        workers: {
          ai_enrich: aiResult,
          editorial_generate: editorialResult,
          editorial_images: imageResult,
        },
        after: {
          queue: afterQueue,
          generatedArticles: afterGenerated.count,
          sampleGenerated: afterGenerated.sample,
        },
        deltas: {
          generatedArticles: afterGenerated.count - beforeGenerated.count,
          queuePending: afterQueue.pending - beforeQueue.pending,
          queueProcessing: afterQueue.processing - beforeQueue.processing,
          queueCompleted: afterQueue.completed - beforeQueue.completed,
          queueFailed: afterQueue.failed - beforeQueue.failed,
        },
        ts: new Date().toISOString(),
      },
      null,
      2
    )
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
