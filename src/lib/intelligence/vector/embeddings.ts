/**
 * OpenAI embedding client — text-embedding-3-small (1536 dims)
 */

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
  error?: string;
  retryable?: boolean;
};

export async function embedTexts(
  texts: string[]
): Promise<(number[] | null)[]> {
  const result = await embedTextsSafe(texts);
  return result.embeddings;
}

/** Defensive OpenAI client — never throws; surfaces retry hints for workers */
export async function embedTextsSafe(
  texts: string[]
): Promise<EmbedTextsResult> {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey || texts.length === 0) {
    return { embeddings: texts.map(() => null) };
  }

  const inputs = texts.map((t) => t.slice(0, 8000));

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
    };

    const out: (number[] | null)[] = texts.map(() => null);
    for (const row of json.data ?? []) {
      const idx = row.index ?? 0;
      if (row.embedding?.length === DIM) out[idx] = row.embedding;
    }
    return { embeddings: out };
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
