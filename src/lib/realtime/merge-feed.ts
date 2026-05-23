import type { GeneratedHomepageFeed, HomeArticle } from "@/lib/homepage/types";
import type { LiveHomepageSnapshot } from "@/lib/realtime/types";

export function articleIds(articles: HomeArticle[]): Set<string> {
  return new Set(articles.map((a) => a.id));
}

export function findNewArticleIds(
  existing: HomeArticle[],
  incoming: HomeArticle[]
): string[] {
  const seen = articleIds(existing);
  return incoming.filter((a) => !seen.has(a.id)).map((a) => a.id);
}

/** Prepend new wire items without duplicates; cap total length */
export function prependWireItems(
  current: HomeArticle[],
  incoming: HomeArticle[],
  maxInsert: number,
  maxTotal = 12
): { merged: HomeArticle[]; newIds: string[] } {
  const newOnes = incoming.filter((a) => !articleIds(current).has(a.id));
  const toAdd = newOnes.slice(0, maxInsert);
  const newIds = toAdd.map((a) => a.id);
  const merged = [...toAdd, ...current]
    .filter((a, i, arr) => arr.findIndex((x) => x.id === a.id) === i)
    .slice(0, maxTotal);
  return { merged, newIds };
}

export function shouldShowUpdateBanner(
  current: GeneratedHomepageFeed,
  snapshot: LiveHomepageSnapshot
): boolean {
  const newTrending = findNewArticleIds(current.trending, snapshot.trending);
  if (newTrending.length >= 3) return true;

  const leadChanged =
    snapshot.breakingTicker[0]?.id != null &&
    snapshot.breakingTicker[0]?.id !== current.breakingTicker[0]?.id;

  const newBreaking = findNewArticleIds(
    current.breakingTicker,
    snapshot.breakingTicker
  );
  if (newBreaking.length >= 2) return true;

  return leadChanged;
}

/** Apply pending snapshot to full homepage feed (user tapped refresh) */
export function applySnapshotToFeed(
  current: GeneratedHomepageFeed,
  snapshot: LiveHomepageSnapshot
): GeneratedHomepageFeed {
  const heroLead = snapshot.breakingTicker[0] ?? current.editorsPicks.lead;

  return {
    ...current,
    breakingTicker: snapshot.breakingTicker,
    liveWire: snapshot.liveWire,
    trending: mergeTrending(current.trending, snapshot.trending),
    localBreakingAlerts: snapshot.localBreakingAlerts,
    editorsPicks: {
      lead: heroLead,
      supporting: mergeSupporting(
        current.editorsPicks.supporting,
        snapshot.trending
      ),
    },
    fetchedAt: snapshot.fetchedAt,
  };
}

function mergeTrending(
  current: HomeArticle[],
  incoming: HomeArticle[]
): HomeArticle[] {
  const seen = new Set<string>();
  const out: HomeArticle[] = [];
  for (const a of [...incoming, ...current]) {
    if (seen.has(a.id)) continue;
    seen.add(a.id);
    out.push(a);
  }
  return out.slice(0, 16);
}

function mergeSupporting(
  current: HomeArticle[],
  pool: HomeArticle[]
): HomeArticle[] {
  const leadId = pool[0]?.id;
  const extra = pool.filter((a) => a.id !== leadId).slice(0, 4);
  const seen = new Set<string>();
  const out: HomeArticle[] = [];
  for (const a of [...extra, ...current]) {
    if (seen.has(a.id)) continue;
    seen.add(a.id);
    out.push(a);
  }
  return out.slice(0, 4);
}
