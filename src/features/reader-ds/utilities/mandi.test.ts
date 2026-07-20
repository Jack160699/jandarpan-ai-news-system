import { describe, expect, it, vi } from "vitest";
import {
  classifyMandiFreshness,
  parseMandiReportedDate,
} from "./freshness";
import {
  dedupeMandiRates,
  normalizeMandiRecord,
  parsePrice,
  selectHomepageRates,
} from "./normalize";
import {
  assertNoSecretLeak,
  fetchMandiRates,
  toMandiApiJson,
} from "./providers/data-gov-mandi-provider";
import type { MandiRate } from "./types";

const NOW = new Date("2026-07-21T06:00:00.000Z");

function rate(partial: Partial<MandiRate> & Pick<MandiRate, "providerCommodity" | "modalPrice" | "reportedAt">): MandiRate {
  return {
    commodity: "धान",
    variety: "Common",
    market: "Raipur",
    district: "Raipur",
    state: "Chhattisgarh",
    minPrice: 2200,
    maxPrice: 2400,
    unit: "₹/क्विंटल",
    unitEn: "₹/quintal",
    fetchedAt: NOW.toISOString(),
    source: "AGMARKNET / data.gov.in",
    freshness: "current",
    ...partial,
  };
}

describe("mandi normalize + freshness", () => {
  it("parses DD/MM/YYYY arrival dates", () => {
    expect(parseMandiReportedDate("20/07/2026")?.toISOString()).toBe("2026-07-20T00:00:00.000Z");
  });

  it("classifies current / recent / stale", () => {
    expect(classifyMandiFreshness("21/07/2026", NOW)).toBe("current");
    expect(classifyMandiFreshness("19/07/2026", NOW)).toBe("recent");
    expect(classifyMandiFreshness("10/07/2026", NOW)).toBe("stale");
  });

  it("parses prices safely and rejects junk", () => {
    expect(parsePrice("2,300")).toBe(2300);
    expect(parsePrice("2300.5")).toBe(2300.5);
    expect(parsePrice("")).toBeNull();
    expect(parsePrice("N/A")).toBeNull();
    expect(parsePrice("12abc")).toBeNull();
  });

  it("normalizes snake_case records and rejects missing modal", () => {
    const ok = normalizeMandiRecord(
      {
        state: "Chhattisgarh",
        district: "Raipur",
        market: "Raipur",
        commodity: "Paddy(Dhan)(Common)",
        variety: "Common",
        arrival_date: "20/07/2026",
        min_price: "2200",
        max_price: "2400",
        modal_price: "2300",
      },
      NOW.toISOString()
    );
    expect(ok?.modalPrice).toBe(2300);
    expect(ok?.commodity).toBe("धान");

    const bad = normalizeMandiRecord(
      {
        state: "Chhattisgarh",
        district: "Raipur",
        market: "Raipur",
        commodity: "Wheat",
        arrival_date: "20/07/2026",
        modal_price: "",
      },
      NOW.toISOString()
    );
    expect(bad).toBeNull();
  });

  it("normalizes PascalCase records", () => {
    const ok = normalizeMandiRecord(
      {
        State: "Chhattisgarh",
        District: "Raipur",
        Market: "Raipur",
        Commodity: "Tomato",
        Variety: "Local",
        Arrival_Date: "21/07/2026",
        "Min Price": "800",
        "Max Price": "1200",
        "Modal Price": "1000",
      },
      NOW.toISOString()
    );
    expect(ok?.modalPrice).toBe(1000);
    expect(ok?.commodity).toBe("टमाटर");
  });

  it("dedupes and selects without averaging markets", () => {
    const rows = dedupeMandiRates([
      rate({ providerCommodity: "Wheat", modalPrice: 2500, reportedAt: "21/07/2026", market: "Raipur" }),
      rate({ providerCommodity: "Wheat", modalPrice: 2500, reportedAt: "21/07/2026", market: "Raipur" }),
      rate({ providerCommodity: "Onion", modalPrice: 1800, reportedAt: "21/07/2026", market: "Durg" }),
    ]);
    expect(rows).toHaveLength(2);
    const selected = selectHomepageRates(
      [
        rate({ providerCommodity: "Wheat", modalPrice: 2500, reportedAt: "21/07/2026", market: "Raipur" }),
        rate({ providerCommodity: "Wheat", modalPrice: 2600, reportedAt: "21/07/2026", market: "Bilaspur" }),
      ],
      5
    );
    expect(selected).toHaveLength(1);
    // One market only — no average; prefer higher modal when same day
    expect(selected[0]!.market).toBe("Bilaspur");
    expect(selected[0]!.modalPrice).toBe(2600);
  });
});

describe("fetchMandiRates provider", () => {
  it("returns missing_api_key when key empty", async () => {
    const result = await fetchMandiRates({ apiKey: "", now: NOW });
    expect(result.status).toBe("unavailable");
    if (result.status === "unavailable") {
      expect(result.reason).toBe("missing_api_key");
    }
  });

  it("handles provider error", async () => {
    const fetchImpl = vi.fn(async () => new Response(JSON.stringify({ error: "nope" }), { status: 403 }));
    const result = await fetchMandiRates({
      apiKey: "test-key-not-real",
      fetchImpl: fetchImpl as unknown as typeof fetch,
      now: NOW,
      revalidateSec: 0,
    });
    expect(result.status).toBe("unavailable");
    if (result.status === "unavailable") {
      expect(result.reason).toBe("provider_error");
    }
  });

  it("parses valid CG records and drops stale", async () => {
    const records = [
      {
        state: "Chhattisgarh",
        district: "Raipur",
        market: "Raipur",
        commodity: "Paddy(Dhan)(Common)",
        variety: "Common",
        arrival_date: "20/07/2026",
        min_price: "2200",
        max_price: "2400",
        modal_price: "2300",
      },
      {
        state: "Chhattisgarh",
        district: "Raipur",
        market: "Raipur",
        commodity: "Wheat",
        variety: "Other",
        arrival_date: "01/01/2020",
        modal_price: "2000",
      },
      {
        state: "Maharashtra",
        district: "Pune",
        market: "Pune",
        commodity: "Onion",
        arrival_date: "21/07/2026",
        modal_price: "1500",
      },
    ];
    const fetchImpl = vi.fn(async () =>
      new Response(JSON.stringify({ records, count: records.length }), { status: 200 })
    );
    const result = await fetchMandiRates({
      apiKey: "test-key-not-real",
      districtSlug: "raipur",
      fetchImpl: fetchImpl as unknown as typeof fetch,
      now: NOW,
      revalidateSec: 0,
    });
    expect(result.status).toBe("available");
    if (result.status === "available") {
      expect(result.rates.every((r) => r.state.includes("Chhattisgarh"))).toBe(true);
      expect(result.rates.some((r) => r.providerCommodity.includes("Paddy"))).toBe(true);
      expect(result.rates.some((r) => r.reportedAt === "01/01/2020")).toBe(false);
      const json = toMandiApiJson(result);
      assertNoSecretLeak(json, "test-key-not-real");
      expect(JSON.stringify(json)).not.toMatch(/api-key=/i);
    }
  });

  it("returns no_current_records when empty", async () => {
    const fetchImpl = vi.fn(async () =>
      new Response(JSON.stringify({ records: [], count: 0 }), { status: 200 })
    );
    const result = await fetchMandiRates({
      apiKey: "test-key-not-real",
      fetchImpl: fetchImpl as unknown as typeof fetch,
      now: NOW,
      revalidateSec: 0,
    });
    expect(result.status).toBe("unavailable");
    if (result.status === "unavailable") {
      expect(["no_current_records", "provider_error", "stale_records"]).toContain(result.reason);
    }
  });
});
