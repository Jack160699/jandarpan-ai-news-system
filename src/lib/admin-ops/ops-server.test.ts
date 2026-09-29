import { describe, expect, it } from "vitest";
import sample from "@/lib/admin-ops/__fixtures__/snapshot.sample.json";
import { rateLimitRetryAfterSec } from "@/lib/admin-ops/run-actions";
import { RUN_ACTION_IDS, RUN_ACTION_META, isRunActionId } from "@/lib/admin-ops/run-actions-meta";
import { normalizeUserQuery } from "@/lib/admin-ops/users";
import { buildOpsView } from "@/lib/admin-ops/snapshot";
import type { OpsSnapshotRaw } from "@/lib/admin-ops/types";

const snap = sample as unknown as OpsSnapshotRaw;
const NOW = new Date(snap.generated_at).getTime();

describe("run actions", () => {
  it("rate limit returns the remaining wait, then 0", () => {
    const t0 = "2026-09-30T10:00:00.000Z";
    const base = Date.parse(t0);
    expect(rateLimitRetryAfterSec(null, 60, base)).toBe(0);
    expect(rateLimitRetryAfterSec(t0, 60, base + 20_000)).toBe(40);
    expect(rateLimitRetryAfterSec(t0, 60, base + 60_000)).toBe(0);
    expect(rateLimitRetryAfterSec(t0, 60, base + 500_000)).toBe(0);
  });

  it("accepts only the six known actions", () => {
    expect(RUN_ACTION_IDS).toHaveLength(6);
    for (const id of RUN_ACTION_IDS) {
      expect(isRunActionId(id)).toBe(true);
      expect(RUN_ACTION_META[id].label.length).toBeGreaterThan(5);
    }
    expect(isRunActionId("drop_tables")).toBe(false);
    expect(isRunActionId(undefined)).toBe(false);
  });
});

describe("user query normalisation (input hardening)", () => {
  it("clamps page size, defaults sort, and strips LIKE wildcards / control chars", () => {
    const n = normalizeUserQuery({ pageSize: 9999, page: -3, sort: "id; drop table users" as never, search: "  a%_b\\\u0000c  " });
    expect(n.pageSize).toBe(100);
    expect(n.page).toBe(1);
    expect(n.sort).toBe("created_at");
    expect(n.search).toBe("abc");
    expect(n.offset).toBe(0);
  });

  it("computes offsets and allows valid sorts", () => {
    const n = normalizeUserQuery({ page: 3, pageSize: 20, sort: "email", dir: "asc" });
    expect(n.offset).toBe(40);
    expect(n.sort).toBe("email");
    expect(n.dir).toBe("asc");
    expect(normalizeUserQuery({}).search).toBeNull();
  });
});

describe("buildOpsView on the real production snapshot", () => {
  const view = buildOpsView(snap, { snapshotLatencyMs: 350, now: NOW });

  it("surfaces the real state: stalled pipeline, huge editorial backlog, no recent ingestion", () => {
    expect(view.publishing.pace.message).toBe("Publishing pipeline stalled");
    expect(view.kpis.freshnessTone).toBe("critical");
    expect(view.kpis.pendingEditorialQueue).toBe(1005);
    expect(view.kpis.queueTone).toBe("critical");
    expect(view.kpis.signalsTone).toBe("critical");
    expect(view.overall).toBe("critical");
  });

  it("reports the requested user KPIs from real counts", () => {
    expect(view.kpis.totalUsers).toBe(7);
    expect(view.kpis.active7d).toBe(5);
    expect(view.kpis.new30d).toBe(4);
  });

  it("builds the ten-stage funnel with hour/today/24h columns", () => {
    expect(view.funnel.map((f) => f.key)).toEqual([
      "fetched", "normalized", "duplicates_removed", "signals_inserted", "geo_classified",
      "clustered_events", "editorial_candidates", "ai_generated", "qa_passed", "published",
    ]);
    const published = view.funnel.find((f) => f.key === "published")!;
    expect(published.day).toBe(4);
    expect(published.hour).toBe(0);
  });

  it("groups failures into the requested categories with the underlying items", () => {
    const cats = view.failures.map((f) => f.category);
    expect(cats).toContain("provider_error"); // deepseek 4xx on gemini/groq
    expect(cats).toContain("provider_quota");
    for (const g of view.failures) {
      expect(g.total).toBe(g.items.reduce((a, i) => a + i.n, 0));
    }
  });

  it("does not present legacy/unverified district tags as district coverage", () => {
    expect(view.geo.districts.every((d) => d.status === "none")).toBe(true);
    expect(view.geo.legacyUnverified).toBe(14);
  });
});
