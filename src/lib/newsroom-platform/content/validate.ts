import type { ContentType, PlatformArticle } from "./types";
import { CONTENT_TYPES } from "./types";

export function isContentType(value: string): value is ContentType {
  return (CONTENT_TYPES as readonly string[]).includes(value);
}

export function assertPlatformArticle(raw: unknown): PlatformArticle | null {
  if (!raw || typeof raw !== "object") return null;
  const a = raw as Partial<PlatformArticle>;
  if (
    typeof a.id !== "string" ||
    typeof a.slug !== "string" ||
    typeof a.title !== "string" ||
    typeof a.excerpt !== "string"
  ) {
    return null;
  }
  return raw as PlatformArticle;
}

export function sortByPriority<T extends { priority: number; publishedAt: string }>(
  items: T[]
): T[] {
  return [...items].sort((a, b) => {
    if (b.priority !== a.priority) return b.priority - a.priority;
    return +new Date(b.publishedAt) - +new Date(a.publishedAt);
  });
}

export function sortByTrending<T extends { trendingScore: number }>(items: T[]): T[] {
  return [...items].sort((a, b) => b.trendingScore - a.trendingScore);
}
