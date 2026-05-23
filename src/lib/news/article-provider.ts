/**
 * Ingestion provider id (gnews, rss, …) — stored in `news_articles.source` on DBs
 * without a dedicated `provider` column (migration 001 schema).
 */

const KNOWN_PROVIDER_IDS = new Set([
  "gnews",
  "newsdata",
  "rss",
  "editorial",
  "generated",
  "wire",
]);

export function resolveArticleProvider(article: {
  source?: string | null;
  provider?: string | null;
}): string | null {
  const explicit = article.provider?.trim().toLowerCase();
  if (explicit && KNOWN_PROVIDER_IDS.has(explicit)) return explicit;

  const fromSource = article.source?.trim().toLowerCase();
  if (fromSource && KNOWN_PROVIDER_IDS.has(fromSource)) return fromSource;

  return article.provider?.trim() || null;
}
