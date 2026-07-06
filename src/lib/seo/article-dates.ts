import type { GeneratedArticleRow } from "@/lib/types/newsroom";
import type { NewsArticleRow } from "@/lib/types/news-article";

/** Best-effort modified time for generated rows (no updated_at column in DB). */
export function resolveGeneratedArticleModifiedAt(
  row: GeneratedArticleRow
): string | null {
  return (
    row.editorial_metadata?.image?.processed_at ??
    row.editorial_metadata?.generated_at ??
    row.published_at ??
    row.created_at
  );
}

export function resolveNewsArticleModifiedAt(
  article: Pick<NewsArticleRow, "updated_at" | "published_at" | "created_at">
): string | null {
  return article.updated_at ?? article.published_at ?? article.created_at;
}
