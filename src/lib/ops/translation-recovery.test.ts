import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  classifyTranslationError,
  parseLanguagePairArg,
} from "@/lib/ops/translation-recovery";

type Row = Record<string, unknown>;

const state = {
  jobs: [] as Row[],
  articles: [] as Row[],
};

function createClientMock() {
  function from(table: string) {
    const filters: Array<(row: Row) => boolean> = [];
    let limitN = 500;
    let mode: "list" | "count" | "maybe" = "list";
    let updatePatch: Row | null = null;

    const api: Record<string, unknown> = {};

    const run = async () => {
      let rows: Row[] = [];
      if (table === "worker_jobs") rows = state.jobs;
      else if (table === "generated_articles") rows = state.articles;

      rows = rows.filter((r) => filters.every((f) => f(r)));
      if (updatePatch) {
        for (const r of rows) Object.assign(r, updatePatch);
      }
      if (mode === "count") {
        return { data: null, count: rows.length, error: null };
      }
      if (mode === "maybe") {
        return { data: rows[0] ?? null, error: null };
      }
      return { data: rows.slice(0, limitN), count: rows.length, error: null };
    };

    const chain = new Proxy(api, {
      get(_target, prop: string) {
        if (prop === "then") {
          return (resolve: (v: unknown) => void, reject?: (e: unknown) => void) =>
            run().then(resolve, reject);
        }
        if (prop === "select") {
          return (_cols: string, opts?: { count?: string; head?: boolean }) => {
            if (opts?.count === "exact" && opts.head) mode = "count";
            return chain;
          };
        }
        if (prop === "eq") {
          return (col: string, val: unknown) => {
            filters.push((r) => r[col] === val);
            return chain;
          };
        }
        if (prop === "neq") {
          return (col: string, val: unknown) => {
            filters.push((r) => r[col] !== val);
            return chain;
          };
        }
        if (prop === "in") {
          return (col: string, vals: unknown[]) => {
            filters.push((r) => vals.includes(r[col]));
            return chain;
          };
        }
        if (prop === "not") return () => chain;
        if (prop === "order") return () => chain;
        if (prop === "limit") {
          return (n: number) => {
            limitN = n;
            return chain;
          };
        }
        if (prop === "maybeSingle") {
          return async () => {
            mode = "maybe";
            return run();
          };
        }
        if (prop === "update") {
          return (patch: Row) => {
            updatePatch = patch;
            return chain;
          };
        }
        return () => chain;
      },
    });

    return chain;
  }

  return { from };
}

vi.mock("@/lib/supabase", () => ({
  createAdminServerClient: () => createClientMock(),
  createAdminClient: () => createClientMock(),
}));

vi.mock("@/lib/infrastructure/jobs/queue", () => ({
  reviveDeadJob: vi.fn(async () => null),
  enqueueJob: vi.fn(async () => "job-new"),
  countPendingJobs: vi.fn(async () => 0),
}));

describe("classifyTranslationError", () => {
  it("marks urgencyScore as retryable after code repair", () => {
    expect(classifyTranslationError("urgencyScore is not defined")).toBe(
      "retryable"
    );
    expect(classifyTranslationError("translation_failed")).toBe("retryable");
  });

  it("marks permanent payload errors", () => {
    expect(classifyTranslationError("article_not_found")).toBe("permanent");
    expect(classifyTranslationError("invalid_target_language")).toBe(
      "permanent"
    );
  });
});

describe("runTranslationRecovery dry-run", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.NEWSROOM_CG_TRANSLATION;
    state.articles = [
      {
        id: "art-1",
        tenant_id: "t1",
        language: "hi",
        headline: "शीर्षक",
        summary: "सार",
        article_body: "शरीर",
        editorial_metadata: {},
        translations: null,
        published_at: new Date().toISOString(),
        editorial_status: "approved",
      },
    ];
    state.jobs = [
      {
        id: "j-retry",
        tenant_id: "t1",
        dedupe_key: "translate:art-1:en",
        job_type: "translate_article",
        status: "failed",
        attempts: 2,
        priority: 6,
        last_error: "urgencyScore is not defined",
        created_at: new Date(Date.now() - 3600_000).toISOString(),
        scheduled_at: new Date(Date.now() - 3600_000).toISOString(),
        payload: { articleId: "art-1", targetLanguage: "en" },
      },
      {
        id: "j-cg",
        tenant_id: "t1",
        dedupe_key: "translate:art-1:cg",
        job_type: "translate_article",
        status: "pending",
        attempts: 0,
        priority: 6,
        last_error: null,
        created_at: new Date().toISOString(),
        scheduled_at: new Date().toISOString(),
        payload: { articleId: "art-1", targetLanguage: "cg" },
      },
    ];
  });

  it("dry-run classifies without mutating and excludes disabled CG", async () => {
    const before = JSON.stringify(state.jobs);
    const { runTranslationRecovery } = await import(
      "@/lib/ops/translation-recovery"
    );
    const result = await runTranslationRecovery({ dryRun: true, batchSize: 5 });

    expect(result.dryRun).toBe(true);
    expect(result.examined).toBe(2);
    expect(result.byClass.disabled_language).toBe(1);
    expect(result.byClass.eligible_retry ?? result.byClass.retryable_failure).toBe(
      1
    );
    expect(result.selected).toBe(1);
    expect(result.coverage.cgEnabled).toBe(false);
    expect(result.coverage.cgJobsExcludedFromActive).toBeGreaterThanOrEqual(1);
    expect(JSON.stringify(state.jobs)).toBe(before);
  });

  it("parses language pair filters", () => {
    expect(parseLanguagePairArg("hi:en")).toEqual({
      source: "hi",
      target: "en",
    });
    expect(parseLanguagePairArg("en")).toEqual({ target: "en" });
  });
});
