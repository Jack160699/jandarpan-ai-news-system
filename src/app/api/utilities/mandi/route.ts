import { NextRequest, NextResponse } from "next/server";
import { getDistrict } from "@/lib/regional/districts";
import {
  assertNoSecretLeak,
  fetchMandiRates,
  toMandiApiJson,
} from "@/features/reader-ds/utilities/providers/data-gov-mandi-provider";
import { MANDI_COMMODITY_PREFS } from "@/features/reader-ds/utilities/commodities";
import { MANDI_REVALIDATE_SEC } from "@/features/reader-ds/utilities/types";

export const runtime = "nodejs";

const MAX_LIMIT = 5;
const DISTRICT_RE = /^[a-z0-9-]{1,64}$/i;
const COMMODITY_IDS = new Set(MANDI_COMMODITY_PREFS.map((p) => p.id));

/**
 * Honest mandi rates — AGMARKNET via data.gov.in (server-side key only).
 * Safe query params: district, commodity, limit.
 */
export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const districtRaw = (sp.get("district") ?? "raipur").trim().toLowerCase();
  if (!DISTRICT_RE.test(districtRaw)) {
    return NextResponse.json(
      {
        status: "unavailable",
        reason: "invalid_schema",
        fetchedAt: new Date().toISOString(),
        source: { name: "AGMARKNET / data.gov.in" },
        rates: [],
      },
      { status: 400 }
    );
  }
  if (!getDistrict(districtRaw)) {
    return NextResponse.json(
      {
        status: "unavailable",
        reason: "invalid_schema",
        fetchedAt: new Date().toISOString(),
        source: { name: "AGMARKNET / data.gov.in" },
        rates: [],
      },
      { status: 400 }
    );
  }

  const commodityRaw = sp.get("commodity")?.trim().toLowerCase();
  let commodityIds: string[] | undefined;
  if (commodityRaw) {
    if (!COMMODITY_IDS.has(commodityRaw)) {
      return NextResponse.json(
        {
          status: "unavailable",
          reason: "invalid_schema",
          fetchedAt: new Date().toISOString(),
          source: { name: "AGMARKNET / data.gov.in" },
          rates: [],
        },
        { status: 400 }
      );
    }
    commodityIds = [commodityRaw];
  }

  let limit = Number(sp.get("limit") ?? "5");
  if (!Number.isFinite(limit)) limit = 5;
  limit = Math.min(Math.max(Math.floor(limit), 1), MAX_LIMIT);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12_000);
  try {
    const result = await fetchMandiRates({
      districtSlug: districtRaw,
      commodityIds,
      limit,
      signal: controller.signal,
    });
    const body = toMandiApiJson(result);
    assertNoSecretLeak(body, process.env.DATA_GOV_IN_API_KEY);
    return NextResponse.json(body, {
      status: 200,
      headers: {
        "Cache-Control": `private, s-maxage=${MANDI_REVALIDATE_SEC}, stale-while-revalidate=600`,
      },
    });
  } finally {
    clearTimeout(timeout);
  }
}
