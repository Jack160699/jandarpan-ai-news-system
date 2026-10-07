import { describe, expect, it } from "vitest";
import { selectFeedRows } from "@/lib/feed/feed-selector";
import { compareNewestFirst, hasLanguageRepresentation, orderLiveQueue, selectLiveRows } from "@/lib/broadcast/live-selection";
import type { FeedRow } from "@/lib/feed/feed-selector";

const NOW = new Date("2026-10-07T12:00:00.000Z");
const H = 3_600_000;
const at = (ageMs: number) => new Date(NOW.getTime() - ageMs).toISOString();

function row(id: string, ageMs: number, scope = "STATEWIDE_CHHATTISGARH", extra: Partial<FeedRow> = {}): FeedRow {
  return {
    id,
    slug: `s-${id}`,
    headline: `रायपुर में ${id} सड़क हादसा, पांच घायल`,
    published_at: at(ageMs),
    editorial_status: "approved",
    geo_metadata: { scope },
    ...extra,
  };
}

describe("Live starts with the newest eligible story", () => {
  it("is exactly the Latest selection: same gate, same geography policy, same order", () => {
    const rows = [row("old", 20 * H), row("new", 1 * H), row("mid", 5 * H), row("nat", 0.2 * H, "NATIONAL"), row("unk", 0.1 * H, "UNKNOWN")];
    const live = selectLiveRows(rows, NOW).rows.map((r) => r.id);
    const latest = selectFeedRows(rows, { feed: "cg_home", order: "chronological", now: NOW }).rows.map((r) => r.id);
    expect(live).toEqual(latest);
    expect(live[0]).toBe("new"); // the national and unknown stories are newer but not eligible for a Chhattisgarh-first Live
  });

  it("a stale cache row, a pending row and a 31-day-old row can never head the queue", () => {
    const rows = [
      row("stale", 31 * 24 * H),
      row("pending", 0.1 * H, "STATEWIDE_CHHATTISGARH", { editorial_status: "pending" }),
      row("ok", 3 * H),
    ];
    expect(selectLiveRows(rows, NOW).rows.map((r) => r.id)).toEqual(["ok"]);
  });

  it("ignores insertion / physical order completely", () => {
    const a = [row("a", 1 * H), row("b", 2 * H), row("c", 3 * H)];
    const b = [...a].reverse();
    expect(selectLiveRows(a, NOW).rows.map((r) => r.id)).toEqual(selectLiveRows(b, NOW).rows.map((r) => r.id));
  });
});

describe("orderLiveQueue", () => {
  const c = (id: string, ageMs: number | null) => ({ id, publishedAt: ageMs === null ? null : at(ageMs) });

  it("an initial request (no played ids) is strictly newest-first even when the viewer has history", () => {
    const list = [c("a", 5 * H), c("b", 1 * H), c("c", 3 * H)];
    expect(orderLiveQueue(list, { playedIds: new Set(["b"]), continuation: false }).map((x) => x.id)).toEqual(["b", "c", "a"]);
  });

  it("a continuation request leads with unplayed stories, each group newest-first", () => {
    const list = [c("a", 9 * H), c("b", 1 * H), c("c", 2 * H), c("d", 3 * H), c("e", 4 * H)];
    expect(orderLiveQueue(list, { playedIds: new Set(["b", "c"]), continuation: true }).map((x) => x.id)).toEqual(["d", "e", "a", "b", "c"]);
  });

  it("falls back to pure newest-first when fewer than three stories are unplayed", () => {
    const list = [c("a", 3 * H), c("b", 1 * H), c("c", 2 * H)];
    expect(orderLiveQueue(list, { playedIds: new Set(["b", "c"]), continuation: true }).map((x) => x.id)).toEqual(["b", "c", "a"]);
  });

  it("breaks equal timestamps by id and sinks null timestamps to the end", () => {
    const list = [c("x1", 1 * H), c("x2", 1 * H), c("nil", null)];
    expect(orderLiveQueue(list).map((x) => x.id)).toEqual(["x2", "x1", "nil"]);
    expect(compareNewestFirst(c("a", H), c("b", H))).toBeGreaterThan(0);
  });
});

describe("language representation: a missing language is dropped, never replaced with a placeholder", () => {
  const hiOnly = { headlineHi: "रायपुर में सड़क हादसा, पांच घायल", summaryHi: "सार", headlineEn: undefined, summaryEn: undefined };
  const bilingual = { ...hiOnly, headlineEn: "Five injured in Raipur road accident", summaryEn: "Summary" };

  it("Hindi-only story: available in Hindi, absent in English", () => {
    expect(hasLanguageRepresentation(hiOnly, "hi")).toBe(true);
    expect(hasLanguageRepresentation(hiOnly, "en")).toBe(false);
  });
  it("bilingual story: available in both", () => {
    expect(hasLanguageRepresentation(bilingual, "hi")).toBe(true);
    expect(hasLanguageRepresentation(bilingual, "en")).toBe(true);
  });
  it("conflicting script is rejected (Hindi headline in the English slot, English headline in the Hindi slot)", () => {
    expect(hasLanguageRepresentation({ ...bilingual, headlineEn: "रायपुर में हादसा" }, "en")).toBe(false);
    expect(hasLanguageRepresentation({ ...bilingual, headlineHi: "Road accident in Raipur" }, "hi")).toBe(false);
  });
  it("a generic headline is not a representation", () => {
    expect(hasLanguageRepresentation({ ...bilingual, headlineEn: "Regional News Update" }, "en")).toBe(false);
    expect(hasLanguageRepresentation({ ...bilingual, headlineHi: "प्रादेशिक समाचार अपडेट" }, "hi")).toBe(false);
  });
  it("needs a summary or body, and a headline", () => {
    expect(hasLanguageRepresentation({ ...bilingual, summaryEn: "", articleBodyEn: "" }, "en")).toBe(false);
    expect(hasLanguageRepresentation({ ...bilingual, summaryEn: "", articleBodyEn: "Body text" }, "en")).toBe(true);
    expect(hasLanguageRepresentation({ ...bilingual, headlineEn: "  " }, "en")).toBe(false);
  });
});
