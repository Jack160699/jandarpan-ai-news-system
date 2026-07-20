/**
 * Step 3 — early duplicate detection before expensive image/page work.
 */

import { canonicalArticleUrl } from "@/lib/news/normalize";
import type { NormalizedArticle } from "@/lib/news/types";
import { createAdminServerClient, isSupabaseConfigured } from "@/lib/supabase";

export type EarlyDedupReason =
  | "provider_id"
  | "canonical_url"
  | "known_signal"
  | "batch_url"
  | "batch_title";

export type EarlyDedupMetrics = {
  input: number;
  uniqueCandidates: number;
  earlyDuplicateProviderId: number;
  earlyDuplicateCanonicalUrl: number;
  earlyDuplicateKnownSignal: number;
  earlyDuplicateBatch: number;
  passed: number;
  lookupBatches: number;
};

export type EarlyDedupResult = {
  novel: NormalizedArticle[];
  metrics: EarlyDedupMetrics;
};

const LOOKUP_CHUNK = 200;

function chunkArray<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    out.push(items.slice(i, i + size));
  }
  return out;
}

/**
 * Batch-load existing signal URLs. Uses `.in()` chunks — not N+1.
 */
export async function lookupKnownSignalUrls(
  urls: string[],
  tenantId?: string | null
): Promise<Set<string>> {
  const known = new Set<string>();
  if (!urls.length || !isSupabaseConfigured()) return known;

  const canonical = [
    ...new Set(
      urls
        .map((u) => {
          try {
            return canonicalArticleUrl(u);
          } catch {
            return u.trim().toLowerCase();
          }
        })
        .filter(Boolean)
    ),
  ];

  try {
    const supabase = createAdminServerClient();
    for (const batch of chunkArray(canonical, LOOKUP_CHUNK)) {
      let q = supabase
        .from("news_signals")
        .select("article_url")
        .in("article_url", batch);
      if (tenantId) q = q.eq("tenant_id", tenantId);
      const { data } = await q;
      for (const row of data ?? []) {
        const url = String((row as { article_url?: string }).article_url ?? "");
        if (url) known.add(canonicalArticleUrl(url));
      }
    }
  } catch (err) {
    console.warn("[early-dedup] known URL lookup failed:", err);
  }

  return known;
}

/**
 * Filter articles that already exist as news_signals (by canonical URL)
 * before image enrichment / page scraping.
 */
export async function filterKnownSignalDuplicates(
  articles: NormalizedArticle[],
  options?: { tenantId?: string | null }
): Promise<EarlyDedupResult> {
  const metrics: EarlyDedupMetrics = {
    input: articles.length,
    uniqueCandidates: 0,
    earlyDuplicateProviderId: 0,
    earlyDuplicateCanonicalUrl: 0,
    earlyDuplicateKnownSignal: 0,
    earlyDuplicateBatch: 0,
    passed: 0,
    lookupBatches: 0,
  };

  if (!articles.length) {
    return { novel: [], metrics };
  }

  // In-batch URL collapse first (cheap).
  const seen = new Set<string>();
  const candidates: NormalizedArticle[] = [];
  for (const article of articles) {
    const canon = canonicalArticleUrl(article.article_url);
    if (seen.has(canon)) {
      metrics.earlyDuplicateBatch += 1;
      continue;
    }
    seen.add(canon);
    candidates.push({ ...article, article_url: canon });
  }
  metrics.uniqueCandidates = candidates.length;

  const urls = candidates.map((a) => a.article_url);
  metrics.lookupBatches = Math.ceil(urls.length / LOOKUP_CHUNK) || 0;
  const known = await lookupKnownSignalUrls(urls, options?.tenantId);

  const novel: NormalizedArticle[] = [];
  for (const article of candidates) {
    const canon = canonicalArticleUrl(article.article_url);
    if (known.has(canon)) {
      metrics.earlyDuplicateKnownSignal += 1;
      continue;
    }
    novel.push(article);
  }

  metrics.passed = novel.length;
  return { novel, metrics };
}

export function mergeEarlyDedupMetrics(
  a: EarlyDedupMetrics,
  b: EarlyDedupMetrics
): EarlyDedupMetrics {
  return {
    input: a.input + b.input,
    uniqueCandidates: a.uniqueCandidates + b.uniqueCandidates,
    earlyDuplicateProviderId:
      a.earlyDuplicateProviderId + b.earlyDuplicateProviderId,
    earlyDuplicateCanonicalUrl:
      a.earlyDuplicateCanonicalUrl + b.earlyDuplicateCanonicalUrl,
    earlyDuplicateKnownSignal:
      a.earlyDuplicateKnownSignal + b.earlyDuplicateKnownSignal,
    earlyDuplicateBatch: a.earlyDuplicateBatch + b.earlyDuplicateBatch,
    passed: a.passed + b.passed,
    lookupBatches: a.lookupBatches + b.lookupBatches,
  };
}

export function emptyEarlyDedupMetrics(): EarlyDedupMetrics {
  return {
    input: 0,
    uniqueCandidates: 0,
    earlyDuplicateProviderId: 0,
    earlyDuplicateCanonicalUrl: 0,
    earlyDuplicateKnownSignal: 0,
    earlyDuplicateBatch: 0,
    passed: 0,
    lookupBatches: 0,
  };
}
