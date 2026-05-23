/**
 * Client-side short bookmarks (localStorage)
 */

const STORAGE_KEY = "cgb-shorts-bookmarks";

export function getBookmarkedSlugs(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? (JSON.parse(raw) as string[]) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function isShortBookmarked(slug: string): boolean {
  return getBookmarkedSlugs().includes(slug);
}

export function toggleShortBookmark(slug: string): boolean {
  const current = getBookmarkedSlugs();
  const next = current.includes(slug)
    ? current.filter((s) => s !== slug)
    : [...current, slug];
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  return next.includes(slug);
}
