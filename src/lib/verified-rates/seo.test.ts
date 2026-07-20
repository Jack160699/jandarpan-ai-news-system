import { describe, expect, it } from "vitest";
import { listSupportedRateRoutes } from "@/lib/verified-rates/catalog";
import { ratePageMetadata, rateDatasetJsonLd } from "@/lib/verified-rates/seo";

describe("rates SEO helpers", () => {
  it("lists only supported fuel cities and honest bullion routes", () => {
    const paths = listSupportedRateRoutes().map((r) => r.path);
    expect(paths).toContain("/rates/chhattisgarh/raipur/petrol-price-today");
    expect(paths).toContain("/rates/chhattisgarh/bhilai/diesel-price-today");
    expect(paths).toContain("/rates/chhattisgarh/gold-price-today");
    expect(paths).not.toContain("/rates/chhattisgarh/raipur/gold-price-today");
    expect(paths.every((p) => !p.startsWith("/api/") && !p.startsWith("/admin/"))).toBe(true);
  });

  it("builds unique Hindi-first metadata without official/live claims", () => {
    const a = ratePageMetadata({
      category: "petrol",
      citySlug: "raipur",
      path: "/rates/chhattisgarh/raipur/petrol-price-today",
    });
    const b = ratePageMetadata({
      category: "diesel",
      citySlug: "raipur",
      path: "/rates/chhattisgarh/raipur/diesel-price-today",
    });
    expect(String(a.title)).toContain("रायपुर");
    expect(String(a.title)).toContain("पेट्रोल");
    expect(String(a.title)).not.toMatch(/live|official/i);
    expect(String(a.description)).not.toMatch(/live|official/i);
    expect(a.title).not.toEqual(b.title);
    expect(a.description).not.toEqual(b.description);
    expect(a.alternates?.canonical).toContain(
      "/rates/chhattisgarh/raipur/petrol-price-today"
    );
  });

  it("Dataset JSON-LD only when eligible", () => {
    expect(
      rateDatasetJsonLd({
        name: "x",
        description: "y",
        path: "/rates/chhattisgarh/dataset",
        availableFrom: null,
        availableTo: null,
        variable: "price",
        unit: "litre",
        eligible: false,
      })
    ).toBeNull();

    const ld = rateDatasetJsonLd({
      name: "x",
      description: "y",
      path: "/rates/chhattisgarh/dataset",
      availableFrom: "2026-07-01",
      availableTo: "2026-07-20",
      variable: "price",
      unit: "litre",
      eligible: true,
      distributionUrl: "/api/utilities/verified-rates/dataset?category=petrol&city=raipur",
    });
    expect(ld?.["@type"]).toBe("Dataset");
    expect(ld?.temporalCoverage).toBe("2026-07-01/2026-07-20");
  });
});
