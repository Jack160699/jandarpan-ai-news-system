/**
 * Unit tests — URL canonicalization + early dedup helpers + source-state utils.
 */

import { describe, expect, it } from "vitest";
import { canonicalArticleUrl } from "@/lib/news/normalize";
import {
  emptyEarlyDedupMetrics,
  mergeEarlyDedupMetrics,
} from "@/lib/news/ingestion/early-dedup";
import {
  filterArticlesByPublishedAfter,
  isSourceCurrentlyBlocked,
  nextUtcMidnightIso,
  publishedAfterIsoFromCursor,
  type IngestionSourceStateRow,
} from "@/lib/news/ingestion/source-state";
import {
  avoidableProcessingDuplicatePct,
  emptyIngestionMetrics,
  fetchedToNewRatio,
} from "@/lib/news/ingestion/metrics-contract";
import { classifyHttpFailure } from "@/lib/news/errors";

describe("canonicalArticleUrl", () => {
  it("strips UTM and tracking params", () => {
    const out = canonicalArticleUrl(
      "https://www.example.com/story/abc?utm_source=x&utm_medium=y&fbclid=1&id=keep"
    );
    expect(out).toBe("https://example.com/story/abc?id=keep");
  });

  it("preserves meaningful query identifiers", () => {
    const out = canonicalArticleUrl(
      "https://news.example.com/article?story_id=99&utm_campaign=noise"
    );
    expect(out).toContain("story_id=99");
    expect(out).not.toContain("utm_campaign");
  });

  it("unwraps Google News redirect url param", () => {
    const out = canonicalArticleUrl(
      "https://news.google.com/rss/articles/CBMi?url=https%3A%2F%2Fwww.patrika.com%2Fstory%2F123%3Futm_source%3Dgnews"
    );
    expect(out).toBe("https://patrika.com/story/123");
  });

  it("normalizes trailing slash and www", () => {
    expect(canonicalArticleUrl("https://www.example.com/a/b/")).toBe(
      "https://example.com/a/b"
    );
  });
});

describe("incremental published-after filter", () => {
  it("keeps items without timestamps", () => {
    const { kept, filtered } = filterArticlesByPublishedAfter(
      [
        { published_at: null },
        { published_at: "2026-07-01T00:00:00.000Z" },
        { published_at: "2026-07-19T00:00:00.000Z" },
      ],
      "2026-07-18T00:00:00.000Z"
    );
    expect(filtered).toBe(1);
    expect(kept).toHaveLength(2);
  });

  it("builds overlap window from cursor", () => {
    const iso = publishedAfterIsoFromCursor("2026-07-20T12:00:00.000Z", 2);
    expect(iso).toBe("2026-07-20T10:00:00.000Z");
  });
});

describe("source state blocking", () => {
  it("blocks permanently retired", () => {
    const row = {
      enabled: false,
      health_state: "permanently_retired",
      retirement_reason: "404",
      quota_exhausted_until: null,
      rate_limited_until: null,
      disabled_until: null,
    } as IngestionSourceStateRow;
    expect(isSourceCurrentlyBlocked(row).blocked).toBe(true);
  });

  it("blocks active quota window", () => {
    const until = new Date(Date.now() + 3600_000).toISOString();
    const row = {
      enabled: true,
      health_state: "quota_exhausted",
      retirement_reason: null,
      quota_exhausted_until: until,
      rate_limited_until: null,
      disabled_until: null,
    } as IngestionSourceStateRow;
    expect(isSourceCurrentlyBlocked(row).reason).toBe("quota_exhausted");
  });

  it("nextUtcMidnightIso is in the future", () => {
    const next = new Date(nextUtcMidnightIso()).getTime();
    expect(next).toBeGreaterThan(Date.now());
  });
});

describe("metrics contract", () => {
  it("computes fetched-to-new ratio", () => {
    const m = emptyIngestionMetrics();
    m.rawItemsReceived = 100;
    m.newlyPersistedSignals = 5;
    expect(fetchedToNewRatio(m)).toBe(20);
  });

  it("computes avoidable processing duplicate pct", () => {
    const m = emptyIngestionMetrics();
    m.rawItemsReceived = 100;
    m.earlyDuplicateKnownSignal = 80;
    expect(avoidableProcessingDuplicatePct(m)).toBe(80);
  });

  it("merges early dedup counters", () => {
    const a = emptyEarlyDedupMetrics();
    a.earlyDuplicateKnownSignal = 3;
    const b = emptyEarlyDedupMetrics();
    b.earlyDuplicateKnownSignal = 2;
    expect(mergeEarlyDedupMetrics(a, b).earlyDuplicateKnownSignal).toBe(5);
  });
});

describe("GNews 403 classification", () => {
  it("treats gnews 403 as quota exceeded", () => {
    const err = classifyHttpFailure(403, "Unauthorized", "gnews");
    expect(err.code).toBe("QUOTA_EXCEEDED");
    expect(err.retryable).toBe(false);
  });
});
