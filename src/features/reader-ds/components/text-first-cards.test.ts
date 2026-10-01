import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

// ActionRow reads the reader language; the real provider needs the Next router, which is irrelevant to image rendering.
vi.mock("@/providers/LanguageProvider", () => ({
  useLanguage: () => new Proxy({ language: "hi" } as Record<string, unknown>, { get: (t, k) => (k in t ? t[k as string] : () => "") }),
  LanguageProvider: ({ children }: { children: unknown }) => children,
}));
import { ArticleImage } from "./ArticleImage";
import { LeadStory } from "./LeadStory";
import { SecondaryStory } from "./SecondaryStory";
import { TrendingRankRow } from "./TrendingRankRow";
import type { ReaderStory } from "../utils";

const REAL = "https://images.jandarpan.news/stories/2026/10/editorial-photo-1.jpg";

function story(over: Partial<ReaderStory> = {}): ReaderStory {
  return {
    id: "s1",
    slug: "text-first-story-s1",
    headline: "Chhattisgarh Police Headquarters Issues Transfer Orders for Inspectors",
    summary: "Orders for the simultaneous transfer of inspectors have been issued.",
    imageUrl: "",
    kicker: "Chhattisgarh",
    publishedAt: new Date().toISOString(),
    ...over,
  } as unknown as ReaderStory;
}

const html = (el: Parameters<typeof renderToStaticMarkup>[0]) => renderToStaticMarkup(el);

describe("reader cards: a story without a verified image is a clean text-first card", () => {
  it("ArticleImage renders nothing (no frame, no placeholder, no stock) without a source", () => {
    for (const src of [undefined, null, "", "   "]) {
      expect(html(createElement(ArticleImage, { src: src as never, alt: "x" }))).toBe("");
    }
  });

  it("ArticleImage still renders a real image frame when a source exists", () => {
    const out = html(createElement(ArticleImage, { src: REAL, alt: "x", ratio: "lead" }));
    expect(out).toContain("<figure");
    expect(out).toContain("<img");
  });

  it("LeadStory without an image shows the headline and summary but no image frame", () => {
    const out = html(createElement(LeadStory, { story: story() }));
    expect(out).toContain("Chhattisgarh Police Headquarters Issues Transfer Orders");
    expect(out).not.toContain("<figure");
    expect(out).not.toContain("<img");
  });

  it("SecondaryStory / TrendingRankRow without an image have no empty thumbnail column", () => {
    const sec = html(createElement(SecondaryStory, { story: story() }));
    expect(sec).toContain("Chhattisgarh Police Headquarters");
    expect(sec).not.toContain("<figure");
    expect(sec).not.toContain("width:96px");
    const tr = html(createElement(TrendingRankRow, { story: story(), rank: 2 }));
    expect(tr).toContain("Chhattisgarh Police Headquarters");
    expect(tr).not.toContain("<figure");
    expect(tr).not.toContain("width:84px");
  });

  it("the same cards still show the image when one exists", () => {
    expect(html(createElement(LeadStory, { story: story({ imageUrl: REAL }) }))).toContain("<img");
    expect(html(createElement(SecondaryStory, { story: story({ imageUrl: REAL }) }))).toContain("<img");
  });
});
