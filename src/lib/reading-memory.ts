const STORAGE_KEY = "chronicle-reading-memory";
const MAX_BOOKMARKS = 12;

export type ArticleProgress = {
  progress: number;
  scrollY: number;
  lastRead: number;
  title: string;
};

export type SectionVisit = {
  id: string;
  label: string;
  lastSeen: number;
  dwellMs: number;
};

export type ReadingMemory = {
  version: 1;
  articles: Record<string, ArticleProgress>;
  sections: Record<string, SectionVisit>;
  bookmarks: string[];
  lastPath: string;
  lastSlug: string | null;
  sessionStarted: number;
};

const defaultMemory = (): ReadingMemory => ({
  version: 1,
  articles: {},
  sections: {},
  bookmarks: [],
  lastPath: "/",
  lastSlug: null,
  sessionStarted: Date.now(),
});

export function loadReadingMemory(): ReadingMemory {
  if (typeof window === "undefined") return defaultMemory();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultMemory();
    const parsed = JSON.parse(raw) as ReadingMemory;
    if (parsed.version !== 1) return defaultMemory();
    return { ...defaultMemory(), ...parsed };
  } catch {
    return defaultMemory();
  }
}

export function saveReadingMemory(memory: ReadingMemory): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(memory));
  } catch {
    /* quota or private mode */
  }
}

export function recordArticleProgress(
  memory: ReadingMemory,
  slug: string,
  progress: number,
  scrollY: number,
  title: string
): ReadingMemory {
  const next = {
    ...memory,
    articles: {
      ...memory.articles,
      [slug]: {
        progress: Math.max(memory.articles[slug]?.progress ?? 0, progress),
        scrollY,
        lastRead: Date.now(),
        title,
      },
    },
    lastSlug: slug,
    lastPath: `/story/${slug}`,
  };
  saveReadingMemory(next);
  return next;
}

export function recordSectionVisit(
  memory: ReadingMemory,
  id: string,
  label: string,
  dwellMs = 0
): ReadingMemory {
  const prev = memory.sections[id];
  const next = {
    ...memory,
    sections: {
      ...memory.sections,
      [id]: {
        id,
        label,
        lastSeen: Date.now(),
        dwellMs: (prev?.dwellMs ?? 0) + dwellMs,
      },
    },
    lastPath: "/",
  };
  saveReadingMemory(next);
  return next;
}

export function toggleBookmark(memory: ReadingMemory, slug: string): ReadingMemory {
  const has = memory.bookmarks.includes(slug);
  const bookmarks = has
    ? memory.bookmarks.filter((s) => s !== slug)
    : [slug, ...memory.bookmarks].slice(0, MAX_BOOKMARKS);
  const next = { ...memory, bookmarks };
  saveReadingMemory(next);
  return next;
}

export function getRecentReadSlugs(
  memory: ReadingMemory,
  limit = 8
): string[] {
  return Object.entries(memory.articles)
    .sort((a, b) => b[1].lastRead - a[1].lastRead)
    .slice(0, limit)
    .map(([slug]) => slug);
}

export function getContinueTargets(
  memory: ReadingMemory,
  limit = 3
): Array<{ href: string; label: string; progress: number }> {
  return Object.entries(memory.articles)
    .filter(([, v]) => v.progress > 0.04 && v.progress < 0.98)
    .sort((a, b) => b[1].lastRead - a[1].lastRead)
    .slice(0, limit)
    .map(([slug, data]) => ({
      href: `/story/${slug}`,
      label: data.title,
      progress: data.progress,
    }));
}

export function getContinueTarget(memory: ReadingMemory): {
  href: string;
  label: string;
  progress: number;
} | null {
  const entries = Object.entries(memory.articles)
    .filter(([, v]) => v.progress > 0.04 && v.progress < 0.98)
    .sort((a, b) => b[1].lastRead - a[1].lastRead);

  if (!entries.length) return null;
  const [slug, data] = entries[0];
  return {
    href: `/story/${slug}`,
    label: data.title,
    progress: data.progress,
  };
}

export function getExploredSections(memory: ReadingMemory): SectionVisit[] {
  return Object.values(memory.sections).sort(
    (a, b) => b.lastSeen - a.lastSeen
  );
}
