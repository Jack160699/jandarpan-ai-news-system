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
          notifications.push({
            id: `notif-${notificationIdSeq++}`,
            ...row,
            resolved_at: null,
            acknowledged_at: null,
            created_at: `created-at-seq-${notificationIdSeq}`,
          });
          return { data: null, error: null };
        }
        if (mode === "update") {
          const patch = payload as Row;
          for (const n of notifications) {
            if (filters.every((f) => f(n))) Object.assign(n, patch);
          }
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
    expect(firstIncidentKey).toBe("2026-08-01:deterministic:content_production:content_production.articlesPublished:critical");

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

  it("three differently worded AI findings about the same metric create exactly one notification", async () => {
    notifications = [];
    notificationIdSeq = 1;
    collectDailyMetricsMock.mockReset();
    analyzeDailyReportMock.mockReset();
    runAutomatedActionsMock.mockClear();
    collectDailyMetricsMock.mockResolvedValue(buildReport());

    // Same underlying incident (pipeline_infrastructure.jobsFailed), three
    // completely different AI phrasings across three "runs" — this is
    // exactly the failure mode reported live: workers-health/jobsFailed
    // findings paraphrased differently each regeneration produced 16
    // notification rows for what should have been a handful of incidents.
    const wordings = [
      "पाइपलाइन बुनियादी ढांचे में 12 नौकरियां (jobsFailed) विफल हो गईं।",
      "12 jobs failed in the pipeline infrastructure today — investigate the queue.",
      "Pipeline infra: 12 job failures recorded (jobsFailed metric).",
    ];

    // buildReport()'s articlesPublished:0 also triggers its own deterministic
    // finding/notification (covered by the test above) — give this report a
    // nonzero count so this test isolates purely to the AI-finding dedup
    // behavior under test.
    const reportWithoutDeterministicFindings: DeterministicReport = {
      ...buildReport(),
      content_production: { ...buildReport().content_production, articlesPublished: metricOk(5) },
    };
    collectDailyMetricsMock.mockResolvedValue(reportWithoutDeterministicFindings);

    for (const text of wordings) {
      analyzeDailyReportMock.mockResolvedValueOnce({
        ai_status: "completed",
        status: "warning",
        executive_summary: "Test summary.",
        achievements: [],
        warnings: [],
        problems: [{ text, metric_ref: "pipeline_infrastructure.jobsFailed" }],
        actions: [],
        provider: "gemini",
        model: "gemini-3.5-flash-lite",
      });
      const result = await generateDailyReport("2026-08-02");
      expect(result.ok).toBe(true);
    }

    expect(notifications).toHaveLength(1);
    expect(notifications[0]!.incident_key).toBe(
      "2026-08-02:ai:ai_summary:pipeline_infrastructure.jobsFailed:critical"
    );

    // The single row's wording reflects the LAST run (updated in place, not
    // left stale), while its identity/ack state would have survived any
    // real acknowledgement across all three runs.
    expect(notifications[0]!.title).toBe(wordings[2]);
    expect(notifications[0]!.id).toBe("notif-1"); // still the first-ever-inserted row, only updated
  });

  it("preserves acknowledged_at across a reworded rerun of the same incident (update-in-place, not delete+reinsert)", async () => {
    notifications = [];
    notificationIdSeq = 1;
    collectDailyMetricsMock.mockReset();
    analyzeDailyReportMock.mockReset();
    runAutomatedActionsMock.mockClear();
    const reportWithoutDeterministicFindings: DeterministicReport = {
      ...buildReport(),
      content_production: { ...buildReport().content_production, articlesPublished: metricOk(5) },
    };
    collectDailyMetricsMock.mockResolvedValue(reportWithoutDeterministicFindings);
    analyzeDailyReportMock.mockResolvedValue({
      ai_status: "completed",
      status: "warning",
      executive_summary: "Test summary.",
      achievements: [],
      warnings: [{ text: "Initial wording of the same issue.", metric_ref: "images.failed" }],
      problems: [],
      actions: [],
      provider: "gemini",
      model: "gemini-3.5-flash-lite",
    });

    await generateDailyReport("2026-08-03");
    expect(notifications).toHaveLength(1);
    notifications[0]!.acknowledged_at = "2026-08-03T10:00:00.000Z";
    notifications[0]!.acknowledged_by = "editor@jandarpan.news";

    analyzeDailyReportMock.mockResolvedValue({
      ai_status: "completed",
      status: "warning",
      executive_summary: "Test summary.",
      achievements: [],
      warnings: [{ text: "Reworded description of the same issue.", metric_ref: "images.failed" }],
      problems: [],
      actions: [],
      provider: "gemini",
      model: "gemini-3.5-flash-lite",
    });
    await generateDailyReport("2026-08-03");

    expect(notifications).toHaveLength(1);
    expect(notifications[0]!.title).toBe("Reworded description of the same issue.");
    expect(notifications[0]!.acknowledged_at).toBe("2026-08-03T10:00:00.000Z");
    expect(notifications[0]!.acknowledged_by).toBe("editor@jandarpan.news");
  });
});
