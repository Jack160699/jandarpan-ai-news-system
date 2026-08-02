import { describe, expect, it, vi } from "vitest";
import type { DeterministicReport } from "@/lib/newsroom-audit/collect";

/**
 * generate.ts's notification dedup logic (generateDailyReport, around the
 * "Notifications: dedupe against any currently-open (unresolved)
 * notification with the same incident key" comment) is inline, not factored
 * into a standalone function: it builds
 * `incidentKey = \`${reportDate}:${finding.category}:${finding.title}\`.slice(0, 500)`,
 * SELECTs daily_newsroom_notifications for an open row with that
 * incident_key, and only INSERTs when none is found. There is no pure
 * function to unit test in isolation, so this test drives the real
 * generateDailyReport() twice against a stateful in-memory
 * daily_newsroom_notifications table and asserts the second run does not
 * create a second open row for the same finding.
 */

type Row = Record<string, unknown>;

// Shared, mutable notification store — persists across both
// generateDailyReport() calls within a test, the way a real Postgres table
// would, so the second call's SELECT can actually see the first call's
// INSERT.
let notifications: Row[] = [];
let notificationIdSeq = 1;

function createGenerateSupabaseMock() {
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
    api.gte = chainable();
    api.lt = chainable();
    api.not = chainable();
    api.in = chainable();
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
        if (mode === "upsert") return { data: { id: "report-1" }, error: null };
        return { data: null, error: null };
      }
      if (table === "daily_newsroom_report_metrics") {
        return { data: [], error: null };
      }
      if (table === "daily_newsroom_report_findings") {
        if (mode === "insert") {
          const rows = (Array.isArray(payload) ? payload : [payload]) as Row[];
          return {
            data: rows.map((r, i) => ({ id: `finding-${i}`, title: r.title })),
            error: null,
          };
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
    api.then = (resolve: (v: unknown) => void, reject?: (e: unknown) => void) =>
      run().then(resolve, reject);
    return api;
  }

  return { from };
}

vi.mock("@/lib/supabase", () => ({
  isSupabaseConfigured: () => true,
  createAdminServerClient: () => createGenerateSupabaseMock(),
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

import { generateDailyReport } from "@/lib/newsroom-audit/generate";

function metricOk<T>(value: T) {
  return { status: "ok" as const, value };
}

/**
 * Minimal deterministic report where the only finding-triggering value is
 * content_production.articlesPublished = 0 (buildDeterministicFindings
 * turns that into a single "No articles published today" critical finding
 * — see src/lib/newsroom-audit/generate.ts). Everything else is set to a
 * value that does not trigger any additional finding, so exactly one
 * notification-eligible finding exists per run.
 */
function buildReport(): DeterministicReport {
  return {
    reportDate: "2026-08-01",
    windowStartIso: "2026-07-31T18:30:00.000Z",
    windowEndIso: "2026-08-01T18:30:00.000Z",
    collectedAt: new Date().toISOString(),
    content_production: {
      articlesCreated: metricOk(0),
      articlesPublished: metricOk(0),
      byWorkflowStatus: metricOk({}),
      eventsCreated: metricOk(0),
    },
    content_mix: {
      byCategory: metricOk([]),
      byRegion: metricOk([]),
      byLanguage: metricOk([]),
    },
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
    provider_quota: {
      buckets: metricOk([]),
    },
    embeddings_clustering: {
      embeddingsCreatedOpenAi: metricOk(0),
      embeddingsCreatedCloudflare: metricOk(0),
      eventsWithMultipleSources: metricOk(0),
      avgSourceCountPerEvent: metricOk(null),
    },
    images: {
      queued: metricOk(0),
      completed: metricOk(0),
      failed: metricOk(0),
      pending: metricOk(0),
    },
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

describe("generateDailyReport notification dedup", () => {
  it("does not create a second open notification row for the same finding on a repeat run", async () => {
    notifications = [];
    notificationIdSeq = 1;
    collectDailyMetricsMock.mockReset();
    analyzeDailyReportMock.mockReset();
    runAutomatedActionsMock.mockClear();
    collectDailyMetricsMock.mockResolvedValue(buildReport());
    analyzeDailyReportMock.mockResolvedValue({ ai_status: "unavailable", reason: "test-skip" });

    const first = await generateDailyReport("2026-08-01");
    expect(first.ok).toBe(true);
    if (first.ok) {
      expect(first.notificationsCreated).toBe(1);
    }
    expect(notifications).toHaveLength(1);
    const firstIncidentKey = notifications[0]!.incident_key;
    expect(firstIncidentKey).toBe("2026-08-01:content_production:No articles published today");

    const second = await generateDailyReport("2026-08-01");
    expect(second.ok).toBe(true);
    if (second.ok) {
      // Same finding, same day -> the dedup check must find the still-open
      // notification from the first run and skip the insert.
      expect(second.notificationsCreated).toBe(0);
    }

    // Exactly one open notification row exists after two runs, and the
    // incident_key construction is stable/deterministic across runs.
    expect(notifications).toHaveLength(1);
    expect(notifications[0]!.incident_key).toBe(firstIncidentKey);
  });
});
