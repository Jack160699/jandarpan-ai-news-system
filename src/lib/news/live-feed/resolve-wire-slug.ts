/**
 * Resolve ephemeral wire / snapshot slugs for /story/[slug] when not in Supabase.
 * Homepage can surface wire-pool rows whose slugs are never persisted to DB.
 */

import { getWireArticlesCached } from "@/lib/news/live-feed/wire-cache";
import { warnLiveFeed } from "@/lib/news/live-feed/logger";
import { loadStaleSnapshot } from "@/lib/news/live-feed/stale-snapshot";
import { wireArticlesToGeneratedPool } from "@/lib/news/live-feed/wire-to-generated";
import type { GeneratedArticleRow } from "@/lib/types/newsroom";

function findSlugInRows(
  rows: GeneratedArticleRow[],
  slug: string
): GeneratedArticleRow | null {
  const decoded = decodeURIComponent(slug).trim();
  return (
    rows.find(
      (row) =>
        row.slug === decoded ||
        row.slug === slug ||
        row.slug?.toLowerCase() === decoded.toLowerCase()
    ) ?? null
  );
}

/** Lookup a homepage wire row by slug (micro-cache aligned with wire feed). */
export async function getWireGeneratedArticleBySlug(
  slug: string
): Promise<GeneratedArticleRow | null> {
  const decoded = decodeURIComponent(slug).trim();
  if (!decoded) return null;

  const snapshot = await loadStaleSnapshot();
  if (snapshot?.rows?.length) {
    const fromSnapshot = findSlugInRows(snapshot.rows, decoded);
    if (fromSnapshot) {
      warnLiveFeed("generated_slug_snapshot_hit", { slug: decoded });
      return fromSnapshot;
    }
  }

  const wire = await getWireArticlesCached(120);
  if (!wire.articles.length) return null;

  const pool = wireArticlesToGeneratedPool(wire.articles, 120);
  const match = findSlugInRows(pool, decoded);
  if (match) {
    warnLiveFeed("generated_slug_wire_hit", {
      slug: decoded,
      provider: match.editorial_metadata?.source_attribution?.[0]?.provider,
    });
  }
  return match;
}
