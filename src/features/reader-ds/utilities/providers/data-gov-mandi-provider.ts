import { getDistrict } from "@/lib/regional/districts";
import {
  MANDI_COMMODITY_PREFS,
  MANDI_STATE_FILTERS,
  matchesPreferredCommodity,
} from "../commodities";
import { parseMandiReportedDate } from "../freshness";
import {
  dedupeMandiRates,
  normalizeMandiRecord,
  selectHomepageRates,
  type RawMandiRecord,
} from "../normalize";
import {
  MANDI_API_HOST,
  MANDI_REVALIDATE_SEC,
  MANDI_RESOURCE_ID,
  MANDI_SOURCE,
  type MandiProviderResult,
  type MandiRate,
} from "../types";

export type FetchMandiOptions = {
  districtSlug?: string | null;
  /** Preferred commodity ids from commodities.ts */
  commodityIds?: string[];
  limit?: number;
  signal?: AbortSignal;
  revalidateSec?: number;
  /** Injected for tests */
  fetchImpl?: typeof fetch;
  apiKey?: string | null;
  now?: Date;
};

function readApiKey(explicit?: string | null): string | null {
  const key = (explicit ?? process.env.DATA_GOV_IN_API_KEY ?? "").trim();
  return key || null;
}

function districtFilterValue(slug: string | null | undefined): string {
  const d = slug?.trim() ? getDistrict(slug.trim()) : undefined;
  return d?.name ?? "Raipur";
}

function locationLabel(slug: string | null | undefined): string {
  const d = slug?.trim() ? getDistrict(slug.trim()) : undefined;
  return d?.nameHi ?? d?.name ?? "रायपुर";
}

type ProviderEnvelope = {
  records?: unknown;
  count?: unknown;
  status?: unknown;
  message?: unknown;
  error?: unknown;
};

function isRecordArray(v: unknown): v is RawMandiRecord[] {
  return Array.isArray(v) && v.every((x) => x && typeof x === "object" && !Array.isArray(x));
}

async function fetchPage(opts: {
  apiKey: string;
  filters: Record<string, string>;
  limit: number;
  offset: number;
  signal?: AbortSignal;
  revalidateSec: number;
  fetchImpl: typeof fetch;
}): Promise<{ ok: true; records: RawMandiRecord[] } | { ok: false; reason: "provider_error" | "invalid_schema" }> {
  const url = new URL(`${MANDI_API_HOST}/resource/${MANDI_RESOURCE_ID}`);
  url.searchParams.set("api-key", opts.apiKey);
  url.searchParams.set("format", "json");
  url.searchParams.set("limit", String(opts.limit));
  url.searchParams.set("offset", String(opts.offset));
  for (const [k, v] of Object.entries(opts.filters)) {
    url.searchParams.set(`filters[${k}]`, v);
  }

  let res: Response;
  try {
    res = await opts.fetchImpl(url.toString(), {
      signal: opts.signal,
      headers: { Accept: "application/json" },
      next: { revalidate: opts.revalidateSec },
    } as RequestInit);
  } catch {
    return { ok: false, reason: "provider_error" };
  }

  let json: ProviderEnvelope | null = null;
  try {
    json = (await res.json()) as ProviderEnvelope;
  } catch {
    return { ok: false, reason: "invalid_schema" };
  }

  if (!res.ok) {
    return { ok: false, reason: "provider_error" };
  }
  if (!isRecordArray(json.records)) {
    // Some error payloads still 200 with message
    if (json.error || json.message) return { ok: false, reason: "provider_error" };
    return { ok: false, reason: "invalid_schema" };
  }
  return { ok: true, records: json.records };
}

/**
 * Server-only AGMARKNET mandi fetch. Never returns the API key or provider URL.
 */
export async function fetchMandiRates(opts: FetchMandiOptions = {}): Promise<MandiProviderResult> {
  const fetchedAt = (opts.now ?? new Date()).toISOString();
  const apiKey = readApiKey(opts.apiKey);
  const fetchImpl = opts.fetchImpl ?? fetch;
  const revalidateSec = opts.revalidateSec ?? MANDI_REVALIDATE_SEC;
  const limit = Math.min(Math.max(opts.limit ?? 5, 1), 5);
  const districtName = districtFilterValue(opts.districtSlug);
  const location = locationLabel(opts.districtSlug);

  if (!apiKey) {
    return {
      status: "unavailable",
      reason: "missing_api_key",
      rates: [],
      fetchedAt,
      source: MANDI_SOURCE,
      location,
    };
  }

  const stateFieldCandidates = ["state", "State"] as const;
  const districtFieldCandidates = ["district", "District"] as const;

  let raw: RawMandiRecord[] = [];
  let lastFail: "provider_error" | "invalid_schema" | null = null;

  // Prefer user district; fall back to any Chhattisgarh page if empty.
  for (const state of MANDI_STATE_FILTERS) {
    for (const stateField of stateFieldCandidates) {
      for (const districtField of districtFieldCandidates) {
        const page = await fetchPage({
          apiKey,
          filters: { [stateField]: state, [districtField]: districtName },
          limit: 100,
          offset: 0,
          signal: opts.signal,
          revalidateSec,
          fetchImpl,
        });
        if (!page.ok) {
          lastFail = page.reason;
          continue;
        }
        if (page.records.length) {
          raw = page.records;
          break;
        }
      }
      if (raw.length) break;
    }
    if (raw.length) break;
  }

  // State-only fallback (latest valid CG market)
  if (!raw.length) {
    for (const state of MANDI_STATE_FILTERS) {
      for (const stateField of stateFieldCandidates) {
        const page = await fetchPage({
          apiKey,
          filters: { [stateField]: state },
          limit: 100,
          offset: 0,
          signal: opts.signal,
          revalidateSec,
          fetchImpl,
        });
        if (!page.ok) {
          lastFail = page.reason;
          continue;
        }
        if (page.records.length) {
          raw = page.records;
          break;
        }
      }
      if (raw.length) break;
    }
  }

  if (!raw.length) {
    return {
      status: "unavailable",
      reason: lastFail ?? "no_current_records",
      rates: [],
      fetchedAt,
      source: MANDI_SOURCE,
      location,
    };
  }

  const preferredIds =
    opts.commodityIds?.length ? opts.commodityIds : MANDI_COMMODITY_PREFS.map((p) => p.id);

  const normalized: MandiRate[] = [];
  for (const row of raw) {
    const rate = normalizeMandiRecord(row, fetchedAt);
    if (!rate) continue;
    if (!rate.state.toLowerCase().includes("chhattisgarh") && !rate.state.toLowerCase().includes("chattisgarh")) {
      continue;
    }
    if (!matchesPreferredCommodity(rate.providerCommodity, preferredIds)) continue;
    normalized.push(rate);
  }

  const deduped = dedupeMandiRates(normalized);
  // Sort by true reported date before selection
  deduped.sort((a, b) => {
    const da = parseMandiReportedDate(a.reportedAt)?.getTime() ?? 0;
    const db = parseMandiReportedDate(b.reportedAt)?.getTime() ?? 0;
    return db - da;
  });

  const selected = selectHomepageRates(deduped, limit);
  if (!selected.length) {
    return {
      status: "unavailable",
      reason: "stale_records",
      rates: [],
      fetchedAt,
      source: MANDI_SOURCE,
      location,
    };
  }

  const freshest = selected.reduce<"current" | "recent">((acc, r) => {
    if (r.freshness === "recent") return "recent";
    return acc;
  }, "current");

  const reportedAt = selected
    .map((r) => r.reportedAt)
    .sort((a, b) => {
      const da = parseMandiReportedDate(a)?.getTime() ?? 0;
      const db = parseMandiReportedDate(b)?.getTime() ?? 0;
      return db - da;
    })[0]!;

  return {
    status: "available",
    location,
    rates: selected,
    reportedAt,
    fetchedAt,
    source: MANDI_SOURCE,
    freshness: freshest,
  };
}

export function toMandiApiJson(result: MandiProviderResult) {
  if (result.status === "unavailable") {
    return {
      status: "unavailable" as const,
      reason: result.reason,
      location: result.location,
      fetchedAt: result.fetchedAt,
      source: { name: MANDI_SOURCE },
      rates: [] as [],
    };
  }
  return {
    status: "available" as const,
    location: result.location,
    reportedAt: result.reportedAt,
    fetchedAt: result.fetchedAt,
    freshness: result.freshness,
    source: { name: MANDI_SOURCE },
    rates: result.rates.map((r) => ({
      commodity: r.commodity,
      providerCommodity: r.providerCommodity,
      variety: r.variety,
      market: r.market,
      district: r.district,
      state: r.state,
      modalPrice: r.modalPrice,
      minPrice: r.minPrice,
      maxPrice: r.maxPrice,
      unit: r.unit,
      reportedAt: r.reportedAt,
      freshness: r.freshness,
    })),
  };
}

/** Test helper — ensure serialized payloads never contain secrets. */
export function assertNoSecretLeak(payload: unknown, apiKey?: string | null): void {
  const text = JSON.stringify(payload);
  if (apiKey && apiKey.length > 8 && text.includes(apiKey)) {
    throw new Error("API key leaked into payload");
  }
  if (/api-key=/i.test(text)) {
    throw new Error("Provider URL with api-key leaked into payload");
  }
  if (/DATA_GOV_IN_API_KEY/i.test(text)) {
    throw new Error("Env var name unexpectedly in payload");
  }
}
