/**
 * Canonical ingestion outcome contract.
 *
 * Phase 1 (Production Recovery): maps the raw result of an ingestion run into
 * honest status (`success | degraded | failed`) plus a finer `classification`.
 *
 * Guiding rule: a run is NEVER marked `failed` merely because `errors.length > 0`.
 * Soft errors (a dead RSS feed, an optional-provider quota) degrade a run that
 * still persisted useful content; they do not fail it.
 *
 * Hard failures: persistence, all source families down, misconfiguration.
 */

import {
  getProviderDescriptor,
  summarizeProviderOutcomes,
  type ProviderOutcomeInput,
  type ProviderOutcomeSummary,
} from "@/lib/news/providers/provider-classification";

export type IngestionStatus = "success" | "degraded" | "failed";

export type IngestionClassification =
  | "healthy_new_content"
  | "healthy_no_novel_content"
  | "degraded_provider_failure"
  | "degraded_quota"
  | "skipped_backpressure"
  | "failed_persistence"
  | "failed_all_providers"
  | "failed_configuration";

export type IngestionOutcome = {
  status: IngestionStatus;
  /** Fine-grained outcome label for ops / cron telemetry. */
  classification: IngestionClassification;
  ok: boolean;
  degraded: boolean;
  fetched: number;
  inserted: number;
  duplicates: number;
  rejected: number;
  queuedForAI: number;
  completedProviders: string[];
  failedProviders: string[];
  optionalProviderFailures: string[];
  requiredProviderFailures: string[];
  timedOutSafely: boolean;
  persistenceSucceeded: boolean;
  failureReason: string | null;
  startedAt: string;
  completedAt: string;
  durationMs: number;
};

export type IngestionOutcomeInput = {
  fetched: number;
  inserted: number;
  /** Net-new signals persisted (newsroom layer). */
  signalsInserted?: number;
  duplicates: number;
  rejected: number;
  queuedForAI: number;
  completedProviders: string[];
  skippedProviders: string[];
  /** Raw soft errors, e.g. "rss: <source> failed". Informational only. */
  errors: string[];
  timedOutSafely: boolean;
  /** Derived from real persist result — never hardcode true. */
  persistenceSucceeded: boolean;
  startedAt: number;
  completedAt: number;
  /**
   * Optional richer per-provider outcomes. When omitted, provider outcomes are
   * derived from completedProviders/skippedProviders across the known families
   * (newsdata, gnews, rss).
   */
  providerOutcomes?: ProviderOutcomeInput[];
  /** Queue health paused ingestion this cycle. */
  skippedBackpressure?: boolean;
  /** Missing Supabase / provider credentials. */
  configurationFailed?: boolean;
};

const KNOWN_SOURCE_PROVIDERS = ["newsdata", "gnews", "rss"] as const;

/**
 * Derive per-provider outcomes from the coarse completed/skipped lists when the
 * caller does not supply explicit provider outcomes. Individual dead RSS
 * sub-feeds are intentionally NOT surfaced here — only provider *families*.
 */
function deriveProviderOutcomes(
  input: IngestionOutcomeInput
): ProviderOutcomeInput[] {
  const completed = new Set(input.completedProviders);
  const skipped = new Set(input.skippedProviders);
  const outcomes: ProviderOutcomeInput[] = [];

  for (const id of KNOWN_SOURCE_PROVIDERS) {
    if (completed.has(id)) {
      outcomes.push({ id, ok: true });
    } else if (skipped.has(id)) {
      outcomes.push({ id, ok: false, skipped: false });
    }
    // A provider absent from both lists was not attempted — not a failure.
  }

  return outcomes;
}

function looksLikeQuota(errors: string[], optionalFailures: string[]): boolean {
  if (optionalFailures.includes("gnews") && optionalFailures.length === 1) {
    return true;
  }
  return errors.some((e) => /quota|429|rate.?limit/i.test(e));
}

export function classifyIngestionOutcome(
  input: IngestionOutcomeInput
): IngestionOutcome {
  const durationMs = Math.max(0, input.completedAt - input.startedAt);
  const signalsInserted = input.signalsInserted ?? 0;
  const persistedUseful = input.inserted > 0 || signalsInserted > 0;

  const providerOutcomes =
    input.providerOutcomes ?? deriveProviderOutcomes(input);
  const summary: ProviderOutcomeSummary =
    summarizeProviderOutcomes(providerOutcomes);

  // Persistence is a required condition tracked separately from source providers.
  const requiredProviderFailures = [...summary.requiredProviderFailures];
  if (!input.persistenceSucceeded) {
    requiredProviderFailures.push("persistence");
  }

  const failedProviders = [
    ...requiredProviderFailures,
    ...summary.optionalProviderFailures,
  ];

  const base = {
    fetched: input.fetched,
    inserted: input.inserted,
    duplicates: input.duplicates,
    rejected: input.rejected,
    queuedForAI: input.queuedForAI,
    completedProviders: summary.completed,
    failedProviders,
    optionalProviderFailures: summary.optionalProviderFailures,
    requiredProviderFailures,
    timedOutSafely: input.timedOutSafely,
    persistenceSucceeded: input.persistenceSucceeded,
    startedAt: new Date(input.startedAt).toISOString(),
    completedAt: new Date(input.completedAt).toISOString(),
    durationMs,
  };

  // ---- CONFIGURATION / BACKPRESSURE (explicit caller flags) -----------------
  if (input.configurationFailed) {
    return {
      ...base,
      status: "failed",
      classification: "failed_configuration",
      ok: false,
      degraded: false,
      failureReason: "configuration_failed",
    };
  }

  if (input.skippedBackpressure) {
    return {
      ...base,
      status: "degraded",
      classification: "skipped_backpressure",
      ok: true,
      degraded: true,
      failureReason: null,
    };
  }

  // ---- FAILED ---------------------------------------------------------------
  // Persistence failed → the run could not durably record anything.
  if (!input.persistenceSucceeded) {
    return {
      ...base,
      status: "failed",
      classification: "failed_persistence",
      ok: false,
      degraded: false,
      failureReason: "persistence_failed",
    };
  }

  // Every required source family failed AND nothing useful was produced.
  const noSourceFamilyWorked = !summary.newsFamilyHealthy;
  const nothingFetched = input.fetched === 0 && !persistedUseful;
  if (noSourceFamilyWorked && nothingFetched) {
    return {
      ...base,
      status: "failed",
      classification: "failed_all_providers",
      ok: false,
      degraded: false,
      failureReason: "all_source_families_failed",
    };
  }

  // ---- DEGRADED -------------------------------------------------------------
  const hasOptionalFailure = summary.optionalProviderFailures.length > 0;
  const hasSkipped = summary.skipped.length > 0;
  const degraded =
    hasOptionalFailure || hasSkipped || input.timedOutSafely;

  if (degraded) {
    const quota =
      looksLikeQuota(input.errors, summary.optionalProviderFailures) &&
      summary.optionalProviderFailures.includes("gnews");
    return {
      ...base,
      status: "degraded",
      classification: quota ? "degraded_quota" : "degraded_provider_failure",
      ok: true,
      degraded: true,
      failureReason: null,
    };
  }

  // ---- SUCCESS --------------------------------------------------------------
  // Persistence ok, no meaningful provider degradation. This includes the
  // "all duplicates" case (inserted === 0 but providers healthy).
  return {
    ...base,
    status: "success",
    classification: persistedUseful
      ? "healthy_new_content"
      : "healthy_no_novel_content",
    ok: true,
    degraded: false,
    failureReason: null,
  };
}

/**
 * Human-readable, non-alarming incident language for an ingestion run.
 * Replaces misleading "Cron failed: fetch-news" messaging.
 */
export function describeIngestionOutcome(outcome: IngestionOutcome): {
  title: string;
  detail: string;
} {
  if (outcome.classification === "failed_persistence" ||
      outcome.failureReason === "persistence_failed") {
    return {
      title: "News ingestion failed",
      detail:
        "Database persistence failed — no articles could be recorded this run.",
    };
  }

  if (outcome.classification === "failed_configuration") {
    return {
      title: "News ingestion failed",
      detail: "Ingestion configuration is incomplete (providers or database).",
    };
  }

  if (outcome.classification === "skipped_backpressure") {
    return {
      title: "News ingestion skipped",
      detail: "Queue backpressure paused ingestion this cycle — protective skip.",
    };
  }

  if (outcome.status === "failed") {
    return {
      title: "News ingestion failed",
      detail:
        "All news source families failed and no articles were fetched this run.",
    };
  }

  if (outcome.status === "degraded") {
    const failedLabels = outcome.optionalProviderFailures
      .map((id) => getProviderDescriptor(id).label)
      .join(", ");

    const gnewsQuota =
      outcome.classification === "degraded_quota" ||
      (outcome.optionalProviderFailures.includes("gnews") &&
        outcome.optionalProviderFailures.length === 1);
    if (gnewsQuota && outcome.optionalProviderFailures.includes("gnews")) {
      return {
        title: "News ingestion degraded",
        detail: `GNews daily quota exhausted. NewsData and RSS ingestion continue. ${outcome.inserted} articles inserted, ${outcome.queuedForAI} queued for AI. GNews coverage resumes after provider reset.`,
      };
    }

    const parts = [
      failedLabels
        ? `Fallback active — ${failedLabels} degraded`
        : "Partial coverage after safe deadline",
      `${outcome.inserted} articles inserted`,
      `${outcome.queuedForAI} queued for AI`,
    ];
    return {
      title: "News ingestion degraded",
      detail: `${parts.join(". ")}. Newsroom continues on remaining providers.`,
    };
  }

  if (outcome.classification === "healthy_no_novel_content") {
    return {
      title: "News ingestion healthy",
      detail: `No novel articles this run (${outcome.duplicates} duplicates). Providers healthy.`,
    };
  }

  return {
    title: "News ingestion healthy",
    detail: `${outcome.inserted} articles inserted, ${outcome.queuedForAI} queued for AI across ${outcome.completedProviders.length} providers.`,
  };
}
