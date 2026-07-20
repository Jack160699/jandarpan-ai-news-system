import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/features/reader-ds/utilities/providers/data-gov-mandi-provider", () => ({
  fetchMandiRates: vi.fn(),
  toMandiApiJson: vi.fn((r: unknown) => r),
  assertNoSecretLeak: vi.fn(),
}));

import { GET } from "./route";
import {
  assertNoSecretLeak,
  fetchMandiRates,
  toMandiApiJson,
} from "@/features/reader-ds/utilities/providers/data-gov-mandi-provider";

function req(url: string) {
  return new NextRequest(url);
}

describe("GET /api/utilities/mandi", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("accepts valid district and returns available payload", async () => {
    const available = {
      status: "available" as const,
      location: "रायपुर",
      reportedAt: "20/07/2026",
      fetchedAt: "2026-07-21T00:00:00.000Z",
      freshness: "recent" as const,
      source: "AGMARKNET / data.gov.in" as const,
      rates: [
        {
          commodity: "धान",
          providerCommodity: "Paddy(Dhan)(Common)",
          variety: "Common",
          market: "Raipur",
          district: "Raipur",
          state: "Chhattisgarh",
          minPrice: 2200,
          maxPrice: 2400,
          modalPrice: 2300,
          unit: "₹/क्विंटल",
          unitEn: "₹/quintal",
          reportedAt: "20/07/2026",
          fetchedAt: "2026-07-21T00:00:00.000Z",
          source: "AGMARKNET / data.gov.in" as const,
          freshness: "recent" as const,
        },
      ],
    };
    vi.mocked(fetchMandiRates).mockResolvedValue(available);
    vi.mocked(toMandiApiJson).mockReturnValue({
      status: "available",
      location: "रायपुर",
      reportedAt: "20/07/2026",
      fetchedAt: "2026-07-21T00:00:00.000Z",
      freshness: "recent",
      source: { name: "AGMARKNET / data.gov.in" },
      rates: [
        {
          commodity: "धान",
          providerCommodity: "Paddy(Dhan)(Common)",
          variety: "Common",
          market: "Raipur",
          district: "Raipur",
          state: "Chhattisgarh",
          modalPrice: 2300,
          minPrice: 2200,
          maxPrice: 2400,
          unit: "₹/क्विंटल",
          reportedAt: "20/07/2026",
          freshness: "recent",
        },
      ],
    });

    const res = await GET(req("http://localhost/api/utilities/mandi?district=raipur&limit=3"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe("available");
    expect(body.rates[0].modalPrice).toBe(2300);
    expect(JSON.stringify(body)).not.toMatch(/api-key=/i);
    expect(assertNoSecretLeak).toHaveBeenCalled();
  });

  it("rejects invalid district and commodity", async () => {
    const badDistrict = await GET(
      req("http://localhost/api/utilities/mandi?district=not-a-cg-district")
    );
    expect(badDistrict.status).toBe(400);
    expect(fetchMandiRates).not.toHaveBeenCalled();

    const badCommodity = await GET(
      req("http://localhost/api/utilities/mandi?district=raipur&commodity=bitcoin")
    );
    expect(badCommodity.status).toBe(400);
  });

  it("returns unavailable without raw provider payload", async () => {
    vi.mocked(fetchMandiRates).mockResolvedValue({
      status: "unavailable",
      reason: "missing_api_key",
      rates: [],
      fetchedAt: "2026-07-21T00:00:00.000Z",
      source: "AGMARKNET / data.gov.in",
      location: "रायपुर",
    });
    vi.mocked(toMandiApiJson).mockReturnValue({
      status: "unavailable",
      reason: "missing_api_key",
      location: "रायपुर",
      fetchedAt: "2026-07-21T00:00:00.000Z",
      source: { name: "AGMARKNET / data.gov.in" },
      rates: [],
    });
    const res = await GET(req("http://localhost/api/utilities/mandi?district=raipur"));
    const body = await res.json();
    expect(body.status).toBe("unavailable");
    expect(body.rates).toEqual([]);
    expect(body.records).toBeUndefined();
    expect(JSON.stringify(body)).not.toMatch(/api\.data\.gov\.in/i);
  });
});
