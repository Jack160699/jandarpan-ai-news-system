/**
 * Cross-language story de-duplication ("one event → multiple language representations").
 *
 * A candidate event is embedded (multilingual bge-m3, the model the clusterer already uses) and
 * matched against recent PUBLISHED articles. Decision:
 *   - same language, similarity ≥ sameLanguage  → duplicate of a published story: skip
 *   - other language, similarity ≥ crossLanguage → the same story in another language: do not
 *     publish a second independent article (the translation workers give the published article its
 *     other-language variant)
 *   - otherwise                                  → distinct
 *
 * MODES (CROSS_LANG_DEDUPE_MODE): off | shadow (default: decide + record, never block) | enforce.
 * Thresholds are env-tunable (CROSS_LANG_SIM_THRESHOLD default 0.82, SAME_LANG_SIM_THRESHOLD 0.88) and
 * MUST be calibrated from the shadow-mode rows in story_language_links before enforcing.
 * Any infrastructure failure yields "distinct" — dedupe never blocks the pipeline by breaking.
 */

import { createAdminServerClient } from "@/lib/supabase";
import { requestCloudflareEmbeddings, CLOUDFLARE_EMBEDDING_DIMENSIONS } from "@/lib/ai/providers/cloudflare-embeddings";

export type DedupeMode = "off" | "shadow" | "enforce";
export type DedupeDecision = "duplicate_same_language" | "cross_language_variant" | "distinct";

export type DedupeThresholds = { sameLanguage: number; crossLanguage: number };

export function dedupeMode(env: Record<string, string | undefined> = process.env): DedupeMode {
  const m = env.CROSS_LANG_DEDUPE_MODE?.trim().toLowerCase();
  return m === "off" || m === "enforce" ? m : "shadow";
}

export function dedupeThresholds(env: Record<string, string | undefined> = process.env): DedupeThresholds {
  const num = (k: string, d: number) => {
    const v = Number(env[k]);
    return Number.isFinite(v) && v > 0.5 && v <= 1 ? v : d;
  };
  return { sameLanguage: num("SAME_LANG_SIM_THRESHOLD", 0.88), crossLanguage: num("CROSS_LANG_SIM_THRESHOLD", 0.82) };
}

export function cosineSimilarity(a: readonly number[], b: readonly number[]): number {
  if (a.length !== b.length || a.length === 0) return 0;
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i]! * b[i]!;
    na += a[i]! * a[i]!;
    nb += b[i]! * b[i]!;
  }
  return na && nb ? dot / (Math.sqrt(na) * Math.sqrt(nb)) : 0;
}

/** Pure decision from a similarity score. */
export function decideDuplicate(input: {
  similarity: number;
  candidateLanguage: string | null | undefined;
  matchedLanguage: string | null | undefined;
  thresholds?: DedupeThresholds;
}): DedupeDecision {
  const t = input.thresholds ?? dedupeThresholds();
  const same = (input.candidateLanguage ?? "") === (input.matchedLanguage ?? "");
  if (same) return input.similarity >= t.sameLanguage ? "duplicate_same_language" : "distinct";
  return input.similarity >= t.crossLanguage ? "cross_language_variant" : "distinct";
}

/** Text embedded for a story: headline + first part of the summary (language-agnostic content). */
export function embeddingTextFor(headline: string, summary?: string | null): string {
  return `${headline.trim()}. ${(summary ?? "").trim().slice(0, 400)}`.trim();
}

async function embed(text: string): Promise<number[] | null> {
  const r = await requestCloudflareEmbeddings({ operation: "story_dedupe", texts: [text] });
  if ("error" in r) return null;
  const v = r.vectors[0];
  return v && v.length === CLOUDFLARE_EMBEDDING_DIMENSIONS ? v : null;
}

export type DuplicateCheck = {
  decision: DedupeDecision;
  mode: DedupeMode;
  enforced: boolean;
  similarity: number | null;
  match: { articleId: string; language: string | null; headline: string } | null;
};

const DISTINCT: DuplicateCheck = { decision: "distinct", mode: "shadow", enforced: false, similarity: null, match: null };

export async function checkStoryDuplicate(input: {
  eventId: string;
  headline: string;
  summary?: string | null;
  language: string;
  sinceHours?: number;
}): Promise<DuplicateCheck> {
  const mode = dedupeMode();
  if (mode === "off") return { ...DISTINCT, mode: "shadow" };
  try {
    const vector = await embed(embeddingTextFor(input.headline, input.summary));
    if (!vector) return { ...DISTINCT, mode };
    const since = new Date(Date.now() - (input.sinceHours ?? 72) * 3_600_000).toISOString();
    const supabase = createAdminServerClient();
    const { data } = await supabase.rpc("match_recent_story_embeddings" as never, {
      p_embedding: JSON.stringify(vector),
      p_since: since,
      p_min_similarity: 0.7,
      p_limit: 3,
    } as never);
    const rows = ((data ?? []) as unknown) as Array<{ article_id: string; language: string | null; headline: string; similarity: number }>;
    const thresholds = dedupeThresholds();

    // Evaluate every close neighbour; the strongest qualifying decision wins.
    let best: { decision: DedupeDecision; row: (typeof rows)[number] } | null = null;
    for (const row of rows) {
      const decision = decideDuplicate({ similarity: row.similarity, candidateLanguage: input.language, matchedLanguage: row.language, thresholds });
      if (decision !== "distinct" && (!best || row.similarity > best.row.similarity)) best = { decision, row };
    }
    const top = rows[0] ?? null;
    const chosen = best ?? (top ? { decision: "distinct" as const, row: top } : null);

    if (chosen) {
      // Record every near neighbour (shadow mode's whole purpose is calibrating thresholds).
      void supabase
        .from("story_language_links" as never)
        .upsert(
          {
            event_id: input.eventId,
            candidate_language: input.language,
            matched_article_id: chosen.row.article_id,
            matched_language: chosen.row.language,
            similarity: chosen.row.similarity,
            decision: chosen.decision,
            mode,
            enforced: mode === "enforce" && chosen.decision !== "distinct",
          } as never,
          { onConflict: "event_id,matched_article_id", ignoreDuplicates: true }
        )
        .then(() => undefined, () => undefined);
    }

    if (!best) return { decision: "distinct", mode, enforced: false, similarity: top?.similarity ?? null, match: null };
    return {
      decision: best.decision,
      mode,
      enforced: mode === "enforce",
      similarity: best.row.similarity,
      match: { articleId: best.row.article_id, language: best.row.language, headline: best.row.headline },
    };
  } catch {
    return { ...DISTINCT, mode };
  }
}

/** Embed a newly published article so later candidates can match against it (best effort). */
export async function storeArticleEmbedding(article: {
  id: string;
  headline: string;
  summary?: string | null;
  language?: string | null;
}): Promise<void> {
  if (dedupeMode() === "off") return;
  try {
    const vector = await embed(embeddingTextFor(article.headline, article.summary));
    if (!vector) return;
    await createAdminServerClient()
      .from("intelligence_embeddings_cf" as never)
      .upsert(
        {
          entity_type: "article",
          entity_id: article.id,
          model: "@cf/baai/bge-m3",
          content_hash: article.headline.slice(0, 64),
          embedding: JSON.stringify(vector),
          metadata: { language: article.language ?? null },
          updated_at: new Date().toISOString(),
        } as never,
        { onConflict: "entity_type,entity_id" }
      );
  } catch {
    /* best effort */
  }
}
