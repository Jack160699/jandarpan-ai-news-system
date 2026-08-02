import { describe, expect, it, vi } from "vitest";

type Row = Record<string, unknown>;
type TableConfig = { error?: string; rows?: Row[] };

// Table-configurable Supabase query-builder mock, following the same
// chainable-proxy convention already used in this repo for query builders
// with many chained filter methods — see
// src/lib/ops/translation-recovery.test.ts (createClientMock/`chain`).
let tableConfig: Record<string, TableConfig> = {};

function createCollectSupabaseMock() {
  function from(table: string) {
    const cfg = tableConfig[table] ?? { rows: [] };
    let mode: "list" | "count" = "list";
    let limitN: number | undefined;

    const chain: Record<string, unknown> = {};
    const self = () => chain;
    for (const m of ["eq", "gt", "gte", "lt", "lte", "is", "in", "not", "order"]) {
      chain[m] = self;
    }
    chain.select = (_cols: string, opts?: { count?: string; head?: boolean }) => {
      if (opts?.count === "exact" && opts.head) mode = "count";
      return chain;
    };
    chain.limit = (n: number) => {
      limitN = n;
      return chain;
    };
    chain.then = (
      resolve: (v: unknown) => void,
      reject?: (e: unknown) => void
    ) => {
      const rows = cfg.rows ?? [];
      const result = cfg.error
        ? { data: null, count: null, error: { message: cfg.error } }
        : mode === "count"
          ? { data: null, count: rows.length, error: null }
          : { data: rows.slice(0, limitN ?? rows.length), count: rows.length, error: null };
      return Promise.resolve(result).then(resolve, reject);
    };
    return chain;
  }
  return { from };
}

vi.mock("@/lib/supabase", () => ({
  isSupabaseConfigured: () => true,
  createAdminServerClient: () => createCollectSupabaseMock(),
}));

import { collectDailyMetrics } from "@/lib/newsroom-audit/collect";

describe("collectDailyMetrics", () => {
  it("marks a field unavailable with a reason (not defaulted to 0) when its query errors", async () => {
    tableConfig = {
      generated_articles: { error: 'relation "generated_articles" is unreachable' },
      news_events: { rows: [{ id: "evt-1" }, { id: "evt-2" }] },
    };

    const report = await collectDailyMetrics("2026-08-01");

    expect(report.content_production.articlesCreated.status).toBe("unavailable");
    expect(report.content_production.articlesCreated.value).toBeNull();
    if (report.content_production.articlesCreated.status === "unavailable") {
      expect(report.content_production.articlesCreated.reason).toBeTruthy();
      expect(report.content_production.articlesCreated.reason).toContain("generated_articles");
    }

    // Every other field backed by the same errored table must also fail
    // safe rather than silently reporting 0.
    expect(report.content_production.articlesPublished.status).toBe("unavailable");
    expect(report.content_production.articlesPublished.value).toBeNull();
    expect(report.quality.emptyArticleBody.status).toBe("unavailable");
    expect(report.quality.emptyArticleBody.value).toBeNull();

    // A genuinely reachable table still reports a real number.
    expect(report.content_production.eventsCreated.status).toBe("ok");
    expect(report.content_production.eventsCreated.value).toBe(2);
  });

  it("marks the audience_seo section unavailable with a reason regardless of other data", async () => {
    tableConfig = {
      generated_articles: { rows: [{ id: "a1", language: "hi" }] },
      news_events: { rows: [{ id: "evt-1" }] },
    };

    const report = await collectDailyMetrics("2026-08-01");

    for (const key of [
      "searchImpressions",
      "searchClicks",
      "searchAvgPosition",
      "pageviews",
    ] as const) {
      expect(report.audience_seo[key].status).toBe("unavailable");
      expect(report.audience_seo[key].value).toBeNull();
    }
    expect(report.audience_seo.note).toBeTruthy();
  });

  it("also marks audience_seo unavailable when every other table errors", async () => {
    tableConfig = {
      generated_articles: { error: "boom" },
      news_events: { error: "boom" },
    };

    const report = await collectDailyMetrics("2026-08-01");

    for (const key of [
      "searchImpressions",
      "searchClicks",
      "searchAvgPosition",
      "pageviews",
    ] as const) {
      expect(report.audience_seo[key].status).toBe("unavailable");
    }
  });
});
