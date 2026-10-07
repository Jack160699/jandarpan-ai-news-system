import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { MyNewsApiItem } from "@/features/user-news/api";
import { FILTERS, canWithdraw, countByFilter, engagementView, filterItems, isResumable, sortNewestFirst, statusLabel } from "@/features/user-news/my-news-model";
import { MyNewsView } from "@/features/user-news/MyNewsList";

const stats = { viewsTotal: 1200, viewsToday: 30, views7d: 400, uniqueViewers: 900, likes: 12, comments: 3, engagementRatePct: 1.25 };

function item(over: Partial<MyNewsApiItem> & { id: string; status: string }): MyNewsApiItem {
  return { headline: `Story ${over.id}`, language: "en", district: null, createdAt: "2026-10-01T00:00:00.000Z", submittedAt: null, publishedAt: null, slug: null, thumbnailUrl: null, moderationNote: null, stats: null, ...over };
}

const ITEMS: MyNewsApiItem[] = [
  item({ id: "a", status: "published", publishedAt: "2026-10-05T10:00:00.000Z", slug: "story-a", stats }),
  item({ id: "b", status: "submitted", submittedAt: "2026-10-06T10:00:00.000Z" }),
  item({ id: "c", status: "rejected", moderationNote: { decision: "rejected", reason: "Unverifiable claim" } }),
  item({ id: "d", status: "draft", createdAt: "2026-10-02T00:00:00.000Z" }),
  item({ id: "e", status: "blocked" }),
  item({ id: "f", status: "something_unknown" }),
];

describe("my-news model", () => {
  it("filters by status group and counts match", () => {
    expect(filterItems(ITEMS, "published").map((i) => i.id)).toEqual(["a"]);
    expect(filterItems(ITEMS, "pending").map((i) => i.id)).toEqual(["b"]);
    expect(filterItems(ITEMS, "rejected").map((i) => i.id).sort()).toEqual(["c", "e"]);
    expect(filterItems(ITEMS, "draft").map((i) => i.id)).toEqual(["d"]);
    const counts = countByFilter(ITEMS);
    expect(Object.keys(counts)).toEqual(FILTERS);
    // an unknown status is never silently shown as a real one
    expect(counts.all).toBe(5);
  });

  it("only published stories get engagement, and never a fake zero", () => {
    expect(engagementView(ITEMS[0])).toMatchObject({ views: 1200, rate: "1.25%" });
    expect(engagementView(ITEMS[1])).toBeNull();
    expect(engagementView(item({ id: "x", status: "published", stats: null }))).toBeNull();
    expect(engagementView(item({ id: "y", status: "published", stats: { ...stats, engagementRatePct: null } }))?.rate).toBe("—");
  });

  it("resume/withdraw rules follow the lifecycle", () => {
    expect(isResumable("draft")).toBe(true);
    expect(isResumable("submitted")).toBe(false);
    expect(isResumable("published")).toBe(false);
    expect(canWithdraw("submitted")).toBe(true);
    expect(canWithdraw("rejected")).toBe(false);
    expect(canWithdraw("blocked")).toBe(false);
  });

  it("labels and sorts newest first", () => {
    expect(statusLabel("published", "en")).toBeTruthy();
    expect(statusLabel("published", "hi")).not.toBe(statusLabel("published", "en"));
    expect(statusLabel("weird", "en")).toBe("weird");
    expect(sortNewestFirst(ITEMS).map((i) => i.id)[0]).toBe("b");
  });
});

describe("MyNewsView renders", () => {
  const render = (filter: Parameters<typeof MyNewsView>[0]["filter"], monetizationMessage: string | null = "Revenue share is not active yet.") =>
    renderToStaticMarkup(createElement(MyNewsView, { items: ITEMS, locale: "en", filter, monetizationMessage }));

  it("shows the revenue-not-active notice and real metrics only on published", () => {
    const html = render("all");
    expect(html).toContain("Revenue share is not active yet.");
    expect((html.match(/data-testid="engagement"/g) ?? []).length).toBe(1);
    expect(html).toContain("1,200");
    expect(html).toContain("Unverifiable claim");
  });

  it("omits the notice when monetization is active and respects the filter", () => {
    const html = render("rejected", null);
    expect(html).not.toContain("revenue-note");
    expect((html.match(/data-testid="my-news-item"/g) ?? []).length).toBe(2);
    expect(html).not.toContain("engagement\"");
  });

  it("links resume and open-story correctly", () => {
    expect(render("draft")).toContain("/profile/post-news?id=d");
    expect(render("published")).toContain("/story/story-a");
  });
});
