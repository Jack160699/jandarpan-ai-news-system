/**
 * Competitor Intelligence — RSS + HTML metadata parser
 */

import { decodeHtmlEntities, parseFeedResilient } from "@/lib/news/rss-fetch";
import { parsePublishedAt } from "@/lib/news/normalize";
import { extractArticleMetadataFromHtml } from "@/lib/news/rss-enrich";
import {
  COMPETITOR_FETCH_TIMEOUT_MS,
  COMPETITOR_USER_AGENT,
} from "@/lib/competitor-intelligence/config";
import { normalizeCompetitorUrl } from "@/lib/competitor-intelligence/dedupe";
import type { ParsedCompetitorArticle } from "@/lib/competitor-intelligence/types";

type RssParserItem = {
  title?: string;
  link?: string;
  pubDate?: string;
  isoDate?: string;
  creator?: string;
  author?: string;
  categories?: string[] | string;
  content?: string;
  contentSnippet?: string;
  contentEncoded?: string;
  enclosure?: { url?: string };
  mediaContent?: { $?: { url?: string } };
  mediaThumbnail?: { $?: { url?: string } };
};

function stripHtml(value: string): string {
  return decodeHtmlEntities(value.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim());
}

function countWords(text: string): number {
  const words = text.trim().split(/\s+/).filter(Boolean);
  return words.length;
}

function extractHeadingsFromHtml(html: string): string[] {
  const headings: string[] = [];
  const re = /<h[1-3][^>]*>([\s\S]*?)<\/h[1-3]>/gi;
  let match: RegExpExecArray | null;
  while ((match = re.exec(html)) && headings.length < 12) {
    const text = stripHtml(match[1] ?? "");
    if (text) headings.push(text.slice(0, 200));
  }
  return headings;
}

function extractOpenGraph(html: string): Record<string, string> {
  const keys = [
    "og:title",
    "og:description",
    "og:image",
    "og:url",
    "og:type",
    "article:published_time",
    "article:author",
    "article:section",
  ];
  const out: Record<string, string> = {};

  for (const key of keys) {
    const match = html.match(
      new RegExp(
        `<meta[^>]+property=["']${key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}["'][^>]+content=["']([^"']+)["']`,
        "i"
      )
    );
    if (match?.[1]) out[key] = decodeHtmlEntities(match[1]);
  }

  return out;
}

function extractSchemaOrg(html: string): Record<string, unknown> {
  const scripts = [...html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)];
  for (const script of scripts.slice(0, 3)) {
    try {
      const json = JSON.parse(script[1] ?? "{}");
      if (json && typeof json === "object") return json as Record<string, unknown>;
    } catch {
      /* try next */
    }
  }
  return {};
}

function extractCanonical(html: string): string | null {
  const match = html.match(
    /<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)["']/i
  );
  return match?.[1] ? decodeHtmlEntities(match[1]) : null;
}

function inferDistrict(title: string, description: string, category: string | null): string | null {
  const corpus = `${title} ${description} ${category ?? ""}`.toLowerCase();
  const districts = [
    "raipur",
    "bilaspur",
    "durg",
    "bastar",
    "korba",
    "raigarh",
    "rajnandgaon",
    "surguja",
    "jagdalpur",
    "dantewada",
    "kanker",
    "mahasamund",
  ];
  const hit = districts.find((d) => corpus.includes(d));
  return hit ? hit.charAt(0).toUpperCase() + hit.slice(1) : null;
}

function pickImage(item: RssParserItem): string | undefined {
  return (
    item.enclosure?.url ??
    item.mediaContent?.$?.url ??
    item.mediaThumbnail?.$?.url ??
    undefined
  );
}

export function parseRssItemToCompetitorArticle(
  item: RssParserItem,
  defaults: { language?: string; sourceName?: string }
): ParsedCompetitorArticle | null {
  const url = item.link?.trim();
  const title = item.title ? stripHtml(item.title) : "";
  if (!url || !title) return null;

  const description =
    stripHtml(item.contentSnippet ?? item.content ?? item.contentEncoded ?? "").slice(0, 800) ||
    null;
  const publishedRaw = item.isoDate ?? item.pubDate ?? null;
  const categoryRaw = Array.isArray(item.categories)
    ? item.categories[0]
    : item.categories;
  const category = categoryRaw ? stripHtml(String(categoryRaw)) : null;

  return {
    url: normalizeCompetitorUrl(url),
    title: title.slice(0, 500),
    description,
    category,
    district: inferDistrict(title, description ?? "", category),
    language: defaults.language ?? "hi",
    author: item.creator ?? item.author ?? null,
    publishedAt: publishedRaw ? parsePublishedAt(publishedRaw) : null,
    image: pickImage(item),
    wordCount: description ? countWords(description) : null,
    headings: [],
    metadata: {
      sourceName: defaults.sourceName ?? null,
      feedParser: "rss-parser",
    },
  };
}

export async function parseCompetitorFeed(
  feedUrl: string,
  defaults: { language?: string; sourceName?: string }
): Promise<ParsedCompetitorArticle[]> {
  const { feed } = await parseFeedResilient({
    id: `competitor-${defaults.sourceName ?? "unknown"}`,
    name: defaults.sourceName ?? "competitor",
    url: feedUrl,
    category: "competitor",
    tier: "publisher",
    priority: 50,
    region: "india",
    language: (defaults.language === "en" ? "en" : "hi") as "hi" | "en",
  });

  return (feed.items ?? [])
    .map((item) =>
      parseRssItemToCompetitorArticle(item as RssParserItem, defaults)
    )
    .filter((item): item is ParsedCompetitorArticle => Boolean(item));
}

export async function enrichCompetitorArticleFromHtml(
  article: ParsedCompetitorArticle
): Promise<ParsedCompetitorArticle> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), COMPETITOR_FETCH_TIMEOUT_MS);

  try {
    const res = await fetch(article.url, {
      signal: controller.signal,
      headers: {
        "User-Agent": COMPETITOR_USER_AGENT,
        Accept: "text/html,application/xhtml+xml",
        "Accept-Language": "hi-IN,hi;q=0.9,en;q=0.8",
      },
      redirect: "follow",
      cache: "no-store",
    });
    clearTimeout(timer);
    if (!res.ok) return article;

    const html = new TextDecoder("utf-8", { fatal: false }).decode(
      await res.arrayBuffer()
    );
    const meta = extractArticleMetadataFromHtml(html);
    const openGraph = extractOpenGraph(html);
    const schemaDetected = extractSchemaOrg(html);
    const canonical = extractCanonical(html);
    const headings = extractHeadingsFromHtml(html);
    const bodyText = stripHtml(
      html.match(/<article[\s\S]*?<\/article>/i)?.[0] ??
        html.match(/<main[\s\S]*?<\/main>/i)?.[0] ??
        html
    ).slice(0, 4000);

    return {
      ...article,
      title: meta.title?.slice(0, 500) ?? article.title,
      description:
        meta.description?.slice(0, 800) ?? article.description ?? null,
      publishedAt: meta.publishedAt ?? article.publishedAt ?? null,
      image: meta.imageUrl ?? article.image ?? null,
      canonical: canonical ?? article.canonical ?? null,
      openGraph,
      schemaDetected,
      headings: headings.length ? headings : article.headings,
      wordCount: bodyText ? countWords(bodyText) : article.wordCount ?? null,
      category:
        openGraph["article:section"]?.slice(0, 120) ?? article.category ?? null,
      author: openGraph["article:author"] ?? article.author ?? null,
      district:
        article.district ??
        inferDistrict(
          meta.title ?? article.title,
          meta.description ?? article.description ?? "",
          openGraph["article:section"] ?? article.category ?? null
        ),
      metadata: {
        ...(article.metadata ?? {}),
        enriched: true,
      },
    };
  } catch {
    clearTimeout(timer);
    return article;
  }
}
