/**
 * RSS page fallback — enrich title/link-only items from article HTML
 */

import {
  extractArticleImage,
  extractImagesFromHtml,
  normalizeImageUrl,
  pickBestImageCandidate,
} from "@/lib/news/images/extract";
import { getCachedPageHtml, setCachedPageHtml } from "@/lib/news/images/cache";
import { decodeHtmlEntities } from "@/lib/news/rss-fetch";
import { parsePublishedAt } from "@/lib/news/normalize";
import type { NormalizedArticle } from "@/lib/news/types";

const PAGE_TIMEOUT_MS = 8_000;
const USER_AGENT =
  "Mozilla/5.0 (compatible; Jan-Darpan-Chhattisgarh-RSS/2.1; +https://newspaper-motion.vercel.app)";

export function extractArticleMetadataFromHtml(html: string): {
  title?: string;
  description?: string;
  imageUrl?: string;
  publishedAt?: string;
} {
  const ogTitle = html.match(
    /<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i
  )?.[1];
  const ogDesc = html.match(
    /<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["']/i
  )?.[1];
  const metaDesc = html.match(
    /<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i
  )?.[1];
  const published =
    html.match(
      /<meta[^>]+property=["']article:published_time["'][^>]+content=["']([^"']+)["']/i
    )?.[1] ??
    html.match(/<meta[^>]+name=["']date["'][^>]+content=["']([^"']+)["']/i)?.[1];

  const images = extractImagesFromHtml(html);
  const best = pickBestImageCandidate(images);

  return {
    title: ogTitle ? decodeHtmlEntities(ogTitle) : undefined,
    description: decodeHtmlEntities(ogDesc ?? metaDesc ?? "").slice(0, 600) || undefined,
    imageUrl: best?.url,
    publishedAt: published ? parsePublishedAt(published) ?? undefined : undefined,
  };
}

async function fetchPageHtml(url: string): Promise<string | null> {
  const cached = getCachedPageHtml(url);
  if (cached) return cached;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), PAGE_TIMEOUT_MS);

  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": USER_AGENT,
        Accept: "text/html,application/xhtml+xml",
        "Accept-Language": "hi-IN,hi;q=0.9,en;q=0.8",
      },
      redirect: "follow",
      cache: "no-store",
    });

    clearTimeout(timer);
    if (!res.ok) return null;

    const html = new TextDecoder("utf-8", { fatal: false }).decode(
      await res.arrayBuffer()
    );
    setCachedPageHtml(url, html);
    return html;
  } catch {
    clearTimeout(timer);
    return null;
  }
}

function needsEnrichment(article: NormalizedArticle): boolean {
  const descLen = (article.description ?? article.content ?? "").trim().length;
  return descLen < 20 || !article.image_url || !article.published_at;
}

export async function enrichRssArticleFromPage(
  article: NormalizedArticle
): Promise<{ article: NormalizedArticle; recovered: boolean }> {
  if (!needsEnrichment(article)) {
    return { article, recovered: false };
  }

  const html = await fetchPageHtml(article.article_url);
  if (!html) {
    return {
      article: {
        ...article,
        description:
          article.description ??
          article.title.slice(0, 200),
      },
      recovered: false,
    };
  }

  const meta = extractArticleMetadataFromHtml(html);
  let recovered = false;

  const description =
    meta.description && meta.description.length >= 20
      ? meta.description
      : article.description ?? article.content?.slice(0, 600) ?? article.title;

  let image_url = article.image_url;
  if (!image_url && meta.imageUrl) {
    image_url = normalizeImageUrl(meta.imageUrl, article.article_url);
    recovered = true;
  }

  if (!image_url) {
    const extracted = await extractArticleImage({
      articleUrl: article.article_url,
      providerImage: null,
      htmlContent: html,
    });
    if (extracted.url) {
      image_url = extracted.url;
      recovered = true;
    }
  }

  const published_at =
    article.published_at ?? meta.publishedAt ?? new Date().toISOString();

  if (meta.description && !article.description) recovered = true;
  if (meta.publishedAt && !article.published_at) recovered = true;

  return {
    article: {
      ...article,
      title: meta.title && meta.title.length > 10 ? meta.title : article.title,
      description,
      image_url,
      published_at,
      content: article.content ?? description,
    },
    recovered,
  };
}

export async function enrichRssArticlesBatch(
  articles: NormalizedArticle[],
  limit: number
): Promise<{ articles: NormalizedArticle[]; recoveredCount: number }> {
  let recoveredCount = 0;
  let fetches = 0;
  const out: NormalizedArticle[] = [];

  for (const article of articles) {
    if (fetches >= limit || !needsEnrichment(article)) {
      out.push(article);
      continue;
    }

    fetches++;
    try {
      const { article: enriched, recovered } = await enrichRssArticleFromPage(article);
      if (recovered) recoveredCount++;
      out.push(enriched);
    } catch {
      out.push(article);
    }
  }

  return { articles: out, recoveredCount };
}
