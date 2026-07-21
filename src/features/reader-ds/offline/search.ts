import { listOfflineArticles } from "./db";
import type { OfflineArticleRecord, OfflineSort } from "./types";

export function sortOfflineArticles(
  rows: OfflineArticleRecord[],
  sort: OfflineSort
): OfflineArticleRecord[] {
  const copy = [...rows];
  switch (sort) {
    case "oldest":
      return copy.sort((a, b) => a.downloadedAt.localeCompare(b.downloadedAt));
    case "district":
      return copy.sort((a, b) => (a.district ?? "").localeCompare(b.district ?? "") || b.downloadedAt.localeCompare(a.downloadedAt));
    case "category":
      return copy.sort((a, b) => a.category.localeCompare(b.category) || b.downloadedAt.localeCompare(a.downloadedAt));
    case "newest":
    default:
      return copy.sort((a, b) => b.downloadedAt.localeCompare(a.downloadedAt));
  }
}

/** Offline search — downloaded content only. */
export async function searchOfflineArticles(query: string): Promise<OfflineArticleRecord[]> {
  const q = query.trim().toLowerCase();
  const rows = await listOfflineArticles();
  if (!q) return sortOfflineArticles(rows, "newest");
  return sortOfflineArticles(
    rows.filter((r) => {
      const blob = [
        r.headline,
        r.summary ?? "",
        r.category,
        r.district ?? "",
        r.author,
        r.kicker,
        ...r.tags,
        ...r.paragraphs.slice(0, 4),
      ]
        .join(" ")
        .toLowerCase();
      return blob.includes(q);
    }),
    "newest"
  );
}
