/**
 * GNews quota planner — allocation + query list for under-covered districts.
 * Does NOT call markProviderQuotaExhausted; that remains owned by the GNews provider.
 * Uses existing source-state quota fields conceptually (requests_used / limit)
 * via a persisted-planner interface that can be backed by DB later.
 */

import type { CoveragePlanItem } from "@/lib/autonomous/types";
import type {
  GnewsQuotaAllocation,
  GnewsQuotaBucket,
} from "@/lib/autonomous/types";

/** Percent shares — must sum to 100 */
export const GNEWS_QUOTA_ALLOCATION_PCT: GnewsQuotaAllocation = {
  gaps: 40,
  statewide: 20,
  second_pass: 20,
  topical: 10,
  reserve: 10,
};

export type GnewsQuotaLedgerSnapshot = {
  day: string;
  requestsUsed: number;
  requestsLimit: number;
  reserveRemaining: number;
  metadata?: Record<string, unknown>;
};

export type GnewsQuotaPlan = {
  day: string;
  limit: number;
  used: number;
  remaining: number;
  allocation: Record<GnewsQuotaBucket, number>;
  queries: GnewsDistrictQuery[];
};

export type GnewsDistrictQuery = {
  districtSlug: string;
  query: string;
  bucket: GnewsQuotaBucket;
  deficit: number;
};

export type PersistedQuotaPlanner = {
  getLedger(day: string): Promise<GnewsQuotaLedgerSnapshot | null>;
  saveLedger(snapshot: GnewsQuotaLedgerSnapshot): Promise<void>;
};

/** In-memory planner for unit tests / shadow planning without DB writes. */
export function createInMemoryQuotaPlanner(
  initial?: GnewsQuotaLedgerSnapshot
): PersistedQuotaPlanner {
  const store = new Map<string, GnewsQuotaLedgerSnapshot>();
  if (initial) store.set(initial.day, { ...initial });
  return {
    async getLedger(day) {
      return store.get(day) ?? null;
    },
    async saveLedger(snapshot) {
      store.set(snapshot.day, { ...snapshot });
    },
  };
}

export function assertAllocationSumsTo100(
  allocation: GnewsQuotaAllocation = GNEWS_QUOTA_ALLOCATION_PCT
): void {
  const sum = Object.values(allocation).reduce((a, b) => a + b, 0);
  if (sum !== 100) {
    throw new Error(`GNews quota allocation must sum to 100, got ${sum}`);
  }
}

export function allocateRequestBudget(
  limit: number,
  allocation: GnewsQuotaAllocation = GNEWS_QUOTA_ALLOCATION_PCT
): Record<GnewsQuotaBucket, number> {
  assertAllocationSumsTo100(allocation);
  const buckets = Object.keys(allocation) as GnewsQuotaBucket[];
  const raw: Record<GnewsQuotaBucket, number> = {
    gaps: 0,
    statewide: 0,
    second_pass: 0,
    topical: 0,
    reserve: 0,
  };
  let assigned = 0;
  for (const key of buckets) {
    const n = Math.floor((limit * allocation[key]) / 100);
    raw[key] = n;
    assigned += n;
  }
  // Remainder goes to reserve so we never over-allocate
  raw.reserve += Math.max(0, limit - assigned);
  return raw;
}

export function buildDistrictGapQueries(
  underCovered: CoveragePlanItem[],
  maxQueries = 40
): GnewsDistrictQuery[] {
  const sorted = [...underCovered].sort((a, b) => b.deficit - a.deficit);
  return sorted.slice(0, maxQueries).map((item) => ({
    districtSlug: item.districtSlug,
    query: `${item.districtSlug.replace(/-/g, " ")} Chhattisgarh news`,
    bucket: "gaps" as const,
    deficit: item.deficit,
  }));
}

export function planGnewsQuota(input: {
  day: string;
  requestsLimit: number;
  requestsUsed: number;
  underCovered: CoveragePlanItem[];
}): GnewsQuotaPlan {
  const remaining = Math.max(0, input.requestsLimit - input.requestsUsed);
  const allocation = allocateRequestBudget(input.requestsLimit);
  const reserveRemaining = Math.max(
    0,
    allocation.reserve - Math.max(0, input.requestsUsed - (input.requestsLimit - allocation.reserve))
  );

  // Prefer gap queries within the gaps bucket capacity
  const gapBudget = Math.min(allocation.gaps, remaining);
  const queries = buildDistrictGapQueries(input.underCovered, gapBudget);

  return {
    day: input.day,
    limit: input.requestsLimit,
    used: input.requestsUsed,
    remaining,
    allocation: {
      ...allocation,
      // expose effective reserve remaining hint via same shape
      reserve: Math.max(reserveRemaining, allocation.reserve),
    },
    queries,
  };
}

/**
 * Soft check against a ledger snapshot — does not mutate provider source-state.
 * Callers that hit hard 429s must still use markProviderQuotaExhausted.
 */
export function isQuotaSoftExhausted(
  snapshot: GnewsQuotaLedgerSnapshot
): boolean {
  return snapshot.requestsUsed >= snapshot.requestsLimit;
}
