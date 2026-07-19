/**
 * Shared provider-outcome model — single source of truth for how much an
 * ingestion provider matters to overall pipeline health.
 *
 * Phase 1 (Production Recovery): consolidates provider criticality so that an
 * optional provider failure (e.g. GNews daily quota) or a dead/retired RSS feed
 * can never be treated as a full-worker or full-platform failure.
 *
 * Classifications:
 * - required   : the run cannot be considered successful without it (e.g. DB persistence).
 * - preferred   : primary coverage source; its failure degrades but does not fail the run.
 * - optional    : fallback/supplementary coverage; failure is expected and tolerated.
 * - disabled    : intentionally turned off (config/circuit); must not count as a failure.
 * - retired     : permanently removed (dead upstream); must not count as a failure.
 */

export type ProviderClass =
  | "required"
  | "preferred"
  | "optional"
  | "disabled"
  | "retired";

export type ProviderFamily = "persistence" | "news-api" | "rss";

export type ProviderDescriptor = {
  id: string;
  family: ProviderFamily;
  classification: ProviderClass;
  /** Human label for incident language. */
  label: string;
};

/**
 * Known ingestion providers and their default classification.
 * `persistence` is not a "provider" the reader sees, but it is the single
 * required condition for any ingestion run to count as successful.
 */
export const PROVIDER_REGISTRY: Record<string, ProviderDescriptor> = {
  persistence: {
    id: "persistence",
    family: "persistence",
    classification: "required",
    label: "Database persistence",
  },
  newsdata: {
    id: "newsdata",
    family: "news-api",
    classification: "preferred",
    label: "NewsData",
  },
  gnews: {
    id: "gnews",
    family: "news-api",
    classification: "optional",
    label: "GNews",
  },
  rss: {
    id: "rss",
    family: "rss",
    classification: "preferred",
    label: "RSS feeds",
  },
};

/** Unknown providers default to optional so they can never dominate health. */
export function getProviderDescriptor(id: string): ProviderDescriptor {
  return (
    PROVIDER_REGISTRY[id] ?? {
      id,
      family: "rss",
      classification: "optional",
      label: id,
    }
  );
}

export function classifyProvider(id: string): ProviderClass {
  return getProviderDescriptor(id).classification;
}

export function isRequiredProvider(id: string): boolean {
  return classifyProvider(id) === "required";
}

/** disabled/retired providers must never count as failures. */
export function isIgnorableProviderFailure(classification: ProviderClass): boolean {
  return classification === "disabled" || classification === "retired";
}

export type ProviderOutcomeInput = {
  id: string;
  /** Produced useful articles OR was reachable without error. */
  ok: boolean;
  /** Intentionally not run this cycle (circuit open / disabled). */
  skipped?: boolean;
  error?: string | null;
  /** Optional per-run override of the registry classification. */
  classification?: ProviderClass;
};

export type ProviderOutcomeSummary = {
  completed: string[];
  /** Required providers (e.g. persistence) that failed. */
  requiredProviderFailures: string[];
  /** preferred + optional providers that failed (never disabled/retired). */
  optionalProviderFailures: string[];
  /** Providers intentionally skipped/disabled this run. */
  skipped: string[];
  /** At least one news-source family (news-api OR rss) produced usefully. */
  newsFamilyHealthy: boolean;
};

/**
 * Reduce a set of provider outcomes into required vs optional failures.
 * Disabled/retired providers are excluded from failure accounting entirely.
 */
export function summarizeProviderOutcomes(
  outcomes: ProviderOutcomeInput[]
): ProviderOutcomeSummary {
  const completed: string[] = [];
  const requiredProviderFailures: string[] = [];
  const optionalProviderFailures: string[] = [];
  const skipped: string[] = [];
  let newsFamilyHealthy = false;

  for (const outcome of outcomes) {
    const descriptor = getProviderDescriptor(outcome.id);
    const classification = outcome.classification ?? descriptor.classification;

    if (outcome.skipped || classification === "disabled" || classification === "retired") {
      // Never counts as a failure — record for visibility only.
      if (!outcome.ok) skipped.push(outcome.id);
      else completed.push(outcome.id);
      if (outcome.ok && descriptor.family !== "persistence") newsFamilyHealthy = true;
      continue;
    }

    if (outcome.ok) {
      completed.push(outcome.id);
      if (descriptor.family !== "persistence") newsFamilyHealthy = true;
      continue;
    }

    if (classification === "required") {
      requiredProviderFailures.push(outcome.id);
    } else {
      optionalProviderFailures.push(outcome.id);
    }
  }

  return {
    completed,
    requiredProviderFailures,
    optionalProviderFailures,
    skipped,
    newsFamilyHealthy,
  };
}
