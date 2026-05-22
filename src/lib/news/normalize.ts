/**
 * Article normalization & validation
 */

import { createHash } from "crypto";
import type { NormalizedArticle } from "@/lib/news/types";

export function isValidHttpUrl(value: string): boolean {
  try {
    const u = new URL(value);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

export function normalizeTitle(title: string): string {
  return title
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();
}

export function titleHash(title: string): string {
  return createHash("sha256").update(normalizeTitle(title)).digest("hex");
}

export function urlHash(url: string): string {
  return createHash("sha256").update(url.trim().toLowerCase()).digest("hex");
}

const REMOVED_TITLES = new Set(["[removed]", "removed", "untitled"]);

export function validateArticle(
  article: NormalizedArticle
): { valid: boolean; reason?: string } {
  const title = article.title?.trim();
  const url = article.article_url?.trim();

  if (!title || title.length < 8) {
    return { valid: false, reason: "title_too_short" };
  }

  if (REMOVED_TITLES.has(title.toLowerCase())) {
    return { valid: false, reason: "removed_title" };
  }

  if (!url || !isValidHttpUrl(url)) {
    return { valid: false, reason: "invalid_url" };
  }

  return { valid: true };
}

export function dedupeArticles(
  articles: NormalizedArticle[]
): { unique: NormalizedArticle[]; skipped: number } {
  const seenUrls = new Set<string>();
  const seenTitles = new Set<string>();
  const unique: NormalizedArticle[] = [];
  let skipped = 0;

  for (const article of articles) {
    const urlKey = article.article_url.trim().toLowerCase();
    const titleKey = titleHash(article.title);

    if (seenUrls.has(urlKey) || seenTitles.has(titleKey)) {
      skipped++;
      continue;
    }

    seenUrls.add(urlKey);
    seenTitles.add(titleKey);
    unique.push(article);
  }

  return { unique, skipped };
}

export function parsePublishedAt(value: string | null | undefined): string | null {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}
