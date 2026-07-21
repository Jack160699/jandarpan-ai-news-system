import { describe, expect, it } from "vitest";
import { evaluateConsensus, requiredIndependentFamilies } from "@/lib/verified-rates/consensus";

describe("evaluateConsensus", () => {
  it("requires 2 fuel families and 3 bullion families", () => {
    expect(requiredIndependentFamilies("petrol")).toBe(2);
    expect(requiredIndependentFamilies("gold_24k")).toBe(3);
  });

  it("does not publish single-source fuel as consensus", () => {
    const r = evaluateConsensus("petrol", [
      {
        sourceId: "fuel_ulip_hpcl",
        sourceFamily: "omc_ulip",
        priceNumeric: "102.40",
        unit: "litre",
        purity: null,
        taxBasis: "retail_rsp_indicative",
        sourceReportedAt: "2026-07-21T06:00:00+05:30",
        sessionLabel: "day",
      },
    ]);
    expect(r.status).toBe("insufficient_sources");
  });

  it("accepts two independent fuel families within ₹0.20", () => {
    const r = evaluateConsensus("petrol", [
      {
        sourceId: "a",
        sourceFamily: "omc_ulip",
        priceNumeric: "102.40",
        unit: "litre",
        purity: null,
        taxBasis: "retail_rsp_indicative",
        sourceReportedAt: null,
        sessionLabel: "day",
      },
      {
        sourceId: "b",
        sourceFamily: "omc_iocl_licensed",
        priceNumeric: "102.55",
        unit: "litre",
        purity: null,
        taxBasis: "retail_rsp_indicative",
        sourceReportedAt: null,
        sessionLabel: "day",
      },
    ]);
    expect(r.status).toBe("accepted");
    if (r.status === "accepted") {
      expect(r.participatingFamilies).toBe(2);
      expect(Number(r.spread)).toBeLessThanOrEqual(0.2);
    }
  });

  it("rejects fuel spread above ₹0.20", () => {
    const r = evaluateConsensus("diesel", [
      {
        sourceId: "a",
        sourceFamily: "omc_ulip",
        priceNumeric: "90.00",
        unit: "litre",
        purity: null,
        taxBasis: "retail_rsp_indicative",
        sourceReportedAt: null,
        sessionLabel: "day",
      },
      {
        sourceId: "b",
        sourceFamily: "omc_bpcl_licensed",
        priceNumeric: "90.50",
        unit: "litre",
        purity: null,
        taxBasis: "retail_rsp_indicative",
        sourceReportedAt: null,
        sessionLabel: "day",
      },
    ]);
    expect(r.status).toBe("conflict");
  });

  it("does not count derived values as independent families", () => {
    const r = evaluateConsensus("gold_22k", [
      {
        sourceId: "ibja",
        sourceFamily: "ibja",
        priceNumeric: "70000",
        unit: "10g",
        purity: "916",
        taxBasis: "ex_gst_benchmark",
        sourceReportedAt: null,
        sessionLabel: "closing",
      },
      {
        sourceId: "derived",
        sourceFamily: "formula_22k",
        priceNumeric: "64000",
        unit: "10g",
        purity: "916",
        taxBasis: "ex_gst_benchmark",
        sourceReportedAt: null,
        sessionLabel: "closing",
        derived: true,
      },
    ]);
    expect(r.status).toBe("insufficient_sources");
  });
});
