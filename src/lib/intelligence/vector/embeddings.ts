/**
 * Embedding client — Cloudflare Workers AI (free tier) first, OpenAI
 * text-embedding-3-small (1536 dims) as an explicitly-enabled fallback.
 */

import {
  buildUsageRecord,
  logOpenAiUsage,
  parseEmbeddingUsage,
} from "@/lib/observability/openai-cost";
import type { OpenAiCallContext } from "@/lib/observability/openai-cost";
import {
  CLOUDFLARE_EMBEDDING_DIMENSIONS,
  isCloudflareEmbeddingsConfigured,
  requestCloudflareEmbeddings,
} from "@/lib/ai/providers/cloudflare-embeddings";
import { isOpenAiProviderEnabled } from "@/lib/ai/providers/router";

const MODEL = process.env.OPENAI_EMBEDDING_MODEL?.trim() || "text-embedding-3-small";
const DIM = 1536;

export function embeddingModel(): string {
  return MODEL;
}

export function embeddingDimensions(): number {
  return DIM;
}

export type EmbedTextsResult = {
  embeddings: (number[] | null)[];
  /** Model id that produced `embeddings` — absent when the safe empty
   * fallback was returned (no provider configured/enabled). */
  model?: string;
  /** Vector width of `embeddings` — callers must check this before writing
   * to a fixed-dimension pgvector column. */
  dimensions?: number;
  provider?: "openai" | "cloudflare";
  error?: string;
  retryable?: boolean;
};

export async function embedTexts(
  texts: string[]
): Promise<(number[] | null)[]> {
  const result = await embedTextsSafe(texts);
  // TODO(migration-070): once intelligence_embeddings_cf exists, vector-store.ts
  // must branch on embedding.model/dimensions to pick the write target. Until
  // then this legacy wrapper (the only path vector-store.ts uses) only
  // forwards OpenAI-dimensioned (1536) vectors through — intelligence_embeddings
  // .embedding is a fixed vector(1536) column, and Cloudflare's
  // CLOUDFLARE_EMBEDDING_DIMENSIONS-dim vectors must not be written into it.
  if (result.dimensions && result.dimensions !== DIM) {
    return texts.map(() => null);
  }
  return result.embeddings;
}

/** Defensive embedding client — never throws; surfaces retry hints for workers.
 * Tries Cloudflare (free tier) first when configured, falling back to OpenAI
 * only when explicitly enabled via AI_PROVIDER_OPENAI_ENABLED. */
export async function embedTextsSafe(
  texts: string[],
  context?: OpenAiCallContext & { operation?: string }
): Promise<EmbedTextsResult> {
  if (texts.length === 0) {
    return { embeddings: [] };
  }

  if (isCloudflareEmbeddingsConfigured()) {
    const cfResult = await requestCloudflareEmbeddings({
      operation: context?.operation ?? "embeddings",
      texts,
      context: {
        worker: context?.worker,
        cron: context?.cron,
        articleId: context?.articleId,
        eventId: context?.eventId,
        tenantId: context?.tenantId,
      },
    });
    if ("vectors" in cfResult && cfResult.vectors.length === texts.length) {
      return {
        embeddings: cfResult.vectors,
        model: cfResult.model,
        dimensions: CLOUDFLARE_EMBEDDING_DIMENSIONS,
        provider: "cloudflare",
      };
    }
    // Cloudflare configured but the request failed/mismatched — best-effort,
    // fall through to the OpenAI path below rather than giving up.
  }

  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!isOpenAiProviderEnabled() || !apiKey) {
    return { embeddings: texts.map(() => null) };
  }

  const inputs = texts.map((t) => t.slice(0, 8000));
  const started = Date.now();

  try {
    const res = await fetch("https://api.openai.com/v1/embeddings", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ model: MODEL, input: inputs }),
      signal: AbortSignal.timeout(45_000),
    });

    if (!res.ok) {
      const retryable = res.status === 429 || res.status >= 500;
      let detail = `openai_http_${res.status}`;
      try {
        const errJson = (await res.json()) as { error?: { message?: string } };
        if (errJson.error?.message) detail = errJson.error.message.slice(0, 200);
      } catch {
        /* ignore parse */
      }
      return {
        embeddings: texts.map(() => null),
        error: detail,
        retryable,
      };
    }

    const json = (await res.json()) as {
      data?: Array<{ embedding?: number[]; index?: number }>;
      usage?: Record<string, unknown>;
    };

    const usage = parseEmbeddingUsage(json);
    logOpenAiUsage(
      buildUsageRecord({
        operation: context?.operation ?? "embeddings",
        endpoint: "embeddings",
        model: MODEL,
        inputTokens: usage.inputTokens,
        outputTokens: 0,
        latencyMs: Date.now() - started,
        success: true,
        user: inputs.join("\n").slice(0, 2000),
        context,
        metadata: { batchSize: texts.length },
      })
    );

    const out: (number[] | null)[] = texts.map(() => null);
    for (const row of json.data ?? []) {
      const idx = row.index ?? 0;
      if (row.embedding?.length === DIM) out[idx] = row.embedding;
    }
    return { embeddings: out, model: MODEL, dimensions: DIM, provider: "openai" };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "openai_embed_failed";
    return {
      embeddings: texts.map(() => null),
      error: msg,
      retryable: true,
    };
  }
}

export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length || a.length === 0) return 0;
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  const denom = Math.sqrt(na) * Math.sqrt(nb);
  return denom === 0 ? 0 : dot / denom;
}

export function contentHash(text: string): string {
  let h = 0;
  const s = text.slice(0, 500);
  for (let i = 0; i < s.length; i++) {
    h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  }
  return `h${(h >>> 0).toString(16)}`;
}
