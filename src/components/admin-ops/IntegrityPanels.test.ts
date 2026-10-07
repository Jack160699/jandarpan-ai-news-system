import { createElement } from "react";
import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import sample from "@/lib/admin-ops/__fixtures__/snapshot.sample.json";
import { buildOpsView } from "@/lib/admin-ops/snapshot";
import type { OpsSnapshotRaw } from "@/lib/admin-ops/types";
import type { FeedIntegrityRaw, FeedIntegrityRow } from "@/lib/admin-ops/feed-integrity";
import type { EfficiencyRaw } from "@/lib/admin-ops/efficiency";
import { EfficiencyPanel, FeedIntegrityPanel } from "@/components/admin-ops/IntegrityPanels";

const snap = sample as unknown as OpsSnapshotRaw;
const NOW = new Date(snap.generated_at).getTime();
const ago = (h: number) => new Date(NOW - h * 3_600_000).toISOString();

const row = (id: string, h: number, scope: string, extra: Partial<FeedIntegrityRow> = {}): FeedIntegrityRow =>
  ({
    id,
    slug: `s-${id}`,
    event_id: `e-${id}`,
    headline: `रायपुर में ${id} सड़क हादसा, पांच घायल`,
    language: "hi",
    published_at: ago(h),
    created_at: ago(h),
    editorial_status: "approved",
    workflow_status: "published",
    geo_metadata: { scope, primary_district: "raipur", districts: ["raipur"] },
    has_en: true,
    has_hi: true,
    ...extra,
  }) as FeedIntegrityRow;

const integrity: FeedIntegrityRaw = {
  generated_at: snap.generated_at,
  newest_signal_created_at: ago(30),
  newest_signal_published_at: ago(31),
  rows: [row("d", 2, "DISTRICT_SPECIFIC"), row("s", 3, "STATEWIDE_CHHATTISGARH"), row("n", 4, "NATIONAL"), row("u", 5, "UNKNOWN")],
};

const efficiency: EfficiencyRaw = {
  window_hours: 24,
  generate: { calls: 10, ok: 9, avg_latency_ms: 24_000 },
  repair: { calls: 3, ok: 3, avg_latency_ms: 16_000 },
  repair_pct: 30,
  tokens: 90_000,
  events_with_calls: 9,
  articles: { generated: 10, approved: 7, not_publish: 3, rejection_pct: 30, repaired_flag: 1, avg_depth_retries: 0.3 },
  tokens_per_approved_article: 12_857,
  per_model: [
    { provider: "codecraft", model: "deepseek-v4-pro-0813", operation: "editorial_generate", calls: 10, ok: 9, avg_latency_ms: 24_000, tokens: 70_000 },
    { provider: "gemini", model: "gemini-3.5-flash-lite", operation: "editorial_generate", calls: 4, ok: 4, avg_latency_ms: 2_000, tokens: 9_000 },
  ],
};

const base = { snapshotLatencyMs: 100, now: NOW };

describe("FeedIntegrityPanel", () => {
  it("renders the three freshness clocks, class-separated geography and the UNKNOWN exclusion", () => {
    const view = buildOpsView(snap, { ...base, integrity });
    const html = renderToStaticMarkup(createElement(FeedIntegrityPanel, { view, now: NOW }));
    expect(html).toContain("Ingestion · newest signal stored");
    expect(html).toContain("Editorial · latest published");
    expect(html).toContain("Public feed · newest story readers see");
    expect(html).toContain("District-specific");
    expect(html).toContain("Chhattisgarh statewide");
    expect(html).toContain("India / national");
    expect(html).toContain("International");
    expect(html).toContain("UNKNOWN geography (excluded from every public timeline): 1");
  });

  it("says plainly when the data is unavailable instead of showing zeros", () => {
    const view = buildOpsView(snap, { ...base, integrity: null });
    const html = renderToStaticMarkup(createElement(FeedIntegrityPanel, { view, now: NOW }));
    expect(html).toContain("Integrity data unavailable");
    expect(html).toContain("migration 099");
  });
});

describe("EfficiencyPanel", () => {
  it("shows recorded numbers and loudly flags Gemini editorial calls", () => {
    const view = buildOpsView(snap, { ...base, efficiency });
    const html = renderToStaticMarkup(createElement(EfficiencyPanel, { view }));
    expect(html).toContain("Repair rate");
    expect(html).toContain("30%");
    expect(html).toContain("4 editorial call(s) went to Gemini");
    expect(html).toContain("deepseek-v4-pro-0813");
  });

  it("shows 'no data' rather than 0 when nothing was recorded", () => {
    const empty: EfficiencyRaw = {
      ...efficiency,
      generate: { calls: 0, ok: 0, avg_latency_ms: null },
      repair: { calls: 0, ok: 0, avg_latency_ms: null },
      repair_pct: null,
      tokens_per_approved_article: null,
      articles: { generated: 0, approved: 0, not_publish: 0, rejection_pct: null, repaired_flag: 0, avg_depth_retries: null },
      per_model: [],
    };
    const html = renderToStaticMarkup(createElement(EfficiencyPanel, { view: buildOpsView(snap, { ...base, efficiency: empty }) }));
    expect(html).toContain("no data");
    expect(html).toContain("no Gemini editorial calls");
  });

  it("explains a missing migration instead of inventing numbers", () => {
    const html = renderToStaticMarkup(createElement(EfficiencyPanel, { view: buildOpsView(snap, { ...base, efficiency: null }) }));
    expect(html).toContain("Efficiency data unavailable");
  });
});
