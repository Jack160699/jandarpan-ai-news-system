import { describe, expect, it } from "vitest";
import { resolveAuthoritativeDistrict } from "./district-sync";

describe("district sync hooks", () => {
  it("keeps explicit local district authoritative", () => {
    const snap = resolveAuthoritativeDistrict({
      localDistrict: "durg",
      localExplicit: true,
      remoteDistrict: "raipur",
    });
    expect(snap).toEqual({
      districtSlug: "durg",
      source: "local_explicit",
      explicit: true,
    });
  });

  it("adopts remote when local was never explicit", () => {
    const snap = resolveAuthoritativeDistrict({
      localDistrict: "raipur",
      localExplicit: false,
      remoteDistrict: "bilaspur",
    });
    expect(snap.source).toBe("remote");
    expect(snap.districtSlug).toBe("bilaspur");
  });

  it("falls back to local default when remote empty", () => {
    const snap = resolveAuthoritativeDistrict({
      localDistrict: "korba",
      localExplicit: false,
      remoteDistrict: null,
    });
    expect(snap.source).toBe("local_default");
    expect(snap.districtSlug).toBe("korba");
  });
});
