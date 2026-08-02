import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { DeterministicReport } from "@/lib/newsroom-audit/collect";

/**
 * Covers the dashboard catch-up primitives added to generate.ts:
 * claimReportGenerationIfMissing (the atomic-via-unique-constraint "only one
 * caller starts generation" gate used by /api/admin/reports/daily's GET
 * handler), notifyReportGenerationFailure (deduped critical notification on
 * a failed scheduled/catch-up run), and generateDailyReport's skip-if-final
 * idempotency (force:false must not re-run collect/analyze against an
 * already-final report_date; force:true must always re-run).
 *
 * daily_newsroom_reports is modeled with a real unique-constraint-on-
 * report_date semantic (insert() throws a Postgres-shaped 23505 error when
 * the date already exists) so claimReportGenerationIfMissing's atomicity
 * claim is actually exercised, not just its happy path.
 */

type Row = Record<string, unknown>;

let reports: Row[] = [];
let notifications: Row[] = [];
let notificationIdSeq = 1;

function createSupabaseMock() {
  function from(table: string) {
    const filters: Array<(row: Row) => boolean> = [];
    let mode: "select" | "insert" | "update" | "delete" | "upsert" = "select";
    let payload: Row | Row[] | null = null;
    let limitN: number | undefined;

    const api: Record<string, unknown> = {};
    const chainable = (fn?: (...args: unknown[]) => void) => (...args: unknown[]) => {
      fn?.(...args);
      return api;
    };

    api.select = chainable();
    api.eq = chainable((col, val) => filters.push((r) => r[col as string] === val));
    api.is = chainable((col, val) =>
      filters.push((r) => (val === null ? r[col as string] == null : r[col as string] === val))
    );
    api.order = chainable();
    api.limit = chainable((n) => {
      limitN = n as number;
    });
    api.insert = (rows: Row | Row[]) => {
      mode = "insert";
      payload = rows;
      return api;
    };
    api.update = (patch: Row) => {
      mode = "update";
      payload = patch;
      return api;
    };
    api.delete = () => {
      mode = "delete";
      return api;
    };
    api.upsert = (rows: Row) => {
      mode = "upsert";
      payload = rows;
      return api;
    };

    async function run() {
      if (table === "daily_newsroom_reports") {
        if (mode === "insert") {
          const row = payload as Row;
          if (reports.some((r) => r.report_date === row.report_date)) {
            return {
              data: null,
              error: { message: "duplicate key value violates unique constraint", code: "23505" },
            };
          }
          reports.push({ id: `report-${reports.length + 1}`, ...row });
          return { data: { id: reports[reports.length - 1]!.id }, error: null };
        }
        if (mode === "upsert") {
          const row = payload as Row;
          const idx = reports.findIndex((r) => r.report_date === row.report_date);
          if (idx >= 0) reports[idx] = { ...reports[idx], ...row };
          else reports.push({ id: `report-${reports.length + 1}`, ...row });
          return { data: { id: reports.find((r) => r.report_date === row.report_date)!.id }, error: null };
        }
        if (mode === "update") {
          const patch = payload as Row;
          for (const r of reports) {
            if (filters.every((f) => f(r))) Object.assign(r, patch);
          }
          return { data: null, error: null };
        }
        const results = reports.filter((r) => filters.every((f) => f(r)));
        return { data: results.slice(0, limitN ?? results.length), error: null };
      }
      if (table === "daily_newsroom_report_metrics") return { data: [], error: null };
      if (table === "daily_newsroom_report_findings") {
        if (mode === "insert") {
          const rows = (Array.isArray(payload) ? payload : [payload]) as Row[];
          return { data: rows.map((r, i) => ({ id: `finding-${i}`, title: r.title })), error: null };
        }
        return { data: [], error: null };
      }
      if (table === "daily_newsroom_notifications") {
        if (mode === "insert") {
          const row = payload as Row;
          notifications.push({ id: `notif-${notificationIdSeq++}`, ...row, resolved_at: null });
          return { data: null, error: null };
        }
        const results = notifications.filter((r) => filters.every((f) => f(r)));
        return { data: results.slice(0, limitN ?? results.length), error: null };
      }
      return { data: null, count: 0, error: null };
    }

    api.single = () => run();
    api.maybeSingle = async () => {
      const res = await run();
      const rows = (res.data ?? []) as Row[] | Row | null;
      if (Array.isArray(rows)) return { data: rows[0] ?? null, error: res.error };
      return { data: rows, error: res.error };
    };
    api.then = (resolve: (v: unknown) => void, reject?: (e: unknown) => void) =>
      run().then(resolve, reject);
    return api;
  }

  return { from };
}

vi.mock("@/lib/supabase", () => ({
  isSupabaseConfigured: () => true,
  createAdminServerClient: () => createSupabaseMock(),
}));

vi.mock("@/lib/newsroom-audit/collect", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/newsroom-audit/collect")>();
  return { ...actual, collectDailyMetrics: (...args: unknown[]) => collectDailyMetricsMock(...args) };
});

vi.mock("@/lib/newsroom-audit/analyze", () => ({
  analyzeDailyReport: (...args: unknown[]) => analyzeDailyReportMock(...args),
}));

vi.mock("@/lib/newsroom-audit/actions", () => ({
  runAutomatedActionsIfEnabled: (...args: unknown[]) => runAutomatedActionsMock(...args),
}));

const collectDailyMetricsMock = vi.fn();
const analyzeDailyReportMock = vi.fn();
const runAutomatedActionsMock = vi.fn(async (..._args: unknown[]) => {});

import {
  claimReportGenerationIfMissing,
  generateDailyReport,
  notifyReportGenerationFailure,
} from "@/lib/newsroom-audit/generate";

function metricOk<T>(value: T) {
  return { status: "ok" as const, value };
}

function buildReport(): DeterministicReport {
  return {
    reportDate: "2026-08-01",
    windowStartIso: "2026-07-31T18:30:00.000Z",
    windowEndIso: "2026-08-01T18:30:00.000Z",
    collectedAt: new Date().toISOString(),
    content_production: {
      articlesCreated: metricOk(0),
      articlesPublished: metricOk(5),
      byWorkflowStatus: metricOk({}),
      eventsCreated: metricOk(0),
    },
    content_mix: { byCategory: metricOk([]), byRegion: metricOk([]), byLanguage: metricOk([]) },
    freshness: {
      avgEventToPublishMinutes: metricOk(null),
      publishedWithoutEventLink: metricOk(0),
      oldestUnpublishedDraftHours: metricOk(null),
    },
    quality: {
      missingHeroImage: metricOk(0),
      missingSummary: metricOk(0),
      emptyArticleBody: metricOk(0),
      missingReadingTime: metricOk(0),
      workflowRejections: metricOk(0),
    },
    ai_provider_usage: {
      totalRequests: metricOk(0),
      successRate: metricOk(null),
      byProvider: metricOk([]),
      fallbackEvents: metricOk(0),
      totalEstimatedCostUsd: metricOk(0),
    },
    provider_quota: { buckets: metricOk([]) },
    embeddings_clustering: {
      embeddingsCreatedOpenAi: metricOk(0),
      embeddingsCreatedCloudflare: metricOk(0),
      eventsWithMultipleSources: metricOk(0),
      avgSourceCountPerEvent: metricOk(null),
    },
    images: { queued: metricOk(0), completed: metricOk(0), failed: metricOk(0), pending: metricOk(0) },
    pipeline_infrastructure: {
      jobsCompleted: metricOk(0),
      jobsFailed: metricOk(0),
      deadLetters: metricOk(0),
      cronRuns: metricOk([]),
      errorEventsBySeverity: metricOk({}),
    },
    audience_seo: {
      searchImpressions: { status: "unavailable", value: null, reason: "no integration" },
      searchClicks: { status: "unavailable", value: null, reason: "no integration" },
      searchAvgPosition: { status: "unavailable", value: null, reason: "no integration" },
      pageviews: { status: "unavailable", value: null, reason: "no integration" },
      note: "no integration",
    },
  };
}

beforeEach(() => {
  reports = [];
  notifications = [];
  notificationIdSeq = 1;
  collectDailyMetricsMock.mockReset();
  analyzeDailyReportMock.mockReset();
  runAutomatedActionsMock.mockClear();
  collectDailyMetricsMock.mockResolvedValue(buildReport());
  analyzeDailyReportMock.mockResolvedValue({ ai_status: "unavailable", reason: "test-skip" });
});

afterEach(() => {
  vi.useRealTimers();
});

describe("claimReportGenerationIfMissing", () => {
  it("claims when no row exists for the report date", async () => {
    const claim = await claimReportGenerationIfMissing("2026-08-01");
    expect(claim).toBe("claimed");
    expect(reports).toHaveLength(1);
    expect(reports[0]).toMatchObject({ report_date: "2026-08-01", status: "draft" });
  });

  it("reports already_final when a final report already exists (never re-claims a completed day)", async () => {
    reports.push({
      report_date: "2026-08-01",
      status: "final",
      generated_at: new Date().toISOString(),
    });
    const claim = await claimReportGenerationIfMissing("2026-08-01");
    expect(claim).toBe("already_final");
    expect(reports).toHaveLength(1);
  });

  it("reports already_in_progress for a fresh draft (does not double-trigger a concurrent run)", async () => {
    reports.push({
      report_date: "2026-08-01",
      status: "draft",
      generated_at: new Date().toISOString(),
    });
    const claim = await claimReportGenerationIfMissing("2026-08-01");
    expect(claim).toBe("already_in_progress");
  });

  it("reclaims a stale draft older than 5 minutes (crash recovery)", async () => {
    const staleTimestamp = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    reports.push({ report_date: "2026-08-01", status: "draft", generated_at: staleTimestamp });
    const claim = await claimReportGenerationIfMissing("2026-08-01");
    expect(claim).toBe("claimed");
    expect(reports[0]!.generated_at).not.toBe(staleTimestamp);
  });
});

describe("notifyReportGenerationFailure", () => {
  it("inserts a critical, deduped notification on failure", async () => {
    await notifyReportGenerationFailure("2026-08-01", "collect_failed: timeout");
    expect(notifications).toHaveLength(1);
    expect(notifications[0]).toMatchObject({
      severity: "critical",
      category: "report_generation",
      incident_key: "2026-08-01:report_generation:failed",
      message: "collect_failed: timeout",
    });
  });

  it("does not create a second open notification for a repeated failure on the same day", async () => {
    await notifyReportGenerationFailure("2026-08-01", "first failure");
    await notifyReportGenerationFailure("2026-08-01", "second failure, same day");
    expect(notifications).toHaveLength(1);
    expect(notifications[0]!.message).toBe("first failure");
  });
});

describe("generateDailyReport idempotency", () => {
  it("skips re-running the pipeline when a final report already exists and force is not set", async () => {
    reports.push({
      id: "existing-report",
      report_date: "2026-08-01",
      status: "final",
      ai_status: "completed",
    });

    const result = await generateDailyReport("2026-08-01");
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.skipped).toBe(true);
      expect(result.reportId).toBe("existing-report");
    }
    expect(collectDailyMetricsMock).not.toHaveBeenCalled();
    expect(analyzeDailyReportMock).not.toHaveBeenCalled();
  });

  it("always re-runs the pipeline when force:true is passed, even over an existing final report", async () => {
    reports.push({
      id: "existing-report",
      report_date: "2026-08-01",
      status: "final",
      ai_status: "completed",
    });

    const result = await generateDailyReport("2026-08-01", { force: true });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.skipped).toBeFalsy();
    }
    expect(collectDailyMetricsMock).toHaveBeenCalledTimes(1);
    expect(analyzeDailyReportMock).toHaveBeenCalledTimes(1);
  });

  it("runs the pipeline normally when no report exists yet for the date", async () => {
    const result = await generateDailyReport("2026-08-01");
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.skipped).toBeFalsy();
    }
    expect(collectDailyMetricsMock).toHaveBeenCalledTimes(1);
  });
});
