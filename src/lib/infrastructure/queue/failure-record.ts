/**
 * Structured queue failure records — Redis ring buffer (no DB schema changes)
 */

import { cacheGetJson, cacheSetJson } from "@/lib/infrastructure/cache";

export type FailureCategory =
  | "openai"
  | "prompt"
  | "storage"
  | "moderation"
  | "timeout"
  | "duplicate"
  | "database"
  | "network"
  | "unknown";

export type QueueFailureRecord = {
  id: string;
  ts: string;
  worker: "ai_enrich" | "editorial_images";
  articleId: string | number;
  error: string;
  category: FailureCategory;
  provider?: string;
  httpStatus?: number;
  retryCount: number;
  terminal: boolean;
};

const MAX_FAILURES = 100;
const TTL_SEC = 86_400;

const KEYS = {
  ai: "ops:failures:ai:v1",
  editorial: "ops:failures:editorial:v1",
} as const;

const memoryAi: QueueFailureRecord[] = [];
const memoryEditorial: QueueFailureRecord[] = [];

function pushRing(buf: QueueFailureRecord[], item: QueueFailureRecord): void {
  buf.push(item);
  if (buf.length > MAX_FAILURES) buf.shift();
}

async function persist(key: string, buf: QueueFailureRecord[]): Promise<void> {
  const trimmed = buf.slice(-MAX_FAILURES);
  await cacheSetJson(key, trimmed, TTL_SEC);
}

export function classifyFailureCategory(error: string): FailureCategory {
  const e = error.toLowerCase();
  if (e.includes("openai") || e.includes("rate_limit") || e.includes("dall-e")) return "openai";
  if (e.includes("prompt") || e.includes("moderation")) return e.includes("moderation") ? "moderation" : "prompt";
  if (e.includes("storage") || e.includes("upload")) return "storage";
  if (e.includes("timeout") || e.includes("abort")) return "timeout";
  if (e.includes("duplicate")) return "duplicate";
  if (e.includes("article_not_found") || e.includes("database")) return "database";
  if (e.includes("fetch") || e.includes("network")) return "network";
  return "unknown";
}

export async function recordQueueFailure(
  input: Omit<QueueFailureRecord, "id" | "ts" | "category"> & { category?: FailureCategory }
): Promise<void> {
  const record: QueueFailureRecord = {
    id: `${input.worker}:${String(input.articleId)}:${Date.now()}`,
    ts: new Date().toISOString(),
    category: input.category ?? classifyFailureCategory(input.error),
    ...input,
  };

  const key = input.worker === "ai_enrich" ? KEYS.ai : KEYS.editorial;
  const memory = input.worker === "ai_enrich" ? memoryAi : memoryEditorial;

  pushRing(memory, record);
  const remote = (await cacheGetJson<QueueFailureRecord[]>(key)) ?? [...memory];
  pushRing(remote, record);
  await persist(key, remote);

  console.error(
    JSON.stringify({
      tag: "[queue-failure]",
      worker: record.worker,
      articleId: String(record.articleId),
      error: record.error,
      category: record.category,
      provider: record.provider ?? null,
      httpStatus: record.httpStatus ?? null,
      retryCount: record.retryCount,
      terminal: record.terminal,
      ts: record.ts,
    })
  );
}

export async function getQueueFailureRecords(
  worker: "ai_enrich" | "editorial_images",
  limit = 25
): Promise<QueueFailureRecord[]> {
  const key = worker === "ai_enrich" ? KEYS.ai : KEYS.editorial;
  const memory = worker === "ai_enrich" ? memoryAi : memoryEditorial;
  const remote = (await cacheGetJson<QueueFailureRecord[]>(key)) ?? memory;
  return remote.slice(-limit).reverse();
}

export function summarizeFailures(records: QueueFailureRecord[]): {
  total: number;
  terminal: number;
  byCategory: Record<string, number>;
} {
  const byCategory: Record<string, number> = {};
  let terminal = 0;
  for (const r of records) {
    byCategory[r.category] = (byCategory[r.category] ?? 0) + 1;
    if (r.terminal) terminal++;
  }
  return { total: records.length, terminal, byCategory };
}
