/**
 * Client-side reel likes (localStorage)
 */

const STORAGE_KEY = "cgb-reels-v3-likes";

export function getLikedSlugs(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? (JSON.parse(raw) as string[]) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function isReelLiked(slug: string): boolean {
  return getLikedSlugs().includes(slug);
}

export function toggleReelLike(slug: string): boolean {
  const current = getLikedSlugs();
  const next = current.includes(slug)
    ? current.filter((s) => s !== slug)
    : [...current, slug];
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  return next.includes(slug);
}
