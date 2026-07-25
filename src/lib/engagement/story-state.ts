/**
 * Minimal client story-read cursor for “what changed since last visit”.
 * Stores only article id, optional event id, and last-read timestamp.
 */

export const STORY_STATE_KEY = "jd-story-state-v1";
export const BRIEFING_CONSUMED_KEY = "jd-briefing-consumed-v1";

export type StoryReadState = {
  articleId: string;
  eventId?: string | null;
  lastReadAt: string;
};

type StoryStateStore = Record<string, StoryReadState>;

function readStore(): StoryStateStore {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(STORY_STATE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as StoryStateStore;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function writeStore(store: StoryStateStore) {
  if (typeof window === "undefined") return;
  try {
    // Cap to last 80 articles — retention without invasive history
    const entries = Object.entries(store)
      .sort(
        (a, b) =>
          new Date(b[1].lastReadAt).getTime() -
          new Date(a[1].lastReadAt).getTime()
      )
      .slice(0, 80);
    window.localStorage.setItem(
      STORY_STATE_KEY,
      JSON.stringify(Object.fromEntries(entries))
    );
  } catch {
    /* quota / private mode */
  }
}

export function getStoryReadState(articleId: string): StoryReadState | null {
  if (!articleId) return null;
  return readStore()[articleId] ?? null;
}

export function getEventLastReadAt(eventId: string): string | null {
  if (!eventId) return null;
  const store = readStore();
  let latest: string | null = null;
  for (const row of Object.values(store)) {
    if (row.eventId !== eventId) continue;
    if (!latest || row.lastReadAt > latest) latest = row.lastReadAt;
  }
  return latest;
}

export function markStoryRead(input: {
  articleId: string;
  eventId?: string | null;
  at?: string;
}) {
  if (!input.articleId || typeof window === "undefined") return;
  const store = readStore();
  store[input.articleId] = {
    articleId: input.articleId,
    eventId: input.eventId ?? null,
    lastReadAt: input.at ?? new Date().toISOString(),
  };
  writeStore(store);
}

export type BriefingConsumed = {
  dateKey: string;
  dayPart: string;
  districtSlug: string;
  consumedSlugs: string[];
};

export function readBriefingConsumed(): BriefingConsumed | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(BRIEFING_CONSUMED_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as BriefingConsumed;
  } catch {
    return null;
  }
}

export function markBriefingItemConsumed(input: {
  dateKey: string;
  dayPart: string;
  districtSlug: string;
  slug: string;
}) {
  if (typeof window === "undefined" || !input.slug) return;
  const prev = readBriefingConsumed();
  const same =
    prev &&
    prev.dateKey === input.dateKey &&
    prev.dayPart === input.dayPart &&
    prev.districtSlug === input.districtSlug;
  const consumedSlugs = same
    ? Array.from(new Set([...(prev?.consumedSlugs ?? []), input.slug]))
    : [input.slug];
  try {
    window.localStorage.setItem(
      BRIEFING_CONSUMED_KEY,
      JSON.stringify({
        dateKey: input.dateKey,
        dayPart: input.dayPart,
        districtSlug: input.districtSlug,
        consumedSlugs,
      } satisfies BriefingConsumed)
    );
  } catch {
    /* ignore */
  }
}
