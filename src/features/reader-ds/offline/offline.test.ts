import { describe, expect, it } from "vitest";
import { sortOfflineArticles } from "./search";
import {
  estimateRecordBytes,
  hashContent,
  type OfflineArticleRecord,
} from "./types";
import { formatBytes } from "./storage-manager";

function stub(partial: Partial<OfflineArticleRecord> & Pick<OfflineArticleRecord, "slug">): OfflineArticleRecord {
  return {
    downloadedAt: "2026-01-02T00:00:00.000Z",
    contentUpdatedAt: "2026-01-01T00:00:00.000Z",
    contentHash: "abc",
    language: "hi",
    district: null,
    category: "राजनीति",
    headline: "शीर्षक",
    summary: null,
    paragraphs: ["एक"],
    heroImageUrl: null,
    imageCaption: null,
    author: "संवाददाता",
    role: "",
    publishedAt: null,
    publishedLabel: null,
    tags: [],
    kicker: "ख़बर",
    bytes: 1000,
    favorite: false,
    inlineImageUrls: [],
    cachedImageUrls: [],
    ...partial,
  };
}

describe("offline hash + sort + bytes", () => {
  it("hashes content stably", () => {
    expect(hashContent(["a", "b"])).toBe(hashContent(["a", "b"]));
    expect(hashContent(["a", "b"])).not.toBe(hashContent(["a", "c"]));
  });

  it("sorts newest / oldest / district / category", () => {
    const rows = [
      stub({ slug: "a", downloadedAt: "2026-01-01T00:00:00.000Z", district: "bastar", category: "खेल" }),
      stub({ slug: "b", downloadedAt: "2026-01-03T00:00:00.000Z", district: "raipur", category: "राजनीति" }),
      stub({ slug: "c", downloadedAt: "2026-01-02T00:00:00.000Z", district: "raipur", category: "व्यापार" }),
    ];
    expect(sortOfflineArticles(rows, "newest").map((r) => r.slug)).toEqual(["b", "c", "a"]);
    expect(sortOfflineArticles(rows, "oldest").map((r) => r.slug)).toEqual(["a", "c", "b"]);
    expect(sortOfflineArticles(rows, "district")[0].district).toBe("bastar");
    const byCat = sortOfflineArticles(rows, "category");
    for (let i = 1; i < byCat.length; i++) {
      expect(byCat[i - 1].category.localeCompare(byCat[i].category)).toBeLessThanOrEqual(0);
    }
  });

  it("estimates record bytes above raw json length", () => {
    const base = stub({ slug: "x", paragraphs: ["hello world"], cachedImageUrls: ["https://x/a.jpg"] });
    const { bytes: _b, ...rest } = base;
    expect(estimateRecordBytes(rest)).toBeGreaterThan(20);
  });

  it("formats bytes for hi/en", () => {
    expect(formatBytes(512, "en")).toBe("512 B");
    expect(formatBytes(2048, "en")).toContain("KB");
    expect(formatBytes(2 * 1024 * 1024, "hi")).toContain("एमबी");
  });
});

describe("offline favorite cleanup policy", () => {
  it("documents that favorites are skipped by budget candidates", () => {
    const rows = [
      stub({ slug: "fav", favorite: true, downloadedAt: "2020-01-01T00:00:00.000Z" }),
      stub({ slug: "old", favorite: false, downloadedAt: "2020-01-02T00:00:00.000Z" }),
    ];
    const candidates = [...rows]
      .filter((r) => !r.favorite)
      .sort((a, b) => a.downloadedAt.localeCompare(b.downloadedAt));
    expect(candidates.map((r) => r.slug)).toEqual(["old"]);
  });
});
