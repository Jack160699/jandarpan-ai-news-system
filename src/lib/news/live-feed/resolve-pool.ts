/**
 * Unified live article pool — database → wire APIs → static fallback.
 */

import { getStaticFallbackArticlePool } from "@/lib/news/fallback/wire-articles";
import { fetchWireArticlesForDisplay } from "@/lib/news/live-feed/fetch-wire-display";
import { errorLiveFeed, logLiveFeed, warnLiveFeed } from "@/lib/news/live-feed/logger";
import { wireArticlesToGeneratedPool } from "@/lib/news/live-feed/wire-to-generated";
import { fetchGeneratedArticlePool } from "@/lib/newsroom/generated/read";
import { isSupabaseConfigured } from "@/lib/supabase";
import type { GeneratedArticleRow } from "@/lib/types/newsroom";

export type LivePoolSource = "database" | "wire_api" | "static_fallback" | "mixed";

export type LivePoolDiagnostics = {
  dbCount: number;
  wireCount: number;
  finalCount: number;
  source: LivePoolSource;
  supabaseConfigured: boolean;
  rateLimited: boolean;
  errors: string[];
  providersAttempted: string[];
};

export type ResolvedLivePool = {
  rows: GeneratedArticleRow[];
  diagnostics: LivePoolDiagnostics;
};

const MIN_DB_ROWS = 3;

function mergePools(
  primary: GeneratedArticleRow[],
  secondary: GeneratedArticleRow[]
): GeneratedArticleRow[] {
  const seen = new Set(primary.map((r) => r.id));
  const merged = [...primary];
  for (const row of secondary) {
    if (seen.has(row.id)) continue;
    seen.add(row.id);
    merged.push(row);
  }
  return merged;
}

/**
 * Resolve articles for homepage + live polling. Never returns an empty array.
 */
export async function resolveLiveArticlePool(
  limit = 120
): Promise<ResolvedLivePool> {
  const diagnostics: LivePoolDiagnostics = {
    dbCount: 0,
    wireCount: 0,
    finalCount: 0,
    source: "static_fallback",
    supabaseConfigured: isSupabaseConfigured(),
    rateLimited: false,
    errors: [],
    providersAttempted: [],
  };

  let dbRows: GeneratedArticleRow[] = [];

  if (diagnostics.supabaseConfigured) {
    try {
      dbRows = await fetchGeneratedArticlePool(limit);
      diagnostics.dbCount = dbRows.length;
      logLiveFeed("db_pool", { count: dbRows.length });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "db_fetch_failed";
      diagnostics.errors.push(msg);
      errorLiveFeed("db_pool_failed", { error: msg });
    }
  } else {
    warnLiveFeed("db_skip", { reason: "supabase_not_configured" });
    diagnostics.errors.push("supabase_not_configured");
  }

  if (dbRows.length >= MIN_DB_ROWS) {
    diagnostics.source = "database";
    diagnostics.finalCount = dbRows.length;
    return { rows: dbRows.slice(0, limit), diagnostics };
  }

  let wireRows: GeneratedArticleRow[] = [];
  try {
    const wire = await fetchWireArticlesForDisplay(Math.min(limit, 80));
    diagnostics.rateLimited = wire.rateLimited;
    diagnostics.errors.push(...wire.errors);
    diagnostics.providersAttempted = wire.providersAttempted;
    wireRows = wireArticlesToGeneratedPool(wire.articles, limit);
    diagnostics.wireCount = wireRows.length;
  } catch (err) {
    const msg = err instanceof Error ? err.message : "wire_fetch_failed";
    diagnostics.errors.push(msg);
    errorLiveFeed("wire_pool_failed", { error: msg });
  }

  if (wireRows.length > 0) {
    const merged = mergePools(dbRows, wireRows);
    diagnostics.source = dbRows.length > 0 ? "mixed" : "wire_api";
    diagnostics.finalCount = merged.length;
    logLiveFeed("pool_resolved", {
      source: diagnostics.source,
      count: merged.length,
      rateLimited: diagnostics.rateLimited,
    });
    return { rows: merged.slice(0, limit), diagnostics };
  }

  if (dbRows.length > 0) {
    diagnostics.source = "database";
    diagnostics.finalCount = dbRows.length;
    warnLiveFeed("pool_sparse_db_only", { count: dbRows.length });
    return { rows: dbRows, diagnostics };
  }

  const fallback = getStaticFallbackArticlePool();
  diagnostics.source = "static_fallback";
  diagnostics.finalCount = fallback.length;
  warnLiveFeed("pool_static_fallback", {
    reason: diagnostics.errors.join("; ") || "empty_db_and_wire",
    rateLimited: diagnostics.rateLimited,
  });

  return { rows: fallback, diagnostics };
}
