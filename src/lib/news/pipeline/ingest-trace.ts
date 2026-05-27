/**
 * TEMPORARY — structured ingest persistence tracing.
 * Enable with INGEST_TRACE=1. Remove after root-cause is confirmed.
 */

type TraceRow = Record<string, unknown>;

function isEnabled(): boolean {
  return process.env.INGEST_TRACE === "1";
}

export function logIngestTrace(
  phase: string,
  payload: Record<string, unknown> = {}
): void {
  if (!isEnabled()) return;
  console.log(
    JSON.stringify({
      tag: "[INGEST_TRACE]",
      phase,
      ts: new Date().toISOString(),
      ...payload,
    })
  );
}

/** Redact large fields; keep fields relevant to DB constraints. */
export function summarizeInsertRows(
  rows: TraceRow[],
  limit = 2
): TraceRow[] {
  return rows.slice(0, limit).map((row) => ({
    title: typeof row.title === "string" ? row.title.slice(0, 120) : row.title,
    article_url:
      typeof row.article_url === "string"
        ? row.article_url.slice(0, 200)
        : row.article_url,
    provider: row.provider,
    category: row.category,
    tenant_id: row.tenant_id,
    slug: row.slug,
    language: row.language,
    region: row.region,
    published_at: row.published_at,
    has_image: Boolean(row.image_url),
    title_hash: row.title_hash,
    url_hash: row.url_hash,
  }));
}

export function formatSupabaseError(error: {
  code?: string;
  message?: string;
  details?: string;
  hint?: string;
}): Record<string, unknown> {
  return {
    code: error.code ?? null,
    message: error.message ?? String(error),
    details: error.details ?? null,
    hint: error.hint ?? null,
  };
}
