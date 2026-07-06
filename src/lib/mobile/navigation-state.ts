const REFERRER_KEY = "nr-nav-referrer";

export type StoryReferrer = {
  path: string;
  search: string;
  hash: string;
  scrollY: number;
  savedAt: number;
};

export function saveStoryReferrer(
  fromPath: string,
  scrollY: number,
  search = "",
  hash = ""
): void {
  if (typeof window === "undefined") return;
  if (fromPath.startsWith("/story/")) return;
  try {
    const payload: StoryReferrer = {
      path: fromPath,
      search,
      hash,
      scrollY,
      savedAt: Date.now(),
    };
    sessionStorage.setItem(REFERRER_KEY, JSON.stringify(payload));
  } catch {
    /* quota / private mode */
  }
}

export function loadStoryReferrer(): StoryReferrer | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(REFERRER_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoryReferrer;
    if (!parsed?.path) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function buildReferrerHref(referrer: StoryReferrer): string {
  return `${referrer.path}${referrer.search}${referrer.hash}`;
}

export function isStoryPath(path: string): boolean {
  return path.startsWith("/story/");
}

export function isListRestorePath(path: string): boolean {
  if (isStoryPath(path)) return false;
  if (path.startsWith("/admin")) return false;
  if (path === "/shorts") return false;
  return true;
}
