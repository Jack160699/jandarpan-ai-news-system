import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/news/images/cache", () => ({ getCachedPageHtml: () => null, setCachedPageHtml: () => {} }));

import { enrichSourceTextFromPages, PAGE_TEXT_FETCH_LIMIT } from "./rss-enrich";
import type { NormalizedArticle } from "@/lib/news/types";

const SENT = "रायपुर में नगर निगम ने सड़क चौड़ीकरण का काम शुरू किया है और अधिकारियों ने निरीक्षण किया। ";
const PAGE = `<html><body><article><p>${SENT.repeat(5)}</p></article></body></html>`;

const art = (i: number, over: Partial<NormalizedArticle> = {}): NormalizedArticle => ({
  title: `रायपुर समाचार ${i}: छत्तीसगढ़ में नई खबर`,
  description: "छोटा सार",
  content: "छोटा सार",
  image_url: null,
  source: "Lalluram (Direct Feed)",
  author: null,
  category: "chhattisgarh",
  published_at: new Date().toISOString(),
  article_url: `https://lalluram.example/news-${i}/`,
  provider: "rss",
  language: "hi",
  region: "chhattisgarh",
  ...over,
});

const deps = (over: Record<string, unknown> = {}) => ({
  fetchHtml: vi.fn(async () => PAGE),
  allowed: vi.fn(async () => true),
  sleep: vi.fn(async () => {}),
  now: () => "2026-10-02T00:00:00.000Z",
  ...over,
});

describe("enrichSourceTextFromPages", () => {
  it("attaches robots-permitted main text with full attribution metadata", async () => {
    const d = deps();
    const r = await enrichSourceTextFromPages([art(1)], { publisher: "Lalluram (Direct Feed)" }, d);
    expect(r.enriched).toBe(1);
    expect(r.articles[0]!.content).toContain("नगर निगम");
    expect(r.articles[0]!.text_enrichment).toEqual({
      method: "page_extract",
      chars: r.articles[0]!.content!.length,
      publisher: "Lalluram (Direct Feed)",
      source_url: "https://lalluram.example/news-1/",
      robots: "allowed",
      fetched_at: "2026-10-02T00:00:00.000Z",
    });
    // the feed's own title/description are never overwritten
    expect(r.articles[0]!.title).toBe(art(1).title);
    expect(r.articles[0]!.description).toBe("छोटा सार");
  });

  it("never fetches a URL robots.txt disallows", async () => {
    const d = deps({ allowed: vi.fn(async () => false) });
    const r = await enrichSourceTextFromPages([art(1), art(2)], { publisher: "P" }, d);
    expect(d.fetchHtml).not.toHaveBeenCalled();
    expect(r.blockedByRobots).toBe(2);
    expect(r.articles.every((a) => !a.text_enrichment)).toBe(true);
  });

  it("skips items that already have enough text and items that are not Chhattisgarh-relevant", async () => {
    const d = deps();
    const full = art(1, { content: SENT.repeat(8) });
    const national = art(2, { title: "संसद में नया विधेयक पेश", description: "दिल्ली से खबर", content: "दिल्ली से खबर", region: "india", category: "politics" });
    const r = await enrichSourceTextFromPages([full, national], { publisher: "P" }, d);
    expect(d.fetchHtml).not.toHaveBeenCalled();
    expect(r.fetched).toBe(0);
  });

  it("is bounded per run, spaces requests, and leaves items unchanged when extraction fails", async () => {
    const d = deps();
    const many = Array.from({ length: PAGE_TEXT_FETCH_LIMIT + 4 }, (_, i) => art(i));
    const r = await enrichSourceTextFromPages(many, { publisher: "P" }, d);
    expect(r.fetched).toBe(PAGE_TEXT_FETCH_LIMIT);
    expect(d.sleep).toHaveBeenCalledTimes(PAGE_TEXT_FETCH_LIMIT - 1);
    const failing = deps({ fetchHtml: vi.fn(async () => "<html><body>nothing</body></html>") });
    const one = art(1);
    const r2 = await enrichSourceTextFromPages([one], { publisher: "P" }, failing);
    expect(r2.enriched).toBe(0);
    expect(r2.articles[0]).toEqual(one);
  });
});
