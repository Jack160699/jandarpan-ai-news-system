import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/verified-rates/service", () => ({
  getRateHistory: vi.fn(async () => ({
    status: "blocked",
    category: "petrol",
    location: {
      city: "रायपुर",
      state: "छत्तीसगढ़",
      geoScope: "city",
      honestyLabel: "test",
    },
    currency: "INR",
    unit: "litre",
    purity: null,
    taxBasis: "retail_rsp_indicative",
    range: "30D",
    availableFrom: null,
    availableTo: null,
    current: {
      price: null,
      effectiveDate: null,
      verifiedAt: null,
      sourceCount: null,
      status: "blocked",
    },
    points: [],
    movement: {
      status: "insufficient_history",
      absolute: null,
      percentage: null,
      previousDate: null,
      previousPrice: null,
    },
    statistics: {
      high: null,
      low: null,
      observationCount: 0,
      missingDayCount: 0,
      periodAbsoluteChange: null,
      periodPercentageChange: null,
      latestVerifiedDate: null,
    },
    availableRanges: [],
    graphEligible: false,
    disclaimerHi: "test",
    methodologyPath: "/rates/methodology",
  })),
}));

import { GET } from "./route";

function req(url: string) {
  return new NextRequest(url);
}

describe("GET /api/utilities/verified-rates/history", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects invalid category/city/range", async () => {
    expect(
      (await GET(req("http://localhost/api/utilities/verified-rates/history?category=bitcoin&range=30D")))
        .status
    ).toBe(400);
    expect(
      (
        await GET(
          req(
            "http://localhost/api/utilities/verified-rates/history?category=petrol&city=delhi&range=30D"
          )
        )
      ).status
    ).toBe(400);
    expect(
      (
        await GET(
          req(
            "http://localhost/api/utilities/verified-rates/history?category=petrol&city=raipur&range=99D"
          )
        )
      ).status
    ).toBe(400);
  });

  it("returns controlled blocked payload without secrets", async () => {
    const res = await GET(
      req(
        "http://localhost/api/utilities/verified-rates/history?category=petrol&city=raipur&range=30D"
      )
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    const text = JSON.stringify(body);
    expect(text).not.toMatch(/IBJA_ACCESS_TOKEN|ULIP_API_KEY|undefined|NaN/);
    expect(body.graphEligible).toBe(false);
    expect(body.points).toEqual([]);
  });
});
