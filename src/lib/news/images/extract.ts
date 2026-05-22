/**
 * Article image extraction — og/twitter/RSS/HTML + validation + scoring
 */

import type Parser from "rss-parser";
import { isValidHttpUrl } from "@/lib/news/normalize";
import {
  getCachedPageHtml,
  getCachedResolvedImage,
  setCachedPageHtml,
  setCachedResolvedImage,
} from "@/lib/news/images/cache";
import {
  imageQualityScore,
  isDisplayableImage,
  isRejectedImageUrl,
  parseDimensionsFromUrl,
  type ImageCandidate,
  type ImageCandidateSource,
} from "@/lib/news/images/validate";

const FETCH_TIMEOUT_MS = 10_000;
const MAX_RETRIES = 2;
const USER_AGENT =
  "CG-Bhaskar-ImageBot/1.0 (+https://newspaper-motion.vercel.app; image extraction)";

/** Normalize URL for storage & Next/Image */
export function normalizeImageUrl(raw: string, articleUrl?: string): string {
  try {
    let url = raw.trim();
    if (url.startsWith("//")) url = `https:${url}`;
    if (url.startsWith("/") && articleUrl) {
      url = new URL(url, articleUrl).toString();
    }

    const u = new URL(url);
    if (u.protocol === "http:") u.protocol = "https:";

    const strip = ["utm_source", "utm_medium", "utm_campaign", "fbclid", "gclid"];
    for (const p of strip) u.searchParams.delete(p);

    return u.toString();
  } catch {
    return raw.trim();
  }
}

function decodeHtmlEntities(value: string): string {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .trim();
}

function extractMetaImages(html: string): ImageCandidate[] {
  const candidates: ImageCandidate[] = [];
  const patterns: Array<{ re: RegExp; source: ImageCandidateSource }> = [
    {
      re: /<meta[^>]+property=["']og:image(?::secure_url|:url)?["'][^>]+content=["']([^"']+)["']/gi,
      source: "og",
    },
    {
      re: /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image(?::secure_url|:url)?["']/gi,
      source: "og",
    },
    {
      re: /<meta[^>]+name=["']twitter:image(?::src)?["'][^>]+content=["']([^"']+)["']/gi,
      source: "twitter",
    },
    {
      re: /<meta[^>]+content=["']([^"']+)["'][^>]+name=["']twitter:image(?::src)?["']/gi,
      source: "twitter",
    },
    {
      re: /<link[^>]+rel=["']image_src["'][^>]+href=["']([^"']+)["']/gi,
      source: "og",
    },
  ];

  for (const { re, source } of patterns) {
    let m: RegExpExecArray | null;
    while ((m = re.exec(html)) !== null) {
      const url = decodeHtmlEntities(m[1]);
      if (isValidHttpUrl(url)) {
        const dims = parseDimensionsFromUrl(url);
        candidates.push({ url, source, ...dims });
      }
    }
  }

  return candidates;
}

function extractHtmlImgTags(html: string, articleUrl?: string): ImageCandidate[] {
  const candidates: ImageCandidate[] = [];
  const re = /<img[^>]+src=["']([^"']+)["'][^>]*>/gi;
  let m: RegExpExecArray | null;

  while ((m = re.exec(html)) !== null) {
    const raw = decodeHtmlEntities(m[1]);
    const url = normalizeImageUrl(raw, articleUrl);
    if (!isValidHttpUrl(url)) continue;

    const tag = m[0];
    const width = Number(tag.match(/\bwidth=["']?(\d+)/i)?.[1]);
    const height = Number(tag.match(/\bheight=["']?(\d+)/i)?.[1]);

    candidates.push({
      url,
      source: "html_img",
      width: width || undefined,
      height: height || undefined,
    });
  }

  return candidates.slice(0, 12);
}

export function extractImagesFromHtml(
  html: string,
  articleUrl?: string
): ImageCandidate[] {
  const seen = new Set<string>();
  const all = [
    ...extractMetaImages(html),
    ...extractHtmlImgTags(html, articleUrl),
  ];

  return all.filter((c) => {
    const key = c.url.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function extractImagesFromRssItem(
  item: Parser.Item & Record<string, unknown>
): ImageCandidate[] {
  const candidates: ImageCandidate[] = [];

  const enclosure = item.enclosure?.url;
  if (enclosure && isValidHttpUrl(enclosure)) {
    candidates.push({ url: enclosure, source: "enclosure" });
  }

  const mediaContent = item.mediaContent as { $?: { url?: string } } | undefined;
  if (mediaContent?.$?.url && isValidHttpUrl(mediaContent.$.url)) {
    candidates.push({ url: mediaContent.$.url, source: "rss_media" });
  }

  const mediaThumbnail = item.mediaThumbnail as { $?: { url?: string } } | undefined;
  if (mediaThumbnail?.$?.url && isValidHttpUrl(mediaThumbnail.$.url)) {
    candidates.push({ url: mediaThumbnail.$.url, source: "rss_media" });
  }

  const encoded =
    item.contentEncoded ?? item.content ?? item["content:encoded"] ?? "";
  if (encoded) {
    const imgMatch = String(encoded).match(/<img[^>]+src=["']([^"']+)["']/i);
    if (imgMatch?.[1] && isValidHttpUrl(imgMatch[1])) {
      candidates.push({ url: imgMatch[1], source: "html_img" });
    }
  }

  return candidates;
}

export function pickBestImageCandidate(
  candidates: ImageCandidate[],
  usedUrls?: Set<string>
): { url: string; score: number; source: ImageCandidateSource } | null {
  let best: { url: string; score: number; source: ImageCandidateSource } | null =
    null;

  for (const c of candidates) {
    const normalized = normalizeImageUrl(c.url);
    if (usedUrls?.has(normalized.toLowerCase())) continue;

    const score = imageQualityScore({ ...c, url: normalized });
    if (score < 35) continue;

    if (!best || score > best.score) {
      best = { url: normalized, score, source: c.source };
    }
  }

  if (best && usedUrls) usedUrls.add(best.url.toLowerCase());
  return best;
}

async function fetchArticleHtml(
  articleUrl: string,
  retries = MAX_RETRIES
): Promise<string | null> {
  const cached = getCachedPageHtml(articleUrl);
  if (cached) return cached;

  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= retries; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    try {
      const res = await fetch(articleUrl, {
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

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      const buffer = await res.arrayBuffer();
      const html = new TextDecoder("utf-8", { fatal: false }).decode(buffer);
      setCachedPageHtml(articleUrl, html);
      return html;
    } catch (err) {
      clearTimeout(timer);
      lastError = err instanceof Error ? err : new Error("fetch failed");
      if (attempt < retries) {
        await new Promise((r) => setTimeout(r, 400 * (attempt + 1)));
      }
    }
  }

  console.warn(`[images] Page fetch failed for ${articleUrl}:`, lastError?.message);
  return null;
}

/**
 * Resolve best article image: provider URL → page scrape → null
 */
export async function extractArticleImage(input: {
  articleUrl: string;
  providerImage?: string | null;
  htmlContent?: string | null;
  rssItem?: Parser.Item & Record<string, unknown>;
  usedUrls?: Set<string>;
}): Promise<{
  url: string | null;
  score: number;
  source: ImageCandidateSource | null;
}> {
  const cached = getCachedResolvedImage(input.articleUrl);
  if (cached !== undefined) {
    return { url: cached, score: cached ? 70 : 0, source: cached ? "provider" : null };
  }

  const candidates: ImageCandidate[] = [];

  if (input.providerImage && isDisplayableImage(input.providerImage)) {
    candidates.push({
      url: normalizeImageUrl(input.providerImage, input.articleUrl),
      source: "provider",
    });
  }

  if (input.rssItem) {
    candidates.push(...extractImagesFromRssItem(input.rssItem));
  }

  if (input.htmlContent) {
    candidates.push(...extractImagesFromHtml(input.htmlContent, input.articleUrl));
  }

  let best = pickBestImageCandidate(candidates, input.usedUrls);

  if (!best || best.score < 55) {
    const pageHtml = await fetchArticleHtml(input.articleUrl);
    if (pageHtml) {
      const pageCandidates = extractImagesFromHtml(pageHtml, input.articleUrl);
      const pageBest = pickBestImageCandidate(pageCandidates, input.usedUrls);
      if (pageBest && (!best || pageBest.score > best.score)) {
        best = pageBest;
      }
    }
  }

  const url = best?.url ?? null;
  setCachedResolvedImage(input.articleUrl, url);

  return {
    url,
    score: best?.score ?? 0,
    source: best?.source ?? null,
  };
}

export function providerImageCandidates(
  imageUrl: string | null | undefined
): ImageCandidate[] {
  if (!imageUrl || !isValidHttpUrl(imageUrl)) return [];
  const { rejected } = isRejectedImageUrl(imageUrl);
  if (rejected) return [];
  return [{ url: imageUrl, source: "provider" }];
}
