import { describe, expect, it } from "vitest";

import {
  assessEditorialFreshness,
  dedupeEditorialSignals,
  findUnsafeSourceReason,
} from "@/lib/news/ai/editorial-candidate-safety";
import type { NewsEventRow, NewsSignalRow } from "@/lib/types/newsroom";

function signal(overrides: Partial<NewsSignalRow> = {}): NewsSignalRow {
  return {
    id: crypto.randomUUID(),
    source: "Test",
    provider: "rss",
    title: "रायपुर में नई नागरिक सेवा शुरू",
    raw_content: "रायपुर में प्रशासन ने नई नागरिक सेवा शुरू की।",
    article_url: "https://example.com/story",
    image_url: null,
    published_at: "2026-07-25T20:00:00.000Z",
    category: "local",
    region: "chhattisgarh",
    language: "hi",
    created_at: "2026-07-25T20:00:00.000Z",
    ...overrides,
  } as NewsSignalRow;
}

function event(overrides: Partial<NewsEventRow> = {}): NewsEventRow {
  return {
    id: crypto.randomUUID(),
    canonical_title: "रायपुर में नई नागरिक सेवा शुरू",
    event_summary: null,
    region: "chhattisgarh",
    category: "local",
    urgency_score: 60,
    source_count: 1,
    signal_ids: [],
    created_at: "2026-07-25T20:00:00.000Z",
    updated_at: "2026-07-25T20:00:00.000Z",
    is_live: false,
    ...overrides,
  } as NewsEventRow;
}

describe("editorial candidate safety", () => {
  it("deduplicates copied source rows by normalized title", () => {
    const rows = dedupeEditorialSignals([
      signal({ id: "a", article_url: "https://example.com/a" }),
      signal({ id: "b", article_url: "https://example.com/b" }),
    ]);
    expect(rows).toHaveLength(1);
  });

  it("rejects the known corrupted organisation entity", () => {
    expect(
      findUnsafeSourceReason([
        signal({ raw_content: "कॉकरोच जनता पार्टी का धरना जारी है।" }),
      ])
    ).toBe("corrupted_entity_in_source");
  });

  it("rejects old sources even when an event remains marked live", () => {
    const result = assessEditorialFreshness(
      event({ is_live: true }),
      [signal({ published_at: "2026-07-22T10:00:00.000Z" })],
      Date.parse("2026-07-26T00:00:00.000Z")
    );
    expect(result.decision).toBe("stale");
    expect(result.reason).toBe("live_event_without_recent_source_evidence");
  });

  it("accepts recent source evidence", () => {
    const result = assessEditorialFreshness(
      event(),
      [signal()],
      Date.parse("2026-07-26T00:00:00.000Z")
    );
    expect(result.decision).toBe("fresh");
  });
});
