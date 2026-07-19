import { afterEach, describe, expect, it } from "vitest";
import {
  articleNeedsTranslation,
  getReaderTranslationPairs,
  getStoredTranslation,
} from "@/lib/i18n/multilingual/translation-queue";
import { computeSourceContentVersion } from "@/lib/i18n/multilingual/translation-contract";
import type { GeneratedArticleRow } from "@/lib/types/newsroom";

function article(
  overrides: Partial<GeneratedArticleRow> = {}
): GeneratedArticleRow {
  return {
    id: "a1",
    event_id: null,
    slug: "s",
    headline: "शीर्षक",
    summary: "सार",
    article_body: "शरीर",
    hero_image_url: null,
    seo_title: "seo",
    seo_description: "desc",
    reading_time: "1 मिनट",
    language: "hi",
    tags: [],
    published_at: new Date().toISOString(),
    editorial_status: "approved",
    editorial_metadata: {},
    translations: null,
    ...overrides,
  } as GeneratedArticleRow;
}

describe("reader translation pairs", () => {
  afterEach(() => {
    delete process.env.NEWSROOM_CG_TRANSLATION;
  });

  it("defaults to Hindi↔English only", () => {
    delete process.env.NEWSROOM_CG_TRANSLATION;
    expect(getReaderTranslationPairs()).toEqual([
      { source: "hi", target: "en" },
      { source: "en", target: "hi" },
    ]);
  });

  it("adds hi→cg when CG enabled", () => {
    process.env.NEWSROOM_CG_TRANSLATION = "true";
    expect(getReaderTranslationPairs()).toEqual([
      { source: "hi", target: "en" },
      { source: "hi", target: "cg" },
      { source: "en", target: "hi" },
    ]);
  });
});

describe("articleNeedsTranslation", () => {
  afterEach(() => {
    delete process.env.NEWSROOM_CG_TRANSLATION;
  });

  it("requires Hindi→English when missing", () => {
    expect(articleNeedsTranslation(article(), "en")).toBe(true);
  });

  it("requires English→Hindi when missing", () => {
    expect(
      articleNeedsTranslation(article({ language: "en", headline: "Title" }), "hi")
    ).toBe(true);
  });

  it("skips CG when disabled", () => {
    delete process.env.NEWSROOM_CG_TRANSLATION;
    expect(articleNeedsTranslation(article(), "cg")).toBe(false);
  });

  it("allows CG when enabled", () => {
    process.env.NEWSROOM_CG_TRANSLATION = "true";
    expect(articleNeedsTranslation(article(), "cg")).toBe(true);
  });

  it("skips when a complete translation already exists", () => {
    const row = article({
      translations: {
        en: {
          headline: "Title",
          summary: "Summary",
          article_body: "Body",
          seo_title: "Title",
          seo_description: "Summary",
          reading_time: "1 min",
          translated_at: new Date().toISOString(),
        },
      },
    });
    expect(getStoredTranslation(row, "en")).not.toBeNull();
    expect(articleNeedsTranslation(row, "en")).toBe(false);
  });

  it("re-translates when stamped source version changes", () => {
    const base = article();
    const v1 = computeSourceContentVersion(base);
    const row = article({
      translations: {
        en: {
          headline: "Title",
          summary: "Summary",
          article_body: "Body",
          seo_title: "Title",
          seo_description: "Summary",
          reading_time: "1 min",
          translated_at: new Date().toISOString(),
          source_content_version: v1,
        },
      },
      article_body: "शरीर बदला",
    });
    expect(articleNeedsTranslation(row, "en")).toBe(true);
  });
});
